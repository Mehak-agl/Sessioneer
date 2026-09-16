import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
//import { api } from '../../services/api'
import { api } from '../../services/api'
import StaffSidebar from '../../components/TutorSidebar'
import TimeWheelPicker, {
  type WheelTime,
  wheelTimeTo24h,
  wheelTimeDurationMinutes,
  formatDurationMinutes,
} from '../../components/TimeWheelPicker'

// ── Types ───────────────────────────────────────────────────────────────
// These match what the backend actually sends back today. Some fields
// (description, teachingWeeks, campus, mode) do NOT exist in the backend
// yet — they're typed as optional and rendered as placeholders below.

interface UnitSummary {
  id: number
  code: string
  name: string
  semester: string
  coordinator?: { fullName: string }
  availabilityDeadline?: string
}

interface StaffUser {
  id: number
  fullName: string
  email: string
}

interface Invitation {
  id: number
  unit: UnitSummary
  staff: StaffUser
  status: 'PENDING' | 'RESPONDED'
}

interface SessionInfo {
  id: number
  title: string
  startTime: string
  location: string
  status: string
  unit?: { id: number }
  // Real Session DTO has no end time/duration field — same gap flagged
  // elsewhere in this codebase (AddSessionForm.tsx). Only present when
  // the mock happens to include it; falls back to an assumed 1-hour
  // slot everywhere it's used below (see sessionTimeRange).
  endTime?: string
  // Only ever present when this mock/backend happens to include it on an
  // ALLOCATED session — not a guaranteed field, just used as a nicety
  // when available (see "Scheduled Classes" below).
  tutorName?: string
}

interface AllocationInfo {
  id: number
  status: string
  session: SessionInfo
}

interface AvailabilityRecord {
  id: number
  unit: { id: number }
  startTime: string
  endTime: string
}

// ── "Add Additional Availability" ──────────────────────────────────────
// Lets a tutor offer a specific date/time/mode/campus/notes directly from
// a unit's page, instead of only the abstract weekly grid on the Calendar
// page. The date/time actually get submitted through the real
// submitAvailability endpoint (same one the Calendar page uses), but mode,
// campus and notes have nowhere to go server-side — the AvailabilityRequest
// DTO only accepts unitId/startTime/endTime today (same limitation already
// flagged in TutorAvailabilityModal.tsx). So those extra fields are kept
// here, in this component's own state, purely for display on this page —
// they won't show up on the Calendar, in the coordinator's view, or
// survive a refresh.
type LocationType = 'on-campus' | 'online'
type Campus = 'Gardens Point' | 'Kelvin Grove'

