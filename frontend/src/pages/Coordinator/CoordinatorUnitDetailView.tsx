import { useEffect, useMemo, useState } from 'react'
//import { api } from "../../services/api";
import { api } from "../../services/api";
import AddSessionForm from './AddSessionForm'
import TimeWheelPicker, {
  type WheelTime,
  wheelTimeTo24h,
  wheelTimeDurationMinutes,
  formatDurationMinutes,
} from '../../components/TimeWheelPicker'

interface Session {
  id: number;
  title: string;
  startTime: string;
  // Real duration, now actually persisted end-to-end — optional so older
  // sessions created before this existed still type-check and fall back
  // to the 1-hour assumption below.
  endTime?: string;
  location: string;
  status: string;
  // Client-side only — the backend Session entity has no "mode" field,
  // so this exists purely to drive the badge/edit UI here. It's inferred
  // from location when a session first loads, and can be changed by the
  // local-only edit below.
  mode?: 'on-campus' | 'online';
  // Client-side only — set when a coordinator marks this occurrence as a
  // holiday (see toggleHoliday below), so unmarking it can restore
  // whatever status it had before.
  previousStatus?: string;
  // Staff ids flagged as unable to teach this date (see
  // handleToggleStaffUnavailable below).
  unavailableStaffIds?: number[];
}

interface Unit {
  id: number;
  code: string;
  name: string;
  semester: string;
}

interface StaffUser {
  id: number;
  fullName: string;
  email: string;
}

interface Invitation {
  id: number;
  unit: { id: number };
  staff: StaffUser;
  status: 'PENDING' | 'RESPONDED';
}

type Props = {
  unit: Unit
  onBack: () => void
}

function inferMode(session: { location: string }): Session['mode'] {
  return session.location === 'Online' ? 'online' : 'on-campus'
}

function modeLabel(mode: Session['mode']) {
  if (mode === 'online') return '🌐 Online'
  return '🏫 On-campus'
}

function statusMeta(status: string): { label: string; icon: string; className: string } {
  const s = status.toUpperCase()
  if (s === 'HOLIDAY') return { label: 'Holiday', icon: '🏖', className: 'holiday' }
  if (s === 'ALLOCATED') return { label: 'Allocated', icon: '✓', className: 'allocated' }
  if (s === 'PENDING') return { label: 'Pending', icon: '⏳', className: 'pending' }
  return { label: status, icon: '•', className: 'pending' }
}

// ── Recurring session grouping ────────────────────────────────────────
// The backend stores each occurrence as its own row (id, title,
// startTime, endTime, location, status) — there's no "recurring series"
// concept server-side. So sessions that share the same day of week,
// time, location (which already encodes campus + room, see
// AddSessionForm's buildLocationString) and class type (title) are
// grouped together here, purely on the client, for display only.
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface SessionGroup {
  key: string
  title: string
  location: string
  mode: Session['mode']
  dayOfWeek: number
  minutesOfDay: number
  timeLabel: string
  // Only set when every session actually has an endTime (real sessions
  // created after the duration fix do; older ones may not) — shown as
  // "9:00 AM – 11:00 AM" instead of just the start time when available.
  endTimeLabel?: string
  sessions: Session[]
}

function groupSessions(sessions: Session[]): SessionGroup[] {
  const map = new Map<string, SessionGroup>()
  for (const s of sessions) {
    const d = new Date(s.startTime)
    const minutesOfDay = d.getHours() * 60 + d.getMinutes()
    const key = [d.getDay(), minutesOfDay, s.location, s.title].join('|')
    let group = map.get(key)
    if (!group) {
      group = {
        key,
        title: s.title,
        location: s.location,
        mode: s.mode ?? inferMode(s),
        dayOfWeek: d.getDay(),
        minutesOfDay,
        timeLabel: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        endTimeLabel: s.endTime
          ? new Date(s.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          : undefined,
        sessions: [],
      }
      map.set(key, group)
    }
    group.sessions.push(s)
  }
  const groups = Array.from(map.values())
  for (const g of groups) {
    g.sessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }
  groups.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.minutesOfDay - b.minutesOfDay)
  return groups
}

// ── Edit Series (local only) ────────────────────────────────────────────
// Lets the coordinator change a whole recurring pattern at once — class
// type, day/time, campus/block/room, and the date range it runs across —
// rather than one field on one row. Mirrors the structured fields used
// when a session is first created in AddSessionForm.tsx (duplicated
// locally here since those helpers aren't exported from that file).
// Saving regenerates the group's occurrence dates from scratch: dates
// that still fall in the new range/day keep their existing id and status
// (so an ALLOCATED or HOLIDAY date isn't silently reset), brand-new dates
// are added as PENDING, and dropped dates are removed. Local only, same
// as the rest of this file — there's no backend endpoint to persist any
// of this, so it resets on refresh.
type ClassType = 'Consultation' | 'Workshop' | 'Practical' | 'Tutorial' | 'Lecture'
type Campus = 'Gardens Point' | 'Kelvin Grove'
type LocationType = 'on-campus' | 'online'

const CLASS_TYPES: ClassType[] = ['Consultation', 'Workshop', 'Practical', 'Tutorial', 'Lecture']
const EDIT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const EDIT_WEEKDAY_INDEX: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 }

function parseLocalDateStr(yyyyMmDd: string): Date | null {
  if (!yyyyMmDd) return null
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dateToWheelTime(date: Date): WheelTime {
  let hour = date.getHours() % 12
  if (hour === 0) hour = 12
  const period: 'AM' | 'PM' = date.getHours() >= 12 ? 'PM' : 'AM'
  return { hour: String(hour), minute: String(date.getMinutes()).padStart(2, '0'), period }
}

function formatEditDateTime(date: Date, wheelTime: WheelTime): string {
  const { hour24, minute } = wheelTimeTo24h(wheelTime)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(hour24).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return `${y}-${m}-${d}T${hh}:${mm}:00`
}

// Every real calendar date between start/end (inclusive) that falls on
// the given weekday — same approach as AddSessionForm's generator, minus
// the odd/even week pattern (edits always regenerate every week, kept
// simple since the pattern isn't tracked on the group itself).
function generateWeeklyDates(startDate: Date, endDate: Date, weekdayIndex: number): Date[] {
  const dates: Date[] = []
  const cursor = new Date(startDate)
  while (cursor.getDay() !== weekdayIndex && cursor <= endDate) {
    cursor.setDate(cursor.getDate() + 1)
  }
  while (cursor <= endDate) {
    dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }
  return dates
}

function parseLocationString(location: string): { locationType: LocationType; campus: Campus; block: string; room: string } {
  if (!location || location === 'Online') {
    return { locationType: 'online', campus: 'Gardens Point', block: '', room: '' }
  }
  const sepIndex = location.indexOf(' - ')
  if (sepIndex === -1) {
    const campus: Campus = location === 'Kelvin Grove' ? 'Kelvin Grove' : 'Gardens Point'
    return { locationType: 'on-campus', campus, block: '', room: '' }
  }
  const campus: Campus = location.slice(0, sepIndex) === 'Kelvin Grove' ? 'Kelvin Grove' : 'Gardens Point'
  const detail = location.slice(sepIndex + 3)
  let block = ''
  let room = ''
  for (const part of detail.split(',').map(p => p.trim())) {
    if (part.startsWith('Block ')) block = part.slice('Block '.length)
    else if (part.startsWith('Room ')) room = part.slice('Room '.length)
  }
  return { locationType: 'on-campus', campus, block, room }
}

function buildLocationStringFrom(locationType: LocationType, campus: Campus, block: string, room: string): string {
  if (locationType === 'online') return 'Online'
  const blockPart = block ? `Block ${block}` : ''
  const roomPart = room ? `Room ${room}` : ''
  const detail = [blockPart, roomPart].filter(Boolean).join(', ')
  return detail ? `${campus} - ${detail}` : campus
}

// ── Availability submission countdown ──────────────────────────────────
// Also client-side only — there's no deadline field on the backend's
// invitation model yet, so the deadline the coordinator sets here is
// stored per-unit in localStorage and only affects what's shown on this
// screen. A real deadline would need a backend field on the invitation
// (or unit) so tutors' own submission screens could enforce/show it too.
function deadlineStorageKey(unitId: number) {
  return `sessioneer:availDeadline:unit:${unitId}`
}

function loadDeadline(unitId: number): string {
  try {
    return localStorage.getItem(deadlineStorageKey(unitId)) ?? ''
  } catch {
    return ''
  }
}

function formatCountdown(deadlineIso: string, now: number): { label: string; state: 'normal' | 'urgent' | 'expired' } {
  const target = new Date(deadlineIso).getTime()
  const diffMs = target - now
  if (Number.isNaN(target)) return { label: '', state: 'normal' }
  if (diffMs <= 0) return { label: 'Deadline passed', state: 'expired' }

  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  let label: string
  if (days > 0) label = `${days}d ${hours}h left`
  else if (hours > 0) label = `${hours}h ${minutes}m left`
  else if (minutes > 0) label = `${minutes}m ${seconds}s left`
  else label = `${seconds}s left`

  const state: 'normal' | 'urgent' = diffMs < 24 * 60 * 60 * 1000 ? 'urgent' : 'normal'
  return { label, state }
}

export default function UnitDetailView({ unit, onBack }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [staffList, setStaffList] = useState<StaffUser[]>([])
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  // Local-only busy/error state for the "simulate accept/decline" testing
  // controls below — see the note above them for why they exist.
  const [simulatingId, setSimulatingId] = useState<number | null>(null)
  const [simulateError, setSimulateError] = useState('')

  // ── Invite Tutors: searchable multi-select, Invite All / Invite Selected ──
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [selectedInviteIds, setSelectedInviteIds] = useState<Set<number>>(new Set())
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')

  // ── Edit Series (local only — see note above helpers) ──────────────────
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null)
  const [editClassType, setEditClassType] = useState<ClassType>('Tutorial')
  const [editDayOfWeek, setEditDayOfWeek] = useState('Monday')
  const [editStartTime, setEditStartTime] = useState<WheelTime>({ hour: '9', minute: '00', period: 'AM' })
  const [editEndTime, setEditEndTime] = useState<WheelTime>({ hour: '10', minute: '00', period: 'AM' })
  const [editLocationType, setEditLocationType] = useState<LocationType>('on-campus')
  const [editCampus, setEditCampus] = useState<Campus>('Gardens Point')
  const [editBlock, setEditBlock] = useState('')
  const [editRoom, setEditRoom] = useState('')
  const [editSeriesStartDate, setEditSeriesStartDate] = useState('')
  const [editSeriesEndDate, setEditSeriesEndDate] = useState('')
  const [editSeriesError, setEditSeriesError] = useState('')

  // ── Group recurring sessions into a single expandable card ────────────
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const sessionGroups = useMemo(() => groupSessions(sessions), [sessions])

  // ── Availability submission countdown (local only, see note above) ────
  const [deadline, setDeadline] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [showDeadlineModal, setShowDeadlineModal] = useState(false)
  const [deadlineDraft, setDeadlineDraft] = useState('')

  const loadSessions = async () => {
    const data: any[] = await api.getSessions(unit.id)
    setSessions(data.map(s => ({ ...s, mode: inferMode(s) })))
  }

  useEffect(() => {
    loadSessions().catch(console.error)
    api.getAllStaff().then(setStaffList).catch(console.error)
    api.getUnitInvitations(unit.id).then(setInvitations).catch(console.error)
    setDeadline(loadDeadline(unit.id))
    setExpandedGroups(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.id])

  // Ticks once a second so the countdown badge stays live while this
  // screen is open. Cheap no-op if there's no deadline set.
  useEffect(() => {
    if (!deadline) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [deadline])

  const handleRemoveStaff = async (id: number) => {
    try {
      await api.removeInvitation(unit.id, id)
      setInvitations(prev => prev.filter(inv => inv.staff.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  // ── Simulate tutor accept/decline (testing only) ───────────────────────
  // There's no tutor-facing flow wired into this mock, so these buttons
  // let you flip an invitation's status by hand from the coordinator
  // side, to see how the Invited Tutors list and the Allocation screen
  // behave once a tutor has actually responded (or bowed out). Nothing
  // here reflects a real tutor action — it's a stand-in for testing.
  const handleSimulateAccept = async (staffId: number) => {
    setSimulateError('')
    setSimulatingId(staffId)
    try {
      await api.respondToInvitation(unit.id, staffId)
      setInvitations(prev => prev.map(inv =>
        inv.staff.id === staffId ? { ...inv, status: 'RESPONDED' } : inv
      ))
    } catch (err: any) {
      console.error(err)
      setSimulateError(err?.message || 'Could not simulate that response.')
    } finally {
      setSimulatingId(null)
    }
  }

  const handleSimulateDecline = async (staffId: number) => {
    setSimulateError('')
    setSimulatingId(staffId)
    try {
      await api.declineInvitation(unit.id, staffId)
      setInvitations(prev => prev.filter(inv => inv.staff.id !== staffId))
    } catch (err: any) {
      console.error(err)
      setSimulateError(err?.message || 'Could not simulate that decline.')
    } finally {
      setSimulatingId(null)
    }
  }

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const openDeadlineModal = () => {
    setDeadlineDraft(deadline)
    setShowDeadlineModal(true)
  }

  const handleSaveDeadline = () => {
    if (!deadlineDraft) return
    try {
      localStorage.setItem(deadlineStorageKey(unit.id), deadlineDraft)
    } catch (err) {
      console.error(err)
    }
    setDeadline(deadlineDraft)
    setNow(Date.now())
    setShowDeadlineModal(false)
  }

  const handleClearDeadline = () => {
    try {
      localStorage.removeItem(deadlineStorageKey(unit.id))
    } catch (err) {
      console.error(err)
    }
    setDeadline('')
    setShowDeadlineModal(false)
  }

  const countdown = deadline ? formatCountdown(deadline, now) : null

  const invitedStaffIds = new Set(invitations.map(inv => inv.staff.id))
  const uninvited = staffList.filter(s => !invitedStaffIds.has(s.id))

  const filteredUninvited = uninvited.filter(s => {
    const q = inviteSearch.trim().toLowerCase()
    if (!q) return true
    return s.fullName?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
  })

  const openInviteForm = () => {
    setShowInviteForm(true)
    setInviteSearch('')
    setSelectedInviteIds(new Set())
    setInviteMessage('')
  }

  const toggleInviteSelection = (id: number) => {
    setSelectedInviteIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Shared by both "Invite Selected" and "Invite All" — invites each id
  // one at a time against the existing single-invite endpoint, since
  // there's no bulk-invite endpoint on the backend.
  const inviteMany = async (ids: number[]) => {
    if (ids.length === 0) return
    setInviting(true)
    setInviteMessage('')
    let successCount = 0
    for (const id of ids) {
      try {
        await api.inviteStaff(unit.id, id)
        successCount++
      } catch (err) {
        console.error(err)
      }
    }
    const refreshedInvitations = await api.getUnitInvitations(unit.id).catch(() => [])
    setInvitations(refreshedInvitations)
    setSelectedInviteIds(new Set())
    setInviting(false)
    if (successCount < ids.length) {
      setInviteMessage(`Invited ${successCount} of ${ids.length} — some may have already been invited or failed.`)
    } else {
      setShowInviteForm(false)
      setInviteSearch('')
    }
  }

  const handleInviteSelected = () => inviteMany([...selectedInviteIds])

  const handleInviteAll = () => {
    if (uninvited.length === 0) return
    const ok = window.confirm(`Invite all ${uninvited.length} tutor(s) not yet on this unit?`)
    if (!ok) return
    inviteMany(uninvited.map(s => s.id))
  }

  // ── Session editing (local only) ──────────────────────────────────────
  const openEditGroup = (group: SessionGroup) => {
    setEditSeriesError('')
    setEditingGroupKey(group.key)

    setEditClassType((CLASS_TYPES as string[]).includes(group.title) ? (group.title as ClassType) : 'Tutorial')

    const dayName = DAY_NAMES[group.dayOfWeek]
    setEditDayOfWeek(EDIT_DAYS.includes(dayName) ? dayName : 'Monday')

    const firstDate = new Date(group.sessions[0].startTime)
    const lastDate = new Date(group.sessions[group.sessions.length - 1].startTime)
    setEditStartTime(dateToWheelTime(firstDate))
    // Use the real end time when this series has one (see the note on
    // Session.endTime up top) instead of always assuming 1 hour.
    const firstEndTime = group.sessions[0].endTime
      ? new Date(group.sessions[0].endTime)
      : new Date(firstDate.getTime() + 60 * 60 * 1000)
    setEditEndTime(dateToWheelTime(firstEndTime))

    const parsedLocation = parseLocationString(group.location)
    setEditLocationType(parsedLocation.locationType)
    setEditCampus(parsedLocation.campus)
    setEditBlock(parsedLocation.block)
    setEditRoom(parsedLocation.room)

    setEditSeriesStartDate(toDateInputValue(firstDate))
    setEditSeriesEndDate(toDateInputValue(lastDate))
  }

  // Marks (or unmarks) a single dated occurrence as a holiday — e.g. a
  // public holiday or teaching-free day that falls on what would
  // otherwise be a regular recurring slot. Only ever applies to that one date, not the
  // whole recurring group.
  const toggleHoliday = async (session: Session) => {
    const newStatus = session.status === 'HOLIDAY'
      ? (session.previousStatus ?? 'PENDING')
      : 'HOLIDAY'
    try {
      await api.updateSessionStatus(session.id, newStatus)
      setSessions(prev => prev.map(s => {
        if (s.id !== session.id) return s
        if (s.status === 'HOLIDAY') {
          return { ...s, status: s.previousStatus ?? 'PENDING', previousStatus: undefined }
        }
        return { ...s, previousStatus: s.status, status: 'HOLIDAY' }
      }))
    } catch (err) {
      console.error(err)
    }
  }

  // Flags (or unflags) a specific invited tutor as unable to teach one
  // dated session. This is a testing SIMULATION, not a live signal — the
  // Tutor side's own "Mark I'm Unavailable" runs on a separate mock with
  // no shared store, so nothing a tutor does there reaches here on its
  // own. This just gives the coordinator a real place to see and try out
  // what that information would look like once there's a backend to
  // actually wire the two together.
  const handleToggleStaffUnavailable = async (session: Session, staffId: number, unavailable: boolean) => {
    try {
      await api.markStaffUnavailableForSession(session.id, staffId, unavailable)
      setSessions(prev => prev.map(s => {
        if (s.id !== session.id) return s
        const current = new Set(s.unavailableStaffIds ?? [])
        if (unavailable) current.add(staffId)
        else current.delete(staffId)
        return { ...s, unavailableStaffIds: Array.from(current) }
      }))
    } catch (err) {
      console.error(err)
    }
  }

  // Deletes a single dated occurrence, or every occurrence in a recurring
  // group at once. Local only — same as edit/holiday above, there's no
  // backend endpoint to delete a session yet (only create/read exist), so
  // this just removes it from what's shown here; it comes back on refresh
  // since it's never actually removed server-side.
  const handleDeleteSession = async (session: Session) => {
    const ok = window.confirm(
      `Delete the ${session.title} session on ${new Date(session.startTime).toLocaleDateString()}? This can't be undone.`
    )
    if (!ok) return
    try {
      await api.deleteSession(session.id)
      setSessions(prev => prev.filter(s => s.id !== session.id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteGroup = async (group: SessionGroup) => {
    const ok = window.confirm(
      `Delete all ${group.sessions.length} sessions in this recurring "${group.title}" pattern? This can't be undone.`
    )
    if (!ok) return
    try {
      for (const s of group.sessions) {
        await api.deleteSession(s.id)
      }
      const idsToDelete = new Set(group.sessions.map(s => s.id))
      setSessions(prev => prev.filter(s => !idsToDelete.has(s.id)))
      setExpandedGroups(prev => {
        const next = new Set(prev)
        next.delete(group.key)
        return next
      })
    } catch (err) {
      console.error(err)
    }
  }

  const editingGroup = sessionGroups.find(g => g.key === editingGroupKey) ?? null

  const handleSaveGroupEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingGroup) return
    setEditSeriesError('')

    const start = parseLocalDateStr(editSeriesStartDate)
    const end = parseLocalDateStr(editSeriesEndDate)
    if (!start || !end || end < start) {
      setEditSeriesError('End date must be on or after the start date.')
      return
    }

    const occurrenceDates = generateWeeklyDates(start, end, EDIT_WEEKDAY_INDEX[editDayOfWeek])
    if (occurrenceDates.length === 0) {
      setEditSeriesError(`No ${editDayOfWeek}s fall between those dates.`)
      return
    }

    const newLocation = buildLocationStringFrom(editLocationType, editCampus, editBlock, editRoom)
    const oldIds = new Set(editingGroup.sessions.map(s => s.id))
    const oldByDateKey = new Map<string, Session>(
      editingGroup.sessions.map(s => [new Date(s.startTime).toDateString(), s])
    )

    try {
      const newSessions: Session[] = []
      for (let i = 0; i < occurrenceDates.length; i++) {
        const date = occurrenceDates[i]
        const existing = oldByDateKey.get(date.toDateString())
        const startTime = formatEditDateTime(date, editStartTime)
        const endTime = formatEditDateTime(date, editEndTime)

        if (existing && existing.id > 0) {
          const updated = await api.updateSession(existing.id, {
            title: editClassType,
            startTime,
            endTime,
            location: newLocation,
          })
          newSessions.push({ ...updated, mode: editLocationType === 'online' ? 'online' : 'on-campus' })
        } else {
          const created = await api.createSession(unit.id, {
            title: editClassType,
            startTime,
            endTime,
            location: newLocation,
          })
          newSessions.push({ ...created, mode: editLocationType === 'online' ? 'online' : 'on-campus' })
        }
      }

      // Delete sessions that fell out of range
      for (const s of editingGroup.sessions) {
        if (s.id > 0 && !occurrenceDates.some(d => d.toDateString() === new Date(s.startTime).toDateString())) {
          await api.deleteSession(s.id)
        }
      }

      setSessions(prev => [...prev.filter(s => !oldIds.has(s.id)), ...newSessions])
      setEditingGroupKey(null)
    } catch (err) {
      console.error(err)
      setEditSeriesError('Failed to save changes. Please try again.')
    }
  }


  // Add Session takes over the full main-content area (same as this
  // detail view does relative to the units list), rather than opening
  // as an overlay modal — so it opens full width beside the sidebar
  // just like this Manage page does.
  if (showSessionForm) {
    return (
      <AddSessionForm
        unitId={unit.id}
        unitLabel={`${unit.code} — ${unit.name}`}
        onClose={() => setShowSessionForm(false)}
        onSessionsCreated={loadSessions}
      />
    )
  }

  return (
    <div className="unit-detail">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← Back to My Units</button>
        <div className="detail-title">
          <span className="detail-code">{unit.code}</span>
          <div>
            <h1>{unit.name}</h1>
            <p>{unit.semester}</p>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="detail-section">
        <div className="section-header">
          <div>
            <h2>Sessions</h2>
            <p>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} defined
              {sessionGroups.length !== sessions.length &&
                ` across ${sessionGroups.length} recurring pattern${sessionGroups.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button className="add-btn" onClick={() => setShowSessionForm(true)}>+ Add Session</button>
        </div>

        {sessions.length > 0 && (
          <p className="avail-range-hint" style={{ marginBottom: '12px' }}>
            Editing, deleting or marking a session as a holiday updates it here only — there's no
            backend endpoint yet to save these permanently, so changes reset on refresh. Sessions
            that repeat on the same day, time, location and class type are grouped into one card —
            click a card to see, edit, delete or mark individual dates as a holiday, or delete the
            whole series at once.
          </p>
        )}

        {sessions.length === 0 && (
          <div className="empty-info">No sessions yet. Add sessions so tutors know what to indicate availability for.</div>
        )}

        <div className="sessions-grid">
          {sessionGroups.map(group => {
            const isMulti = group.sessions.length > 1
            const isExpanded = isMulti && expandedGroups.has(group.key)
            const single = group.sessions[0]
            return (
              <div key={group.key} className={`session-card session-group-card ${isExpanded ? 'expanded' : ''}`}>
                <div
                  className={`session-card-main ${isMulti ? 'clickable' : ''}`}
                  role={isMulti ? 'button' : undefined}
                  tabIndex={isMulti ? 0 : undefined}
                  onClick={() => isMulti && toggleGroup(group.key)}
                  onKeyDown={e => {
                    if (isMulti && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      toggleGroup(group.key)
                    }
                  }}
                >
                  <div className="session-card-top">
                    <span className={`mode-badge ${group.mode}`}>{modeLabel(group.mode)}</span>
                    {isMulti ? (
                      <span className="session-group-count">
                        {group.sessions.length} sessions
                        {group.sessions.some(s => s.status === 'HOLIDAY') && (
                          <span className="session-group-holiday-hint">
                            🏖 {group.sessions.filter(s => s.status === 'HOLIDAY').length}
                          </span>
                        )}
                        <span className={`session-group-chevron ${isExpanded ? 'open' : ''}`}>▾</span>
                      </span>
                    ) : (
                      <div className="session-card-top-actions">
                        <button
                          type="button"
                          className={`session-holiday-btn ${single.status === 'HOLIDAY' ? 'active' : ''}`}
                          onClick={e => { e.stopPropagation(); toggleHoliday(single) }}
                        >
                          {single.status === 'HOLIDAY' ? 'Unmark Holiday' : '🏖 Holiday'}
                        </button>
                        <button
                          type="button"
                          className="session-edit-btn"
                          onClick={e => { e.stopPropagation(); openEditGroup(group) }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="session-delete-btn"
                          onClick={e => { e.stopPropagation(); handleDeleteSession(single) }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="session-day">{group.title}</div>
                  <div className="session-time">
                    {DAY_NAMES[group.dayOfWeek]}s, {group.timeLabel}
                    {group.endTimeLabel && ` – ${group.endTimeLabel}`}
                  </div>
                  {group.location && <div className="session-location">{group.location}</div>}
                  {isMulti ? (
                    <div className="session-time session-group-range">
                      {new Date(group.sessions[0].startTime).toLocaleDateString()} –{' '}
                      {new Date(group.sessions[group.sessions.length - 1].startTime).toLocaleDateString()}
                    </div>
                  ) : (
                    <div className="session-card-status-row">
                      {(() => {
                        const meta = statusMeta(single.status)
                        return (
                          <span className={`status-badge ${meta.className}`}>
                            {meta.icon} {meta.label}
                          </span>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="session-group-body">
                    <div className="session-group-body-header">
                      <span className="session-group-body-label">
                        {group.sessions.length} dated sessions in this series
                      </span>
                      <div className="session-group-body-header-actions">
                        <button
                          type="button"
                          className="session-edit-series-btn"
                          onClick={() => openEditGroup(group)}
                        >
                          ✏️ Edit Series
                        </button>
                        <button
                          type="button"
                          className="session-delete-all-btn"
                          onClick={() => handleDeleteGroup(group)}
                        >
                          🗑 Delete All
                        </button>
                      </div>
                    </div>
                    {group.sessions.map(s => {
                      const meta = statusMeta(s.status)
                      const flaggedStaff = (s.unavailableStaffIds ?? [])
                        .map(id => invitations.find(inv => inv.staff.id === id)?.staff)
                        .filter((staff): staff is StaffUser => Boolean(staff))
                      return (
                        <div key={s.id} className="session-occurrence-row">
                          <span className={`session-occurrence-date ${s.status === 'HOLIDAY' ? 'holiday' : ''}`}>
                            {new Date(s.startTime).toLocaleDateString(undefined, {
                              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </span>
                          <span className={`status-badge ${meta.className} session-occurrence-status`}>
                            {meta.icon} {meta.label}
                          </span>
                          <button
                            type="button"
                            className={`session-holiday-btn ${s.status === 'HOLIDAY' ? 'active' : ''}`}
                            onClick={() => toggleHoliday(s)}
                          >
                            {s.status === 'HOLIDAY' ? 'Unmark Holiday' : '🏖 Mark Holiday'}
                          </button>
                          <button
                            type="button"
                            className="session-delete-btn"
                            onClick={() => handleDeleteSession(s)}
                          >
                            Delete
                          </button>

                          {flaggedStaff.length > 0 && (
                            <div className="session-occurrence-unavailable-list">
                              {flaggedStaff.map(staff => (
                                <span key={staff.id} className="status-badge unavailable">
                                  🚫 {staff.fullName} can't teach this date
                                  <button
                                    type="button"
                                    className="session-occurrence-unflag-btn"
                                    onClick={() => handleToggleStaffUnavailable(s, staff.id, false)}
                                    aria-label={`Remove unavailable flag for ${staff.fullName}`}
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          {invitations.length > flaggedStaff.length && (
                            <select
                              className="session-occurrence-flag-select"
                              value=""
                              onChange={e => {
                                const staffId = Number(e.target.value)
                                if (staffId) handleToggleStaffUnavailable(s, staffId, true)
                              }}
                            >
                              <option value="">🚫 Simulate: flag tutor unavailable…</option>
                              {invitations
                                .filter(inv => !(s.unavailableStaffIds ?? []).includes(inv.staff.id))
                                .map(inv => (
                                  <option key={inv.staff.id} value={inv.staff.id}>{inv.staff.fullName}</option>
                                ))}
                            </select>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Edit Series Modal (local only — see note above the helpers up top) */}
      {editingGroup && (
        <div className="modal-overlay" onClick={() => setEditingGroupKey(null)}>
          <div className="modal edit-series-modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Series</h2>
            <p className="avail-range-hint" style={{ marginBottom: '12px' }}>
              This updates every session in this recurring pattern here only — there's no backend
              endpoint yet to save it permanently, so it resets if you refresh. Dates that stay in
              range keep their current allocation/holiday status; new dates start Pending.
            </p>

            <form onSubmit={handleSaveGroupEdit} className="detail-form">
              {/* Time & class type */}
              <div className="form-subsection">
                <div className="form-subsection-title">Time &amp; Type</div>
                <div className="time-wheel-row">
                  <TimeWheelPicker label="Start Time" value={editStartTime} onChange={setEditStartTime} />
                  <TimeWheelPicker label="End Time" value={editEndTime} onChange={setEditEndTime} />
                  <div className="form-field duration-display">
                    <label>Duration</label>
                    <input
                      type="text"
                      value={formatDurationMinutes(wheelTimeDurationMinutes(editStartTime, editEndTime))}
                      readOnly
                      disabled
                    />
                  </div>
                </div>
                <div className="form-row-2" style={{ marginTop: 14 }}>
                  <div className="form-field">
                    <label>Class Type</label>
                    <select value={editClassType} onChange={e => setEditClassType(e.target.value as ClassType)}>
                      {CLASS_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Day of Week</label>
                    <select value={editDayOfWeek} onChange={e => setEditDayOfWeek(e.target.value)}>
                      {EDIT_DAYS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="form-subsection">
                <div className="form-subsection-title">Location</div>
                <div className="form-field">
                  <label>Mode</label>
                  <select
                    value={editLocationType}
                    onChange={e => setEditLocationType(e.target.value as LocationType)}
                  >
                    <option value="on-campus">🏫 On Campus</option>
                    <option value="online">🌐 Online</option>
                  </select>
                </div>

                {editLocationType === 'on-campus' && (
                  <>
                    <div className="form-field" style={{ marginTop: 14 }}>
                      <label>Campus</label>
                      <div className="segmented-row">
                        <button
                          type="button"
                          className={`segmented-btn ${editCampus === 'Gardens Point' ? 'selected' : ''}`}
                          onClick={() => setEditCampus('Gardens Point')}
                        >
                          Gardens Point
                        </button>
                        <button
                          type="button"
                          className={`segmented-btn ${editCampus === 'Kelvin Grove' ? 'selected' : ''}`}
                          onClick={() => setEditCampus('Kelvin Grove')}
                        >
                          Kelvin Grove
                        </button>
                      </div>
                    </div>
                    <div className="form-row-2" style={{ marginTop: 14 }}>
                      <div className="form-field">
                        <label>Block</label>
                        <input
                          type="text"
                          placeholder="e.g. P"
                          value={editBlock}
                          onChange={e => setEditBlock(e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>Room</label>
                        <input
                          type="text"
                          placeholder="e.g. P404"
                          value={editRoom}
                          onChange={e => setEditRoom(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Date range */}
              <div className="form-subsection">
                <div className="form-subsection-title">Runs From</div>
                <div className="form-row-2">
                  <div className="form-field">
                    <label>Starting Date</label>
                    <input
                      type="date"
                      value={editSeriesStartDate}
                      onChange={e => setEditSeriesStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Ending Date</label>
                    <input
                      type="date"
                      value={editSeriesEndDate}
                      onChange={e => setEditSeriesEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <p className="avail-range-hint schedule-occurrence-hint">
                  Every {editDayOfWeek} from {editSeriesStartDate || '…'} to {editSeriesEndDate || '…'}
                  {(() => {
                    const start = parseLocalDateStr(editSeriesStartDate)
                    const end = parseLocalDateStr(editSeriesEndDate)
                    if (!start || !end || end < start) return ''
                    const count = generateWeeklyDates(start, end, EDIT_WEEKDAY_INDEX[editDayOfWeek]).length
                    return ` — ${count} session${count !== 1 ? 's' : ''}`
                  })()}
                </p>
              </div>

              {editSeriesError && <p className="avail-error-message">{editSeriesError}</p>}

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setEditingGroupKey(null)}>Cancel</button>
                <button type="submit" className="confirm-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tutors */}
      <div className="detail-section">
        <div className="section-header">
          <div>
            <h2>Invited Tutors</h2>
            <p>
              {invitations.length} invited
              {invitations.length > 0 &&
                ` · ${invitations.filter(i => i.status === 'RESPONDED').length} responded`}
            </p>
            {countdown ? (
              <div className={`countdown-badge ${countdown.state}`}>
                <span>⏳ {countdown.label}</span>
                <span className="countdown-deadline-date">
                  Due {new Date(deadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            ) : (
              <p className="countdown-none-hint">No availability submission deadline set yet.</p>
            )}
          </div>
          <div className="section-header-actions">
            <button type="button" className="cancel-btn" onClick={openDeadlineModal}>
              {deadline ? '⏱ Edit Deadline' : '⏱ Set Deadline'}
            </button>
            {uninvited.length > 0 && (
              <button className="add-btn" onClick={openInviteForm}>+ Invite Tutors</button>
            )}
          </div>
        </div>

        {invitations.length === 0 && (
          <div className="empty-info">No tutors invited yet. Invite tutors to collect their availability.</div>
        )}

        {invitations.length > 0 && (
          <p className="avail-range-hint" style={{ marginBottom: '12px' }}>
            There's no real tutor-facing flow wired up in this test build yet, so invitations stay
            "Pending" until you simulate a response below — that's a stand-in for a tutor actually
            accepting/declining and submitting availability, purely so you can see how this list
            and the Allocation screen react once someone has responded.
          </p>
        )}

        {simulateError && <p className="avail-error-message" style={{ marginBottom: '12px' }}>{simulateError}</p>}

        <div className="tutors-list">
          {invitations.map(inv => {
            const staff = inv.staff
            const name = staff.fullName || staff.email
            const initials = staff.fullName
              ? staff.fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase()
              : staff.email[0].toUpperCase()
            const isResponded = inv.status === 'RESPONDED'
            const isBusy = simulatingId === staff.id
            return (
              <div key={staff.id} className="tutor-row">
                <div className="tutor-avatar">{initials}</div>
                <div className="tutor-info">
                  <span className="tutor-name">{name}</span>
                  <span className="tutor-email">{staff.email}</span>
                </div>
                <span className={`status-badge ${isResponded ? 'responded' : 'pending'}`}>
                  {isResponded ? '✓ Responded' : '⏳ Pending'}
                </span>
                {!isResponded && (
                  <button
                    type="button"
                    className="simulate-accept-btn"
                    disabled={isBusy}
                    onClick={() => handleSimulateAccept(staff.id)}
                    title="Testing only — simulates this tutor submitting availability"
                  >
                    {isBusy ? '...' : '✅ Simulate Accept'}
                  </button>
                )}
                <button
                  type="button"
                  className="simulate-decline-btn"
                  disabled={isBusy}
                  onClick={() => handleSimulateDecline(staff.id)}
                  title="Testing only — simulates this tutor declining the invitation"
                >
                  {isBusy ? '...' : '❌ Simulate Decline'}
                </button>
                <button className="remove-tutor-btn" onClick={() => handleRemoveStaff(staff.id)}>Remove</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Availability Deadline Modal (local only, see note near loadDeadline) */}
      {showDeadlineModal && (
        <div className="modal-overlay" onClick={() => setShowDeadlineModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Availability Submission Deadline</h2>
            <p className="modal-sub">
              Set a cutoff for tutors to submit their availability for this unit. Once set,
              a live countdown shows here so you know how much time is left.
            </p>
            <div className="form-field">
              <label>Deadline</label>
              <input
                type="datetime-local"
                value={deadlineDraft}
                onChange={e => setDeadlineDraft(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              {deadline && (
                <button type="button" className="cancel-btn" onClick={handleClearDeadline}>
                  Remove Deadline
                </button>
              )}
              <button type="button" className="cancel-btn" onClick={() => setShowDeadlineModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="confirm-btn"
                disabled={!deadlineDraft}
                onClick={handleSaveDeadline}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Tutors Modal — searchable multi-select */}
      {showInviteForm && (
        <div className="modal-overlay" onClick={() => !inviting && setShowInviteForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Invite Tutors</h2>
            <p className="modal-sub">Search and select tutors to invite, or invite everyone not yet on this unit.</p>

            <div className="chat-search-box" style={{ marginBottom: '14px' }}>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={inviteSearch}
                onChange={e => setInviteSearch(e.target.value)}
              />
            </div>

            <div className="chat-member-checklist">
              {filteredUninvited.length === 0 && (
                <div className="chat-empty-hint">
                  {uninvited.length === 0 ? 'Everyone is already invited.' : 'No tutors match your search.'}
                </div>
              )}
              {filteredUninvited.map(s => {
                const checked = selectedInviteIds.has(s.id)
                return (
                  <label key={s.id} className={`chat-member-row ${checked ? 'checked' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleInviteSelection(s.id)} />
                    <div className="tutor-avatar chat-avatar-sm">{(s.fullName || s.email)[0].toUpperCase()}</div>
                    <div className="chat-list-item-info">
                      <span className="chat-list-item-name">{s.fullName}</span>
                      <span className="chat-list-item-sub">{s.email}</span>
                    </div>
                  </label>
                )
              })}
            </div>

            {inviteMessage && <p className="avail-error-message">{inviteMessage}</p>}

            <div className="modal-actions">
              <button type="button" className="cancel-btn" disabled={inviting} onClick={() => setShowInviteForm(false)}>
                Cancel
              </button>
              <button type="button" className="cancel-btn" disabled={inviting || uninvited.length === 0} onClick={handleInviteAll}>
                Invite All ({uninvited.length})
              </button>
              <button type="button" className="confirm-btn" disabled={inviting || selectedInviteIds.size === 0} onClick={handleInviteSelected}>
                {inviting ? 'Inviting...' : `Invite Selected (${selectedInviteIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