interface AdditionalAvailabilityEntry {
  id: string
  unitId: number
  unitCode: string
  date: string
  startTime: string
  endTime: string
  mode: LocationType
  campus?: Campus
  notes: string
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toLocalDateTimeString(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`
}

// The real Session DTO has no duration/end time field — same gap noted
// elsewhere in this codebase (see AddSessionForm.tsx) — so "selecting a
// scheduled class" assumes a standard 1-hour slot when submitting it as
// availability.
function addOneHour(dateTimeStr: string) {
  const d = new Date(dateTimeStr)
  d.setHours(d.getHours() + 1)
  return toLocalDateTimeString(d)
}

// Effective start/end range for a session — uses its real endTime when
// present, otherwise falls back to the same 1-hour assumption as
// addOneHour above.
function sessionTimeRange(s: { startTime: string; endTime?: string }): [Date, Date] {
  const start = new Date(s.startTime)
  const end = new Date(s.endTime ?? addOneHour(s.startTime))
  return [start, end]
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd
}

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

// ── Add Additional Availability: schedule options ─────────────────────────
// Mirrors the Coordinator's own "Add Session" schedule section exactly
// (AddSessionForm.tsx) — same three schedule types, same Mon–Fri day
// list, same Every/Odd/Even week pattern — so a tutor offers recurring
// availability the same way a coordinator schedules a class.
type ScheduleType = 'entire-semester' | 'mid-semester' | 'specific-dates'
type WeekPattern = 'every' | 'odd' | 'even'

const ADD_AVAILABILITY_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const ADD_AVAILABILITY_DAY_INDEX: Record<string, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5,
}

function parseLocalDate(yyyyMmDd: string): Date | null {
  if (!yyyyMmDd) return null
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

// Every real calendar date between start/end (inclusive) that falls on
// the given weekday, filtered by odd/even/every week-of-range pattern —
// identical logic to the Coordinator's generateOccurrenceDates
// (AddSessionForm.tsx), so "Odd Weeks"/"Even Weeks" line up the same way
// for a tutor's recurring availability as they do for a scheduled class.
function generateOccurrenceDates(startDate: Date, endDate: Date, weekdayIndex: number, pattern: WeekPattern): Date[] {
  const dates: Date[] = []
  const cursor = new Date(startDate)
  while (cursor.getDay() !== weekdayIndex && cursor <= endDate) {
    cursor.setDate(cursor.getDate() + 1)
  }
  let weekNumber = 1
  while (cursor <= endDate) {
    const keep = pattern === 'every' || (pattern === 'odd' && weekNumber % 2 === 1) || (pattern === 'even' && weekNumber % 2 === 0)
    if (keep) dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 7)
    weekNumber += 1
  }
  return dates
}

// ── Scheduled Classes: grouping into recurring patterns ─────────────────
// Coordinators create one session per date, but they represent a single
// recurring class (same class type, campus, room, day and time each
// week) — mirrors the exact grouping the coordinator's own Sessions and
// Allocations pages use, so a tutor sees "Tutorial, Mondays 10:00 AM,
// 4 sessions" as one card instead of 4 unrelated rows.
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function inferSessionMode(location: string): LocationType {
  return location === 'Online' ? 'online' : 'on-campus'
}

interface ScheduleGroup {
  key: string
  title: string
  location: string
  mode: LocationType
  dayOfWeek: number
  minutesOfDay: number
  timeLabel: string
  // Only set when the sessions actually have an endTime (see the note on
  // SessionInfo.endTime up top) — shown as "10:00 AM – 11:00 AM · 1 hour"
  // instead of just the start time when available.
  endTimeLabel?: string
  durationLabel?: string
  sessions: SessionInfo[]           // every date, including holidays
  teachingSessions: SessionInfo[]   // excludes holiday-marked dates
  holidaySessions: SessionInfo[]
}

function formatDurationLabel(startTime: string, endTime: string): string {
  const minutes = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
  if (minutes <= 0) return ''
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
  if (mins > 0) parts.push(`${mins} min`)
  return parts.join(' ')
}

function groupScheduledSessions(sessions: SessionInfo[]): ScheduleGroup[] {
  const map = new Map<string, ScheduleGroup>()
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
        mode: inferSessionMode(s.location),
        dayOfWeek: d.getDay(),
        minutesOfDay,
        timeLabel: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        endTimeLabel: s.endTime
          ? new Date(s.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          : undefined,
        durationLabel: s.endTime ? formatDurationLabel(s.startTime, s.endTime) : undefined,
        sessions: [],
        teachingSessions: [],
        holidaySessions: [],
      }
      map.set(key, group)
    }
    group.sessions.push(s)
    if (s.status === 'HOLIDAY') group.holidaySessions.push(s)
    else group.teachingSessions.push(s)
  }
  const groups = Array.from(map.values())
  const byDate = (a: SessionInfo, b: SessionInfo) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  for (const g of groups) {
    g.sessions.sort(byDate)
    g.teachingSessions.sort(byDate)
    g.holidaySessions.sort(byDate)
  }
  groups.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.minutesOfDay - b.minutesOfDay)
  return groups
}

// MOCK DATA — there is no Announcement entity/endpoint in the backend yet.
// This is hardcoded so the section has something to show. Swap this out
// once a real endpoint exists.
// Rough Semester 2, 2026 window — there's no real "semester start/end"
// field on the backend's Unit entity yet (same gap as the O-Week
// deadline placeholder in constants/availability.ts), so this is an
// approximation used only to classify a unit's actual scheduled session
// dates into one of three labels below. It's derived from real session
// data, just measured against a placeholder semester boundary.
const SEMESTER_START = new Date('2026-08-03')
const SEMESTER_END = new Date('2026-11-02')
const SEMESTER_MIDPOINT = new Date((SEMESTER_START.getTime() + SEMESTER_END.getTime()) / 2)

function computeTeachingPeriodLabel(sessions: SessionInfo[]): string {
  if (sessions.length === 0) return '—'
  const times = sessions.map(s => new Date(s.startTime).getTime())
  const first = Math.min(...times)
  const last = Math.max(...times)
  const toleranceMs = 10 * 24 * 60 * 60 * 1000 // ~10 days either side
  const startsAtSemesterStart = first <= SEMESTER_START.getTime() + toleranceMs
  const endsAtSemesterEnd = last >= SEMESTER_END.getTime() - toleranceMs
  if (startsAtSemesterStart && endsAtSemesterEnd) return 'Entire Semester'
  if (first > SEMESTER_MIDPOINT.getTime()) return 'From Mid-Semester'
  if (last < SEMESTER_MIDPOINT.getTime()) return 'To Mid-Semester'
  return 'Entire Semester'
}

const MOCK_ANNOUNCEMENTS = [
  { title: 'Room change for Week 3', body: 'Tuesday lab moves to B Block B204 due to a booking clash.', date: '2026-07-14' },
  { title: 'Marking guide uploaded', body: 'Check the shared drive for the updated marking rubric.', date: '2026-07-10' },
]

export default function TutorMyUnits() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [availability, setAvailability] = useState<AvailabilityRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null)
  const [acceptedUnitIds, setAcceptedUnitIds] = useState<Set<number>>(new Set())
  const [allocations, setAllocations] = useState<AllocationInfo[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // ── Scheduled Classes (select which ones you want) ─────────────────────
  const [unitSessions, setUnitSessions] = useState<SessionInfo[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<number>>(new Set())
  const [submittedSessionIds, setSubmittedSessionIds] = useState<Set<number>>(new Set())
  const [classSelectError, setClassSelectError] = useState('')
  const [submittingClasses, setSubmittingClasses] = useState(false)
  // Local-only — there's no backend endpoint for "I'm declining this
  // specific session" (the only real signal is submitting availability
  // FOR one, there's nothing for explicitly saying no to one). Kept here
  // so a tutor can tell a coordinator "not this date" instead of just
  // leaving it unselected, which reads as "haven't decided yet" rather
  // than "no". Resets on refresh, same as the other local-only bits in
  // this file.
  const [unavailableSessionIds, setUnavailableSessionIds] = useState<Set<number>>(new Set())
  // Cards look and behave like the coordinator's own Sessions cards —
  // collapsed by default, click to reveal the individual dates.
  const [expandedScheduleGroups, setExpandedScheduleGroups] = useState<Set<string>>(new Set())

  // ── Add Additional Availability ─────────────────────────────────────────
  const [showAddAvailability, setShowAddAvailability] = useState(false)
  // Schedule section — mirrors the Coordinator's Add Session form exactly:
  // Entire Semester / Mid-Semester Start / Specific Date(s), a date range +
  // multi-select days of the week, and an Every/Odd/Even week pattern.
  const [addScheduleType, setAddScheduleType] = useState<ScheduleType>('entire-semester')
  const [addStartDate, setAddStartDate] = useState('')
  const [addEndDate, setAddEndDate] = useState('')
  const [addDays, setAddDays] = useState<Set<string>>(new Set())
  const [addWeekPattern, setAddWeekPattern] = useState<WeekPattern>('every')
  const [addSpecificDates, setAddSpecificDates] = useState<string[]>([])
  const [addSpecificDateInput, setAddSpecificDateInput] = useState('')
  // Time — same wheel picker the Coordinator uses to schedule a class,
  // instead of a plain <input type="time">.
  const [addStartTime, setAddStartTime] = useState<WheelTime>({ hour: '9', minute: '00', period: 'AM' })
  const [addEndTime, setAddEndTime] = useState<WheelTime>({ hour: '10', minute: '00', period: 'AM' })
  const [addMode, setAddMode] = useState<LocationType>('on-campus')
  const [addCampus, setAddCampus] = useState<Campus>('Gardens Point')
  const [addNotes, setAddNotes] = useState('')
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [submittingAdd, setSubmittingAdd] = useState<'unit' | 'all' | null>(null)
  const [additionalEntries, setAdditionalEntries] = useState<AdditionalAvailabilityEntry[]>([])

  useEffect(() => {
    api.getMyInvitations().then(setInvitations).catch(console.error)
    api.getMyAvailability().then(setAvailability).catch(console.error)
  }, [])

  // Landed here from a link that named a specific unit (e.g. clicking a
  // calendar entry on the Calendar page) — preselect it once invitations
  // have loaded, then clean the query param off the URL.
  useEffect(() => {
    const unitParam = searchParams.get('unit')
    if (unitParam && invitations.length > 0) {
      setSelectedUnitId(Number(unitParam))
      searchParams.delete('unit')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams, invitations])

  // the tutor's own staff id isn't stored anywhere on login today — but
  // every invitation object already includes it via `staff.id`, so we can
  // just read it off the first one instead of changing the login flow.
  const myStaffId = invitations[0]?.staff?.id

  const submittedUnitIds = useMemo(
    () => new Set(availability.map(a => a.unit.id)),
    [availability]
  )

  const filteredInvitations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return invitations
    return invitations.filter(
      inv => inv.unit.code.toLowerCase().includes(q) || inv.unit.name.toLowerCase().includes(q)
    )
  }, [invitations, searchQuery])

  const selectedInvitation = invitations.find(inv => inv.unit.id === selectedUnitId)
  const isAccepted = selectedUnitId != null &&
    (acceptedUnitIds.has(selectedUnitId) || selectedInvitation?.status === 'RESPONDED')
  const isSubmitted = selectedUnitId != null && submittedUnitIds.has(selectedUnitId)

  // whenever the selected unit changes, load this tutor's allocations for
  // it (real endpoint that already exists) and the unit's scheduled
  // classes (for "Scheduled Classes" below — My Sessions still relies on
  // allocations, not this list, since that's the source of truth for
  // what's actually been confirmed to this tutor).
  useEffect(() => {
    if (!selectedUnitId) return
    setLoadingDetail(true)
    const fetchAllocations = myStaffId ? api.getMyAllocations(myStaffId) : Promise.resolve([])
    fetchAllocations
      .catch(() => [])
      .then(setAllocations)
      .finally(() => setLoadingDetail(false))
  }, [selectedUnitId, myStaffId])

  useEffect(() => {
    if (!selectedUnitId) { setUnitSessions([]); return }
    setLoadingSessions(true)
    setSelectedSessionIds(new Set())
    setUnavailableSessionIds(new Set())
    setExpandedScheduleGroups(new Set())
    setClassSelectError('')
    api.getSessions(selectedUnitId)
      .then(setUnitSessions)
      .catch(() => setUnitSessions([]))
      .finally(() => setLoadingSessions(false))
  }, [selectedUnitId])

  const mySessionsForUnit = allocations.filter(a => a.session?.unit?.id === selectedUnitId)
  const myAllocatedSessionIds = new Set(mySessionsForUnit.map(a => a.session.id))

  // A session counts as already-submitted either because this page just
  // submitted it (submittedSessionIds) or because a matching availability
  // record already existed from before (e.g. submitted earlier on the
  // Calendar page, or in an earlier visit to this page) — cross-checking
  // by exact start time against the real availability list keeps this
  // accurate across reloads instead of only for the current session.
  const submittedStartTimesForUnit = useMemo(
    () => new Set(availability.filter(a => a.unit.id === selectedUnitId).map(a => a.startTime)),
    [availability, selectedUnitId]
  )

  const additionalEntriesForUnit = useMemo(
    () => additionalEntries.filter(e => e.unitId === selectedUnitId),
    [additionalEntries, selectedUnitId]
  )

  const scheduleGroups = useMemo(() => groupScheduledSessions(unitSessions), [unitSessions])

  // A tutor can't physically teach two overlapping sessions — so a
  // session becomes unselectable once ANY other commitment overlaps its
  // time range: another session already checked in this list, one
  // already allocated/submitted for this unit, or an availability slot
  // already submitted for ANY other unit (the tutor's full commitments,
  // not just this unit's). It only applies to sessions that aren't
  // themselves already locked in (mine/submitted) or explicitly marked
  // unavailable — those aren't "selectable" in the first place.
  const conflictingSessionIds = useMemo(() => {
    const committedRanges: Array<[Date, Date]> = []

    // every OTHER submitted availability slot, across every unit
    for (const a of availability) {
      committedRanges.push([new Date(a.startTime), new Date(a.endTime)])
    }
    // every currently checked session in this unit
    for (const s of unitSessions) {
      if (selectedSessionIds.has(s.id)) committedRanges.push(sessionTimeRange(s))
    }

    const conflicting = new Set<number>()
    for (const s of unitSessions) {
      if (s.status === 'HOLIDAY') continue // no class happens, nothing to conflict with
      if (myAllocatedSessionIds.has(s.id)) continue
      if (submittedStartTimesForUnit.has(s.startTime)) continue
      if (selectedSessionIds.has(s.id)) continue // already picked — not "conflicting", it IS the commitment
      const [start, end] = sessionTimeRange(s)
      const clashes = committedRanges.some(([cStart, cEnd]) => rangesOverlap(start, end, cStart, cEnd))
      if (clashes) conflicting.add(s.id)
    }
    return conflicting
  }, [unitSessions, selectedSessionIds, availability, myAllocatedSessionIds, submittedStartTimesForUnit])

  const toggleSessionSelected = (sessionId: number) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

  // Local-only decline for one specific dated session — see the note by
  // unavailableSessionIds above. Unselecting it if it happened to be
  // checked, since "unavailable" and "selected" can't both be true.
  const toggleSessionUnavailable = (sessionId: number) => {
    setUnavailableSessionIds(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
    setSelectedSessionIds(prev => {
      if (!prev.has(sessionId)) return prev
      const next = new Set(prev)
      next.delete(sessionId)
      return next
    })
  }

  // Selects (or, if every eligible date is already selected, unselects)
  // every currently-selectable date in one recurring series at once — e.g.
  // "I'm free for all 4 Tuesday 10am tutorials this semester" in one click,
  // instead of ticking each dated session individually. Only ever touches
  // dates that are still open (not someone else's, not already
  // pending/allocated/marked-unavailable, not clashing with something else).
  const toggleSelectAllForGroup = (selectableIds: number[], allSelected: boolean) => {
    setSelectedSessionIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        for (const id of selectableIds) next.delete(id)
      } else {
        for (const id of selectableIds) next.add(id)
      }
      return next
    })
  }

  const toggleScheduleGroupExpanded = (key: string) => {
    setExpandedScheduleGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSubmitSelectedClasses = async () => {
    if (!selectedInvitation || selectedSessionIds.size === 0) return
    setClassSelectError('')
    setSubmittingClasses(true)
    try {
      const picked = unitSessions.filter(s => selectedSessionIds.has(s.id))
      await Promise.all(picked.map(s =>
        api.submitAvailability({
          unitId: selectedInvitation.unit.id,
          startTime: s.startTime,
          endTime: s.endTime ?? addOneHour(s.startTime),
        })
      ))
      const fresh = await api.getMyAvailability().catch(() => availability)
      setAvailability(fresh)
      setSubmittedSessionIds(prev => new Set([...prev, ...selectedSessionIds]))
      setSelectedSessionIds(new Set())
    } catch (err: any) {
      console.error(err)
      setClassSelectError(err?.message || 'Could not submit your selected classes.')
    } finally {
      setSubmittingClasses(false)
    }
  }

  const toggleAddDay = (day: string) => {
    setAddDays(prev => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  // Specific-dates chip list — same add/remove pattern as the
  // Coordinator's Add Session form.
  const addAddSpecificDate = () => {
    if (!addSpecificDateInput) return
    setAddSpecificDates(prev => (prev.includes(addSpecificDateInput) ? prev : [...prev, addSpecificDateInput].sort()))
    setAddSpecificDateInput('')
  }

  const removeAddSpecificDate = (date: string) => {
    setAddSpecificDates(prev => prev.filter(d => d !== date))
  }

  // Duration of a single occurrence, from the time wheels.
  const addDurationMins = wheelTimeDurationMinutes(addStartTime, addEndTime)

  // "How much time per week is this actually offering" — only meaningful
  // for the two recurring schedule types (a set of weekdays repeating
  // across a date range); a specific date isn't a weekly commitment, so
  // that case shows nothing rather than a misleading number.
  const addWeeklyDurationMins =
    addScheduleType !== 'specific-dates' && addDurationMins != null
      ? addDurationMins * addDays.size
      : null

  // Every real occurrence date this form would submit, given the current
  // schedule type — same generation the Coordinator's Add Session form
  // uses for its own live count.
  const computeAddOccurrenceDates = (): Date[] => {
    if (addScheduleType === 'specific-dates') {
      return addSpecificDates.map(d => parseLocalDate(d)).filter((d): d is Date => d !== null)
    }
    const start = parseLocalDate(addStartDate)
    const end = parseLocalDate(addEndDate)
    if (!start || !end || end < start || addDays.size === 0) return []
    return Array.from(addDays).flatMap(day =>
      generateOccurrenceDates(start, end, ADD_AVAILABILITY_DAY_INDEX[day], addWeekPattern)
    )
  }

  const addOccurrenceCount = useMemo(
    () => computeAddOccurrenceDates(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addScheduleType, addStartDate, addEndDate, addDays, addWeekPattern, addSpecificDates]
  ).length

  const validateAddAvailabilityForm = () => {
    if (addDurationMins == null) return 'End time must be after the start time.'
    if (addScheduleType === 'specific-dates') {
      if (addSpecificDates.length === 0) return 'Add at least one specific date.'
    } else {
      if (!addStartDate || !addEndDate) return 'Please fill in a start and end date.'
      if (parseLocalDate(addEndDate)! < parseLocalDate(addStartDate)!) return 'End date must be on or after the start date.'
      if (addDays.size === 0) return 'Choose at least one day of the week.'
    }
    return ''
  }

  const handleSubmitAdditionalAvailability = async (scope: 'unit' | 'all') => {
    const validationError = validateAddAvailabilityForm()
    if (validationError) { setAddError(validationError); return }
    if (!selectedInvitation) return

    setAddError('')
    setAddSuccess('')
    setSubmittingAdd(scope)

    const targetUnits = scope === 'unit' ? [selectedInvitation.unit] : invitations.map(inv => inv.unit)
    const dates = computeAddOccurrenceDates()
    const { hour24: startHour24, minute: startMinute } = wheelTimeTo24h(addStartTime)
    const { hour24: endHour24, minute: endMinute } = wheelTimeTo24h(addEndTime)
    const startTimeStr = `${pad2(startHour24)}:${pad2(startMinute)}`
    const endTimeStr = `${pad2(endHour24)}:${pad2(endMinute)}`

    try {
      await Promise.all(
        targetUnits.flatMap(u => dates.map(d => {
          const dateStr = toDateInputValue(d)
          return api.submitAvailability({
            unitId: u.id,
            startTime: `${dateStr}T${startTimeStr}:00`,
            endTime: `${dateStr}T${endTimeStr}:00`,
          })
        }))
      )
      const fresh = await api.getMyAvailability().catch(() => availability)
      setAvailability(fresh)

      const newEntries: AdditionalAvailabilityEntry[] = targetUnits.flatMap(u => dates.map(d => ({
        id: `${Date.now()}-${u.id}-${d.getTime()}`,
        unitId: u.id,
        unitCode: u.code,
        date: toDateInputValue(d),
        startTime: startTimeStr,
        endTime: endTimeStr,
        mode: addMode,
        campus: addMode === 'on-campus' ? addCampus : undefined,
        notes: addNotes.trim(),
      })))
      setAdditionalEntries(prev => [...newEntries, ...prev])

      const dateCount = dates.length
      setAddSuccess(
        scope === 'unit'
          ? `Added ${dateCount} date${dateCount !== 1 ? 's' : ''} for ${selectedInvitation.unit.code}.`
          : `Added ${dateCount} date${dateCount !== 1 ? 's' : ''} for all ${targetUnits.length} of your units.`
      )
      setAddDays(new Set())
      setAddStartDate('')
      setAddEndDate('')
      setAddWeekPattern('every')
      setAddSpecificDates([])
      setAddSpecificDateInput('')
      setAddNotes('')
    } catch (err: any) {
      console.error(err)
      setAddError(err?.message || 'Could not submit that availability.')
    } finally {
      setSubmittingAdd(null)
    }
  }

  const [acceptError, setAcceptError] = useState('')

  // FIX: this used to just flip local component state, so it didn't
  // survive navigating away and back or refreshing. Now it's a real,
  // durable action: the invitation flips to RESPONDED immediately, same as the coordinator
  // sees it as "Responded" — acceptedUnitIds stays as an optimistic local
  // overlay so the UI unlocks instantly without waiting on the call.
  const handleAccept = async (unitId: number) => {
    setAcceptError('')
    setAcceptedUnitIds(prev => new Set(prev).add(unitId))
    try {
      const staffId = Number(localStorage.getItem('sessioneer_user_id'))
      await api.acceptInvitation(unitId, staffId)
      const fresh = await api.getMyInvitations()
      setInvitations(fresh)
    } catch (err: any) {
      console.error(err)
      setAcceptError(err?.message || 'Could not record your acceptance — please try again.')
      setAcceptedUnitIds(prev => {
        const next = new Set(prev)
        next.delete(unitId)
        return next
      })
    }
  }

  const handleDecline = async (unitId: number) => {
    if (!myStaffId) return
    const confirmDecline = window.confirm('Decline this invitation? You will no longer see this unit.')
    if (!confirmDecline) return
    try {
      await api.removeInvitation(unitId, myStaffId)
      setInvitations(prev => prev.filter(inv => inv.unit.id !== unitId))
      if (selectedUnitId === unitId) setSelectedUnitId(null)
    } catch (err) {
      console.error(err)
    }
  }

  // Availability can ONLY be submitted or changed on the Calendar page.
  // This just navigates there and tells the calendar which unit to
  // preselect in its dropdown — it does not submit anything itself.
  const goToCalendarForAvailability = (unitId: number) => {
    navigate(`/staff-calendar?availability=1&unit=${unitId}`)
  }

  return (
    <div className="staff-dashboard-page">
      <StaffSidebar />

      <main className="staff-main-content">
        <header className="staff-topbar">
          <div className="staff-page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>My Units</h1>
              <p>Everything about your units, in one place</p>
            </div>
          </div>
        </header>

        <div className="myunits-workspace">
          {/* LEFT: unit list */}
          <aside className="myunits-list-panel">
            <div className="chat-search-box">
              <input
                type="text"
                placeholder="Search your units..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="chat-lists-scroll">
              {filteredInvitations.length === 0 && (
                <div className="chat-empty-hint">No units found.</div>
              )}
              {filteredInvitations.map(inv => {
                const accepted = acceptedUnitIds.has(inv.unit.id) || inv.status === 'RESPONDED'
                const statusLabel = accepted ? 'Accepted' : 'Pending'
                return (
                  <button
                    key={inv.id}
                    className={`myunits-unit-card ${selectedUnitId === inv.unit.id ? 'active' : ''}`}
                    onClick={() => setSelectedUnitId(inv.unit.id)}
                  >
                    <div className="myunits-unit-card-top">
                      <span className="unit-code-badge">{inv.unit.code}</span>
                      <span className={`myunits-status-pill ${accepted ? 'accepted' : 'pending'}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="myunits-unit-name">{inv.unit.name}</div>
                    <div className="myunits-unit-sem">{inv.unit.semester}</div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* RIGHT: selected unit's detail */}
          <section className="myunits-detail-panel">
            {!selectedInvitation && (
              <div className="chat-window-empty">
                <p>Select a unit on the left to see its details.</p>
              </div>
            )}

            {selectedInvitation && (
              <>
                {/* Unit Details — read only */}
                <div className="detail-section">
                  <div className="section-header">
                    <div>
                      <h2>{selectedInvitation.unit.code} — {selectedInvitation.unit.name}</h2>
                      <p>{selectedInvitation.unit.semester}</p>
                    </div>
                  </div>
                  <p><strong>Coordinator:</strong> {selectedInvitation.unit.coordinator?.fullName ?? '—'}</p>
                  {/* Derived from this unit's real scheduled session dates —
                      see the note above computeTeachingPeriodLabel for the
                      semester-boundary placeholder it's measured against. */}
                  <p><strong>Teaching period:</strong> {computeTeachingPeriodLabel(unitSessions)}</p>
                </div>

                {/* Invitation response */}
                {!isAccepted && (
                  <div className="detail-section">
                    <div className="section-header">
                      <div>
                        <h2>Invitation</h2>
                        <p>You've been invited to teach this unit.</p>
                      </div>
                    </div>
                    <div className="request-actions">
                      <button className="accept-btn" onClick={() => handleAccept(selectedInvitation.unit.id)}>
                        Accept
                      </button>
                      <button className="decline-btn" onClick={() => handleDecline(selectedInvitation.unit.id)}>
                        Decline
                      </button>
                    </div>
                    {acceptError && <p className="avail-error-message">{acceptError}</p>}
                  </div>
                )}

                {isAccepted && (
                  <div className="detail-section">
                    <div className="section-header">
                      <div>
                        <h2>Invitation</h2>
                      </div>
                      <span className="status-badge responded">✓ Accepted</span>
                    </div>
                  </div>
                )}

                {/* Scheduled Classes — real sessions for this unit, grouped
                    into recurring patterns (same class type, campus, room,
                    day and time each week — same grouping the coordinator's
                    own Sessions/Allocations pages use). Pick the dates you
                    want; submitting turns each into a real availability
                    slot (same endpoint the Calendar page uses, at that
                    date's own time). */}
                {isAccepted && (
                  <div className="detail-section">
                    <div className="section-header">
                      <div>
                        <h2>Scheduled Classes</h2>
                        <p>Select the classes you'd like to take for this unit</p>
                      </div>
                    </div>

                    {loadingSessions && <p>Loading...</p>}
                    {!loadingSessions && unitSessions.length === 0 && (
                      <div className="empty-info">No scheduled classes for this unit yet.</div>
                    )}

                    {classSelectError && <p className="avail-error-message">{classSelectError}</p>}

                    <div className="sessions-grid">
                      {scheduleGroups.map(group => {
                        const isExpanded = expandedScheduleGroups.has(group.key)
                        const holidayCount = group.holidaySessions.length

                        // Per-date status, computed once per group so the
                        // collapsed summary badges and the expanded row list
                        // below always agree on the same numbers.
                        const rows = group.teachingSessions.map(s => {
                          const isMine = myAllocatedSessionIds.has(s.id)
                          const isTakenByOther = !isMine && s.status === 'ALLOCATED'
                          const isClassSubmitted = submittedSessionIds.has(s.id) || submittedStartTimesForUnit.has(s.startTime)
                          const isMarkedUnavailable = unavailableSessionIds.has(s.id)
                          const hasConflict = conflictingSessionIds.has(s.id)
                          return { s, isMine, isTakenByOther, isClassSubmitted, isMarkedUnavailable, hasConflict }
                        })
                        const allocatedCount = rows.filter(r => r.isMine && !r.isMarkedUnavailable).length
                        const pendingCount = rows.filter(r => !r.isMine && r.isClassSubmitted && !r.isMarkedUnavailable).length
                        const unavailableCount = rows.filter(r => r.isMarkedUnavailable).length

                        // Eligible for "Select All" — dates nobody has
                        // claimed, that aren't already pending/allocated/
                        // marked unavailable, and don't clash with anything
                        // else already committed.
                        const selectableIds = rows
                          .filter(r => !r.isMine && !r.isTakenByOther && !r.isClassSubmitted && !r.isMarkedUnavailable && !r.hasConflict)
                          .map(r => r.s.id)
                        const allSelectableChecked = selectableIds.length > 0 && selectableIds.every(id => selectedSessionIds.has(id))

                        return (
                          <div
                            key={group.key}
                            className={`session-card session-group-card ${isExpanded ? 'expanded' : ''}`}
                          >
                            <div
                              className="session-card-main clickable"
                              role="button"
                              tabIndex={0}
                              onClick={() => toggleScheduleGroupExpanded(group.key)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  toggleScheduleGroupExpanded(group.key)
                                }
                              }}
                            >
                              <div className="session-card-top">
                                <div className="session-card-top-left">
                                  {selectableIds.length > 0 && (
                                    <label
                                      className="session-group-select-all-checkbox"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={allSelectableChecked}
                                        onChange={e => {
                                          e.stopPropagation()
                                          toggleSelectAllForGroup(selectableIds, allSelectableChecked)
                                        }}
                                      />
                                      I can teach this
                                    </label>
                                  )}
                                  <span className={`mode-badge ${group.mode}`}>
                                    {group.mode === 'online' ? '🌐 Online' : '🏫 On-campus'}
                                  </span>
                                </div>
                                <span className="session-group-count">
                                  {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''}
                                  {holidayCount > 0 && (
                                    <span className="session-group-holiday-hint">🏖 {holidayCount}</span>
                                  )}
                                  <span className={`session-group-chevron ${isExpanded ? 'open' : ''}`}>▾</span>
                                </span>
                              </div>
                              <div className="session-day">{group.title}</div>
                              <div className="session-time">
                                {DAY_NAMES[group.dayOfWeek]}s, {group.timeLabel}
                                {group.endTimeLabel && ` – ${group.endTimeLabel}`}
                                {group.durationLabel && ` · ${group.durationLabel}`}
                              </div>
                              {group.location && <div className="session-location">{group.location}</div>}
                              <div className="session-time session-group-range">
                                {new Date(group.sessions[0].startTime).toLocaleDateString()} –{' '}
                                {new Date(group.sessions[group.sessions.length - 1].startTime).toLocaleDateString()}
                              </div>
                              {/* At-a-glance status so a tutor doesn't need to expand
                                  the card just to see what's Awaiting Allocation vs
                                  Allocated. Deliberately NOT labeled "Pending" — on the
                                  Coordinator's own session cards "Pending" means "nobody
                                  allocated yet" (the default state), which is the opposite
                                  of what it would mean here ("I've already submitted,
                                  waiting on you to allocate me"). Same badge styling,
                                  different word, so the two screens don't silently collide
                                  on the same label for opposite meanings. */}
                              {(allocatedCount > 0 || pendingCount > 0 || unavailableCount > 0) && (
                                <div className="session-group-status-summary">
                                  {allocatedCount > 0 && (
                                    <span className="status-badge allocated">{allocatedCount} Allocated</span>
                                  )}
                                  {pendingCount > 0 && (
                                    <span className="status-badge pending">{pendingCount} Awaiting Allocation</span>
                                  )}
                                  {unavailableCount > 0 && (
                                    <span className="status-badge unavailable">{unavailableCount} Can't Teach</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {isExpanded && (
                              <div className="session-group-body">
                                <div className="session-group-body-header">
                                  <span className="session-group-body-label">
                                    {group.sessions.length} dated session{group.sessions.length !== 1 ? 's' : ''} in this series
                                  </span>
                                  {selectableIds.length > 1 && (
                                    <button
                                      type="button"
                                      className="session-select-all-btn"
                                      onClick={() => toggleSelectAllForGroup(selectableIds, allSelectableChecked)}
                                    >
                                      {allSelectableChecked ? 'Unselect All' : `Select All ${selectableIds.length}`}
                                    </button>
                                  )}
                                </div>

                                <div className="myunits-class-list myunits-class-list-in-card">
                                  {group.sessions.map(s => {
                                    if (s.status === 'HOLIDAY') {
                                      return (
                                        <div key={s.id} className="myunits-class-row holiday">
                                          <span className="myunits-class-status-icon">🏖</span>
                                          <div className="myunits-class-info">
                                            <span className="myunits-class-title">
                                              {new Date(s.startTime).toLocaleDateString(undefined, {
                                                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                                              })}
                                            </span>
                                            <span className="myunits-class-location">Holiday — no class runs this date</span>
                                          </div>
                                        </div>
                                      )
                                    }

                                    const isMine = myAllocatedSessionIds.has(s.id)
                                    const isTakenByOther = !isMine && s.status === 'ALLOCATED'
                                    const isClassSubmitted = submittedSessionIds.has(s.id) || submittedStartTimesForUnit.has(s.startTime)
                                    const isChecked = selectedSessionIds.has(s.id)
                                    const isMarkedUnavailable = unavailableSessionIds.has(s.id)
                                    const hasConflict = conflictingSessionIds.has(s.id)
                                    const [rangeStart, rangeEnd] = sessionTimeRange(s)
                                    // Only someone else's confirmed class is completely
                                    // out of the tutor's hands — every other state (open,
                                    // awaiting allocation, or already allocated to them) can
                                    // still be flagged "can't teach this particular day".
                                    const canToggleUnavailable = !isTakenByOther && !hasConflict

                                    // One combined {icon} {label} status-badge — matches the
                                    // Coordinator's own per-date convention (a single badge,
                                    // not a bare emoji in the checkbox slot plus a separate
                                    // text badge further along the row). Label deliberately
                                    // says "Awaiting Allocation" rather than "Pending" — on
                                    // the Coordinator's session cards "Pending" means nobody's
                                    // been allocated yet (the default state); here it would
                                    // mean the opposite (you've already submitted and are
                                    // waiting on them), so it gets its own wording instead of
                                    // silently colliding with that other meaning.
                                    const dateStatus = isMarkedUnavailable
                                      ? { icon: '❌', label: 'Cannot Teach', className: 'unavailable' }
                                      : isMine
                                      ? { icon: '✓', label: 'Allocated to You', className: 'allocated' }
                                      : isTakenByOther
                                      ? { icon: '—', label: 'Taken', className: 'pending' }
                                      : isClassSubmitted
                                      ? { icon: '✅', label: 'Awaiting Allocation', className: 'pending' }
                                      : null

                                    return (
                                      <label
                                        key={s.id}
                                        className={`myunits-class-row ${isTakenByOther || hasConflict ? 'disabled' : ''} ${isMarkedUnavailable ? 'unavailable' : ''}`}
                                        onClick={e => e.stopPropagation()}
                                      >
                                        {dateStatus ? (
                                          <span className="myunits-class-status-spacer" aria-hidden="true" />
                                        ) : (
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            disabled={hasConflict}
                                            onChange={() => toggleSessionSelected(s.id)}
                                          />
                                        )}
                                        <div className="myunits-class-info">
                                          <span className="myunits-class-title">
                                            {rangeStart.toLocaleDateString(undefined, {
                                              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                                            })}
                                          </span>
                                          <span className="myunits-class-time">
                                            {rangeStart.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                            {'–'}
                                            {rangeEnd.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                          </span>
                                          {hasConflict && !isMarkedUnavailable && (
                                            <span className="myunits-class-conflict-note">
                                              Clashes with another class or availability you've already selected/submitted
                                            </span>
                                          )}
                                        </div>
                                        {dateStatus && (
                                          <span className={`status-badge ${dateStatus.className}`}>
                                            {dateStatus.icon} {dateStatus.label}
                                          </span>
                                        )}
                                        {canToggleUnavailable && (
                                          <button
                                            type="button"
                                            className="myunits-class-unavailable-btn"
                                            onClick={e => { e.preventDefault(); toggleSessionUnavailable(s.id) }}
                                          >
                                            {isMarkedUnavailable ? 'Available Again' : "Mark I'm Unavailable"}
                                          </button>
                                        )}
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {unitSessions.some(s => !myAllocatedSessionIds.has(s.id) && s.status !== 'ALLOCATED' && s.status !== 'HOLIDAY') && (
                      <button
                        type="button"
                        className="confirm-btn"
                        style={{ marginTop: '14px' }}
                        disabled={selectedSessionIds.size === 0 || submittingClasses}
                        onClick={handleSubmitSelectedClasses}
                      >
                        {submittingClasses
                          ? 'Submitting...'
                          : `Submit ${selectedSessionIds.size || ''} Selected Class${selectedSessionIds.size === 1 ? '' : 'es'}`}
                      </button>
                    )}
                  </div>
                )}

                {/* Add Additional Availability — a specific date/time/mode/
                    campus outside the scheduled classes above. See the note
                    on AdditionalAvailabilityEntry up top for what is and
                    isn't actually saved server-side. */}
                {isAccepted && (
                  <div className="detail-section">
                    <div className="section-header">
                      <div>
                        <h2>Add Additional Availability</h2>
                        <p>Offer a date and time outside the scheduled classes above</p>
                      </div>
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => { setShowAddAvailability(v => !v); setAddError(''); setAddSuccess('') }}
                      >
                        {showAddAvailability ? 'Close' : '+ Add Availability'}
                      </button>
                    </div>

                    {showAddAvailability && (
                      <div className="detail-form">
                        {/* Time — same wheel picker the Coordinator uses to
                            schedule a class, with the same live duration
                            readout, plus a per-week total below. */}
                        <div className="form-subsection">
                          <div className="form-subsection-title">Time</div>
                          <div className="time-wheel-row">
                            <TimeWheelPicker label="Start Time" value={addStartTime} onChange={setAddStartTime} />
                            <TimeWheelPicker label="End Time" value={addEndTime} onChange={setAddEndTime} />
                            <div className="form-field duration-display">
                              <label>Duration</label>
                              <input type="text" value={formatDurationMinutes(addDurationMins)} readOnly disabled />
                            </div>
                          </div>
                          {addWeeklyDurationMins != null && (
                            <p className="avail-range-hint" style={{ marginTop: '-8px' }}>
                              You're offering <strong>{formatDurationMinutes(addWeeklyDurationMins)}</strong> per
                              week ({addDays.size} day{addDays.size !== 1 ? 's' : ''} × {formatDurationMinutes(addDurationMins)}).
                            </p>
                          )}
                        </div>

                        {/* Schedule — mirrors the Coordinator's own Add
                            Session schedule section exactly. */}
                        <div className="form-subsection">
                          <div className="form-subsection-title">Schedule</div>
                          <div className="schedule-box">
                            <div className="segmented-row">
                              <button
                                type="button"
                                className={`segmented-btn ${addScheduleType === 'entire-semester' ? 'selected' : ''}`}
                                onClick={() => setAddScheduleType('entire-semester')}
                              >
                                Entire Semester
                              </button>
                              <button
                                type="button"
                                className={`segmented-btn ${addScheduleType === 'mid-semester' ? 'selected' : ''}`}
                                onClick={() => setAddScheduleType('mid-semester')}
                              >
                                Mid-Semester Start
                              </button>
                              <button
                                type="button"
                                className={`segmented-btn ${addScheduleType === 'specific-dates' ? 'selected' : ''}`}
                                onClick={() => setAddScheduleType('specific-dates')}
                              >
                                Specific Date(s)
                              </button>
                            </div>

                            {(addScheduleType === 'entire-semester' || addScheduleType === 'mid-semester') && (
                              <>
                                <div className="form-row-2" style={{ marginTop: 16 }}>
                                  <div className="form-field">
                                    <label>Start Date</label>
                                    <input type="date" value={addStartDate} onChange={e => setAddStartDate(e.target.value)} />
                                  </div>
                                  <div className="form-field">
                                    <label>End Date</label>
                                    <input type="date" value={addEndDate} onChange={e => setAddEndDate(e.target.value)} />
                                  </div>
                                </div>

                                <div className="form-field" style={{ marginTop: 16 }}>
                                  <label>Day of Week</label>
                                  <div className="myunits-add-days-row">
                                    {ADD_AVAILABILITY_DAYS.map(day => (
                                      <button
                                        key={day}
                                        type="button"
                                        className={`segmented-btn ${addDays.has(day) ? 'selected' : ''}`}
                                        onClick={() => toggleAddDay(day)}
                                      >
                                        {day.slice(0, 3)}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="form-field" style={{ marginTop: 16 }}>
                                  <label>Week Pattern</label>
                                  <div className="segmented-row">
                                    <button type="button" className={`segmented-btn ${addWeekPattern === 'every' ? 'selected' : ''}`}
                                      onClick={() => setAddWeekPattern('every')}>Every Week</button>
                                    <button type="button" className={`segmented-btn ${addWeekPattern === 'odd' ? 'selected' : ''}`}
                                      onClick={() => setAddWeekPattern('odd')}>Odd Weeks</button>
                                    <button type="button" className={`segmented-btn ${addWeekPattern === 'even' ? 'selected' : ''}`}
                                      onClick={() => setAddWeekPattern('even')}>Even Weeks</button>
                                  </div>
                                </div>
                              </>
                            )}

                            {addScheduleType === 'specific-dates' && (
                              <div className="form-field" style={{ marginTop: 16 }}>
                                <label>Dates</label>
                                <div className="specific-dates-row">
                                  <input type="date" value={addSpecificDateInput} onChange={e => setAddSpecificDateInput(e.target.value)} />
                                  <button type="button" className="cancel-btn" onClick={addAddSpecificDate}>Add Date</button>
                                </div>
                                {addSpecificDates.length > 0 && (
                                  <div className="specific-dates-chips">
                                    {addSpecificDates.map(d => (
                                      <span key={d} className="specific-date-chip">
                                        {d}
                                        <button type="button" onClick={() => removeAddSpecificDate(d)}>×</button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <p className="avail-range-hint schedule-occurrence-hint">
                              {addOccurrenceCount > 0
                                ? `This will offer ${addOccurrenceCount} date${addOccurrenceCount !== 1 ? 's' : ''}`
                                : 'Select a valid date range or at least one specific date'}
                            </p>
                          </div>
                        </div>

                        <div className="form-field">
                          <label>Mode</label>
                          <select value={addMode} onChange={e => setAddMode(e.target.value as LocationType)}>
                            <option value="on-campus">🏫 On Campus</option>
                            <option value="online">🌐 Online</option>
                          </select>
                        </div>

                        {addMode === 'on-campus' && (
                          <div className="form-field">
                            <label>Campus</label>
                            <div className="segmented-row">
                              <button
                                type="button"
                                className={`segmented-btn ${addCampus === 'Gardens Point' ? 'selected' : ''}`}
                                onClick={() => setAddCampus('Gardens Point')}
                              >
                                Gardens Point
                              </button>
                              <button
                                type="button"
                                className={`segmented-btn ${addCampus === 'Kelvin Grove' ? 'selected' : ''}`}
                                onClick={() => setAddCampus('Kelvin Grove')}
                              >
                                Kelvin Grove
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="form-field">
                          <label>Notes <span className="avail-optional">(optional)</span></label>
                          <textarea
                            className="avail-notes"
                            rows={3}
                            placeholder="e.g. Only available in the afternoon, prefer online if possible..."
                            value={addNotes}
                            onChange={e => setAddNotes(e.target.value)}
                          />
                        </div>

                        {addError && <p className="avail-error-message">{addError}</p>}
                        {addSuccess && <p className="avail-saved-message">{addSuccess}</p>}

                        <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
                          <button
                            type="button"
                            className="confirm-btn"
                            disabled={submittingAdd !== null}
                            onClick={() => handleSubmitAdditionalAvailability('unit')}
                          >
                            {submittingAdd === 'unit' ? 'Submitting...' : `Submit for ${selectedInvitation.unit.code} Only`}
                          </button>
                          <button
                            type="button"
                            className="cancel-btn"
                            disabled={submittingAdd !== null}
                            onClick={() => handleSubmitAdditionalAvailability('all')}
                          >
                            {submittingAdd === 'all' ? 'Submitting...' : 'Submit for All Units'}
                          </button>
                        </div>
                      </div>
                    )}

                    {additionalEntriesForUnit.length > 0 && (
                      <div className="myunits-additional-list">
                        {additionalEntriesForUnit.map(e => (
                          <div key={e.id} className="myunits-additional-row">
                            <div>
                              <strong>{new Date(e.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                              <span> · {e.startTime}–{e.endTime}</span>
                              <span> · {e.mode === 'online' ? '🌐 Online' : `🏫 ${e.campus}`}</span>
                            </div>
                            {e.notes && <p className="myunits-additional-notes">{e.notes}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Availability — READ-ONLY status here. Actually submitting
                    or changing availability only happens on the Calendar
                    page, this just tells you the status and links there. */}
                {isAccepted && (
                  <div className="detail-section">
                    <div className="section-header">
                      <div>
                        <h2>Availability</h2>
                        <p>Submitted and updated on the Calendar page</p>
                      </div>
                      {/* "Not Submitted" rather than "Pending" — "Pending" already
                          means two different things elsewhere on this page (see the
                          note above the Scheduled Classes status badges), a third
                          meaning here ("you haven't submitted anything yet") would
                          only add to that. */}
                      <span className={`myunits-status-pill ${isSubmitted ? 'accepted' : 'pending'}`}>
                        {isSubmitted ? 'Submitted' : 'Not Submitted'}
                      </span>
                    </div>
                    <button
                      className="confirm-btn"
                      onClick={() => goToCalendarForAvailability(selectedInvitation.unit.id)}
                    >
                      {isSubmitted ? 'Update on Calendar →' : 'Submit on Calendar →'}
                    </button>
                  </div>
                )}

                {/* My Sessions — real allocations, filtered to this unit */}
                {isAccepted && (
                  <div className="detail-section">
                    <div className="section-header">
                      <div>
                        <h2>My Sessions</h2>
                        <p>Sessions allocated to you for this unit</p>
                      </div>
                    </div>
                    {loadingDetail && <p>Loading...</p>}
                    {!loadingDetail && mySessionsForUnit.length === 0 && (
                      <div className="empty-info">No sessions allocated to you yet for this unit.</div>
                    )}
                    <div className="sessions-grid">
                      {mySessionsForUnit.map(a => (
                        <div key={a.id} className="session-card">
                          <div className="session-day">{a.session.title}</div>
                          <div className="session-time">{new Date(a.session.startTime).toLocaleString()}</div>
                          <div className="session-location">{a.session.location}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Announcements — fully mock, no backend endpoint exists */}
                <div className="detail-section">
                  <div className="section-header">
                    <div>
                      <h2>Announcements</h2>
                      <p>Updates from your coordinator (placeholder data)</p>
                    </div>
                  </div>
                  {MOCK_ANNOUNCEMENTS.map((a, i) => (
                    <div key={i} className="announcement-card">
                      <div className="announcement-top">
                        <span className="announcement-title">{a.title}</span>
                        <span className="announcement-date">{new Date(a.date).toLocaleDateString()}</span>
                      </div>
                      <p>{a.body}</p>
                    </div>
                  ))}
                </div>

                {/* Unit Information — mostly fake fields for now */}
                <div className="detail-section">
                  <div className="section-header">
                    <div>
                      <h2>Unit Information</h2>
                    </div>
                  </div>
                  <p><strong>Campus:</strong> Gardens Point (placeholder)</p>
                  <p><strong>Teaching mode:</strong> Hybrid (placeholder)</p>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}