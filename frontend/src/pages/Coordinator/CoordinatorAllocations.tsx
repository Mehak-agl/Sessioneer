import { useEffect, useMemo, useState } from 'react'
import { api, SELF_ASSIGN_STAFF_ID } from "../../services/api";
import CoordinatorSidebar from '../../components/CoordinatorSidebar'

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

interface Session {
  id: number;
  title: string;
  startTime: string;
  // Real duration, now actually persisted end-to-end — optional so older
  // sessions created before this existed still type-check.
  endTime?: string;
  location: string;
  status: string;
  mode?: 'on-campus' | 'online';
  unavailableStaffIds?: number[];
}

interface Invitation {
  id: number;
  unit: { id: number };
  staff: StaffUser;
  status: 'PENDING' | 'RESPONDED';
}

interface AllocationInfo {
  id: number;
  status: string;
  session: Session & { unit: { id: number } };
  staff: StaffUser;
}

function inferMode(session: { location: string }): 'on-campus' | 'online' {
  return session.location === 'Online' ? 'online' : 'on-campus'
}

function modeLabel(mode?: 'on-campus' | 'online') {
  return mode === 'online' ? '🌐 Online' : '🏫 On-campus'
}

function sessionStatusMeta(status: string): { label: string; icon: string; className: string } {
  return status.toUpperCase() === 'ALLOCATED'
    ? { label: 'Allocated', icon: '✓', className: 'allocated' }
    : { label: 'Pending', icon: '⏳', className: 'pending' }
}

// Lectures don't go through the normal "invite to the unit" flow — a
// coordinator can only send a direct request for a lecture, never a
// standing invitation (see handleSendRequest below).
function isLecture(title: string): boolean {
  return title.trim().toLowerCase() === 'lecture'
}

// ── Recurring session grouping ────────────────────────────────────────
// Sessions that share the same class type (title), campus + room
// (location), day of week and time are one recurring slot as far as
// allocation is concerned — they should be assigned to a single tutor
// together, not offered up as separate cards. This mirrors the same
// grouping used on the Unit Detail page's Sessions section.
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface SessionGroup {
  key: string
  title: string
  location: string
  mode: Session['mode']
  dayOfWeek: number
  minutesOfDay: number
  endMinutesOfDay: number
  timeLabel: string
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
        endMinutesOfDay: s.endTime
          ? new Date(s.endTime).getHours() * 60 + new Date(s.endTime).getMinutes()
          : minutesOfDay + 60,
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

// ── Auto-allocation ──────────────────────────────────────────────────────
// Mock weekly availability per tutor (days 1=Mon … 5=Fri).
// Deterministic on staffId so results are consistent across renders.
/***const AVAIL_PATTERNS = [
  [1, 2, 3, 4, 5],
  [1, 3, 5],
  [2, 4],
  [1, 2, 4],
  [3, 4, 5],
  [1, 2, 3],
]

function tutorAvailDays(staffId: number): number[] {
  return AVAIL_PATTERNS[Math.abs(staffId) % AVAIL_PATTERNS.length]
}

interface DraftEntry {
  group: SessionGroup
  tutor: StaffUser | null
  matchType: 'availability' | 'load-balanced' | 'none'
  accepted: boolean
}

function buildDraft(groups: SessionGroup[], tutors: StaffUser[]): DraftEntry[] {
  if (tutors.length === 0) {
    return groups.map(g => ({ group: g, tutor: null, matchType: 'none', accepted: true }))
  }
  const load = new Map<number, number>()
  tutors.forEach(t => load.set(t.id, 0))

  return groups.map(group => {
    const availableToday = tutors.filter(t => tutorAvailDays(t.id).includes(group.dayOfWeek))
    const pool = availableToday.length > 0 ? availableToday : tutors
    const best = pool.reduce((a, b) => (load.get(a.id) ?? 0) <= (load.get(b.id) ?? 0) ? a : b)
    load.set(best.id, (load.get(best.id) ?? 0) + 1)
    return {
      group,
      tutor: best,
      matchType: availableToday.includes(best) ? 'availability' : 'load-balanced',
      accepted: true,
    }
  })
}***/

// ── Auto-allocation ──────────────────────────────────────────────────────
// Matches tutors using the availability slots they actually submitted
// (see TutorAvailabilityModal) — each slot is a day-of-week + hour range
// for the unit. A tutor is a match when one of their slots overlaps the
// group's day and time. No fallback to an unavailable tutor anymore —
// if nobody's actually free, the group is left unmatched.
interface AvailabilitySlot {
  id: number
  staff: StaffUser
  startTime: string
  endTime: string
}

// TutorAvailabilityModal's weekly grid submits placeholder dates in a
// fixed dummy week (2026-06-01..05, Mon-Fri) that don't mean anything as
// dates — they just encode "this weekday, every week". Anything else was
// submitted via "Add Additional Availability", which uses real calendar
// dates and should only ever match that one specific date.
function isRecurringPatternSlot(slot: AvailabilitySlot): boolean {
  const d = new Date(slot.startTime)
  return d.getFullYear() === 2026 && d.getMonth() === 5 && d.getDate() >= 1 && d.getDate() <= 5
}

function slotCoversSessionDate(slot: AvailabilitySlot, group: SessionGroup, sessionDate: Date): boolean {
  const start = new Date(slot.startTime)
  const end = new Date(slot.endTime)
  const slotStart = start.getHours() * 60 + start.getMinutes()
  const slotEnd = end.getHours() * 60 + end.getMinutes()
  if (!(slotStart < group.endMinutesOfDay && group.minutesOfDay < slotEnd)) return false
  return isRecurringPatternSlot(slot)
    ? start.getDay() === sessionDate.getDay()
    : start.toDateString() === sessionDate.toDateString()
}

function isStaffAvailableForSession(slots: AvailabilitySlot[], staffId: number, group: SessionGroup, session: Session): boolean {
  const sessionDate = new Date(session.startTime)
  return slots.some(s => s.staff.id === staffId && slotCoversSessionDate(s, group, sessionDate))
}

// Per-occurrence — used for the expanded per-date candidate list.
function tutorsAvailableForSession(slots: AvailabilitySlot[], tutors: StaffUser[], group: SessionGroup, session: Session): StaffUser[] {
  return tutors.filter(t =>
    isStaffAvailableForSession(slots, t.id, group, session) &&
    !(session.unavailableStaffIds ?? []).includes(t.id)
  )
}

// A couple of dates flagged unavailable shouldn't disqualify them
// from the whole group — handleAllocate skips just those dates.
// Only fully exclude them if EVERY matching date is flagged.
function tutorsAvailableForGroup(slots: AvailabilitySlot[], tutors: StaffUser[], group: SessionGroup): StaffUser[] {
  return tutors.filter(t => {
    const matching = group.sessions.filter(s => isStaffAvailableForSession(slots, t.id, group, s))
    if (matching.length === 0) return false
    return matching.some(s => !(s.unavailableStaffIds ?? []).includes(t.id))
  })
}

interface DraftEntry {
  group: SessionGroup
  tutor: StaffUser | null
  matchType: 'availability' | 'none'
  accepted: boolean
}

function buildDraft(groups: SessionGroup[], tutors: StaffUser[], slots: AvailabilitySlot[]): DraftEntry[] {
  if (tutors.length === 0) {
    return groups.map(g => ({ group: g, tutor: null, matchType: 'none', accepted: true }))
  }
  const load = new Map<number, number>()
  tutors.forEach(t => load.set(t.id, 0))

  return groups.map(group => {
    const available = tutorsAvailableForGroup(slots, tutors, group)
    if (available.length === 0) {
      return { group, tutor: null, matchType: 'none', accepted: true }
    }
    const best = available.reduce((a, b) => (load.get(a.id) ?? 0) <= (load.get(b.id) ?? 0) ? a : b)
    load.set(best.id, (load.get(best.id) ?? 0) + 1)
    return { group, tutor: best, matchType: 'availability', accepted: true }
  })
}

// Coordinator-facing allocation screen: pick a unit → see its sessions,
// grouped into one card per recurring slot (same class type, campus,
// room, day and time — see groupSessions above) → assign a tutor who
// has submitted availability, or search for and request any other
// tutor if nobody has responded yet. Assigning a tutor to a card
// allocates every session inside that group to them, not just one date.
// A coordinator can also assign a lecture/class group to themself
// instead of a tutor (see handleSelfAssign) — useful when they're
// personally covering it.
//
// IMPORTANT — data model note: availability is currently submitted per
// UNIT, not per individual session (see TutorAvailabilityModal — slots
// are saved against a unit, and the backend only flips an invitation to
// RESPONDED at the unit level once *any* availability is submitted for
// it). There's no endpoint yet that says "tutor X is available for
// session Y specifically". So the list of "tutors who submitted
// availability" shown below is every RESPONDED tutor for the unit,
// offered as a candidate on every group — it isn't filtered further per
// session or per group, because the backend has no way to do that
// filtering yet. This is a UI-only screen; nothing here changes the
// backend or its data model.
export default function CoordinatorAllocations() {
  const coordinatorName = localStorage.getItem('sessioneer_name') || 'Coordinator'
  const coordinatorEmail = localStorage.getItem('sessioneer_email') || undefined

  const [units, setUnits] = useState<Unit[]>([])
  const [loadingUnits, setLoadingUnits] = useState(true)

  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])

  const [allocations, setAllocations] = useState<AllocationInfo[]>([])
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [reassigningKey, setReassigningKey] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [allocateError, setAllocateError] = useState('')
  const [allocatingKey, setAllocatingKey] = useState<string | null>(null)
  const [occurrencePickerId, setOccurrencePickerId] = useState<number | null>(null)
  const [occurrenceBusyId, setOccurrenceBusyId] = useState<number | null>(null)

  // Auto-allocation draft
  const [showDraft, setShowDraft] = useState(false)
  const [draftEntries, setDraftEntries] = useState<DraftEntry[]>([])
  const [applyingDraft, setApplyingDraft] = useState(false)

  // Search-and-request modal (for groups with no responded tutors yet)
  const [searchGroup, setSearchGroup] = useState<SessionGroup | null>(null)
  const [allStaff, setAllStaff] = useState<StaffUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  // Local-only — tracks which (group, tutor) pairs have had a request
  // sent during this visit, purely so the button can show "Request Sent"
  // instead of firing the same invite twice. The invite itself (via
  // inviteStaff) is real; this per-group tracking is not, since the
  // backend has no concept of a request being tied to one session.
  const [requestedPairs, setRequestedPairs] = useState<Set<string>>(new Set())
  const [requestError, setRequestError] = useState('')

  useEffect(() => {
    api.getUnits().then(setUnits).catch(console.error).finally(() => setLoadingUnits(false))
    api.getAllStaff().then(setAllStaff).catch(console.error)
  }, [])

  const loadUnitDetail = async (unit: Unit) => {
    setSelectedUnit(unit)
    setLoadingDetail(true)
    setReassigningKey(null)
    setExpandedGroups(new Set())
    setAllocateError('')
    try {
      const [sess, invites, allocs, avail] = await Promise.all([
        api.getSessions(unit.id),
        api.getUnitInvitations(unit.id),
        api.getUnitAllocations(unit.id),
        api.getUnitAvailability(unit.id),
      ])
      setSessions(sess.filter((s: any) => s.status !== 'HOLIDAY').map((s: any) => ({ ...s, mode: inferMode(s) })))      
      setInvitations(invites)
      setAllocations(allocs)
      setAvailabilitySlots(avail)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const backToUnits = () => {
    setSelectedUnit(null)
    setSessions([])
    setInvitations([])
    setAllocations([])
    setAvailabilitySlots([])
  }

  const sessionGroups = useMemo(() => groupSessions(sessions), [sessions])

  const toggleGroupExpanded = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Every tutor who has submitted availability for this unit — see the
  // data-model note above the component for why this isn't per-session.
  const respondedTutors = invitations
    .filter(inv => inv.status === 'RESPONDED')
    .map(inv => inv.staff)

  const handleAllocate = async (group: SessionGroup, staff: StaffUser) => {
    setAllocateError('')
    setAllocatingKey(group.key)
    try {
      // Skip any date in the group this tutor is flagged unavailable
      // for — bulk-assigning the group must not override a real
      // per-session unavailable flag.
      const allocatable = group.sessions.filter(
        s => !(s.unavailableStaffIds ?? []).includes(staff.id)
      )
      const skipped = group.sessions.length - allocatable.length

      if (allocatable.length === 0) {
        setAllocateError(`${staff.fullName} is unavailable for every date in this group.`)
        return
      }

      const results = await Promise.all(
        allocatable.map(s => api.allocate({ sessionId: s.id, staffId: staff.id }))
      )
      const allocatedIds = new Set(allocatable.map(s => s.id))
      setAllocations(prev => [...prev.filter(a => !allocatedIds.has(a.session.id)), ...results])
      setSessions(prev => prev.map(s => allocatedIds.has(s.id) ? { ...s, status: 'ALLOCATED' } : s))
      setReassigningKey(null)

      if (skipped > 0) {
        setAllocateError(
          `${staff.fullName} was skipped for ${skipped} date${skipped !== 1 ? 's' : ''} they marked unavailable — assign those separately.`
        )
      }
    } catch (err: any) {
      console.error(err)
      setAllocateError(err?.message || 'Could not allocate that tutor to this session group.')
    } finally {
      setAllocatingKey(null)
    }
  }

  // Lets the coordinator assign a lecture/class group to themself
  // instead of picking a tutor — e.g. when they're covering it in
  // person. Same per-session/group-wide approach as handleAllocate
  // above, just against the selfAssign endpoint.
  const handleSelfAssign = async (group: SessionGroup) => {
    setAllocateError('')
    setAllocatingKey(group.key)
    try {
      const results = await Promise.all(
        group.sessions.map(s => api.selfAssign({
          sessionId: s.id,
          coordinatorName,
          coordinatorEmail,
        }))
      )
      const allocatedIds = new Set(group.sessions.map(s => s.id))
      setAllocations(prev => [...prev.filter(a => !allocatedIds.has(a.session.id)), ...results])
      setSessions(prev => prev.map(s => allocatedIds.has(s.id) ? { ...s, status: 'ALLOCATED' } : s))
      setReassigningKey(null)
    } catch (err: any) {
      console.error(err)
      setAllocateError(err?.message || 'Could not self-assign this session group.')
    } finally {
      setAllocatingKey(null)
    }
  }

  // Per-occurrence assign — same as handleAllocate/handleSelfAssign but
  // scoped to a single session, not the whole recurring group.
  const handleAllocateOccurrence = async (sessionId: number, staff: StaffUser) => {
    setAllocateError('')
    setOccurrenceBusyId(sessionId)
    try {
      const result = await api.allocate({ sessionId, staffId: staff.id })
      setAllocations(prev => [...prev.filter(a => a.session.id !== sessionId), result])
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'ALLOCATED' } : s))
      setOccurrencePickerId(null)
    } catch (err: any) {
      console.error(err)
      setAllocateError(err?.message || 'Could not allocate that tutor to this session.')
    } finally {
      setOccurrenceBusyId(null)
    }
  }

  const handleSelfAssignOccurrence = async (sessionId: number) => {
    setAllocateError('')
    setOccurrenceBusyId(sessionId)
    try {
      const result = await api.selfAssign({ sessionId, coordinatorName, coordinatorEmail })
      setAllocations(prev => [...prev.filter(a => a.session.id !== sessionId), result])
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'ALLOCATED' } : s))
      setOccurrencePickerId(null)
    } catch (err: any) {
      console.error(err)
      setAllocateError(err?.message || 'Could not self-assign this session.')
    } finally {
      setOccurrenceBusyId(null)
    }
  }

  const openDraft = () => {
    setDraftEntries(buildDraft(sessionGroups, respondedTutors, availabilitySlots))
    setShowDraft(true)
  }

  const toggleDraftAccept = (idx: number) => {
    setDraftEntries(prev => prev.map((e, i) => i === idx ? { ...e, accepted: !e.accepted } : e))
  }

  const applyDraft = async () => {
    setApplyingDraft(true)
    try {
      for (const entry of draftEntries) {
        if (!entry.accepted || !entry.tutor) continue
        const allocatable = entry.group.sessions.filter(
          s => !(s.unavailableStaffIds ?? []).includes(entry.tutor!.id)
        )
        if (allocatable.length === 0) continue
        const results = await Promise.all(
          allocatable.map(s => api.allocate({ sessionId: s.id, staffId: entry.tutor!.id }))
        )
        const ids = new Set(allocatable.map(s => s.id))
        setAllocations(prev => [...prev.filter(a => !ids.has(a.session.id)), ...results])
        setSessions(prev => prev.map(s => ids.has(s.id) ? { ...s, status: 'ALLOCATED' } : s))
      }
      setShowDraft(false)
    } catch (err) {
      console.error(err)
    } finally {
      setApplyingDraft(false)
    }
  }

  const openSearch = (group: SessionGroup) => {
    setSearchGroup(group)
    setSearchQuery('')
    setRequestError('')
  }
  const closeSearch = () => setSearchGroup(null)

  const filteredSearchStaff = allStaff.filter(s => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
  })

  const handleSendRequest = async (staff: StaffUser) => {
    if (!selectedUnit || !searchGroup) return
    setRequestError('');

    // Lectures are request-only — no standing unit invitation gets sent,
    // just a direct ask for this specific slot. There's no backend
    // endpoint for a request that isn't a full unit invitation, so this
    // is tracked locally only (it won't show up under Invited Tutors,
    // and the tutor won't gain access to the rest of the unit from it).
    if (isLecture(searchGroup.title)) {
      setRequestedPairs(prev => new Set(prev).add(`${searchGroup.key}-${staff.id}`))
      return
    }

    try {
      // Sends a real unit invitation — the closest thing the backend has
      // today to "request this tutor for a session". There's no endpoint
      // to scope a request to one specific session or group, so this
      // invites them to the unit as a whole; once they respond they'll
      // show up as a candidate for every group in it, same as any other
      // tutor.
      await api.inviteStaff(selectedUnit.id, staff.id)
      setRequestedPairs(prev => new Set(prev).add(`${searchGroup.key}-${staff.id}`))
      const invites = await api.getUnitInvitations(selectedUnit.id)
      setInvitations(invites)
    } catch (err: any) {
      console.error(err)
      setRequestError(err?.message || 'Could not send that request — they may already be invited.')
    }
  }

  return (
    <div className="dashboard-page">
      <CoordinatorSidebar />
      <main className="main-content">
        <div className="allocations-page">
          {!selectedUnit && (
            <>
              <div className="my-units-header">
                <div>
                  <h1>Allocations</h1>
                  <p>Select a unit to assign tutors to its sessions</p>
                </div>
              </div>

              {loadingUnits && <p className="avail-range-hint">Loading units...</p>}

              {!loadingUnits && units.length === 0 && (
                <div className="empty-state">
                  <p>No units yet. Create one under <strong>My Units</strong> first, then come back here to allocate tutors.</p>
                </div>
              )}

              <div className="units-list">
                {units.map(unit => (
                  <div key={unit.id} className="unit-row">
                    <div className="unit-row-left">
                      <div className="unit-code-badge">{unit.code}</div>
                      <div className="unit-row-info">
                        <h3>{unit.name}</h3>
                        <span className="unit-meta">{unit.semester}</span>
                      </div>
                    </div>
                    <div className="unit-row-actions">
                      <button className="manage-btn" onClick={() => loadUnitDetail(unit)}>Allocate →</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {selectedUnit && (
            <>
              <div className="my-units-header">
                <div>
                  <button type="button" className="cancel-btn allocation-back-btn" onClick={backToUnits}>
                    ← Back to Units
                  </button>
                  <h1>{selectedUnit.code} — Allocations</h1>
                  <p>
                    {sessionGroups.length} allocation card{sessionGroups.length !== 1 ? 's' : ''}
                    {sessionGroups.length !== sessions.length &&
                      ` (${sessions.length} sessions grouped by class type, campus, room, day & time)`}
                    {' '}· {respondedTutors.length} tutor{respondedTutors.length !== 1 ? 's' : ''} have
                    submitted availability for this unit
                  </p>
                </div>
                {sessionGroups.length > 0 && (
                  <button type="button" className="auto-allocate-btn" onClick={openDraft}>
                    Auto Allocate
                  </button>
                )}
              </div>

              <p className="avail-range-hint" style={{ marginBottom: '16px' }}>
                Sessions with the same class type, campus, room, day and time are grouped into a
                single card — assigning a tutor there assigns them to every session in that group.
                Tutors who've submitted availability for this unit are shown as candidates on every
                card, since availability isn't tracked per individual session yet. If nobody's
                available, search for and request any other tutor.
              </p>

              {allocateError && <p className="avail-error-message" style={{ marginBottom: '12px' }}>{allocateError}</p>}

              {loadingDetail && <p className="avail-range-hint">Loading sessions...</p>}

              {!loadingDetail && sessions.length === 0 && (
                <div className="empty-info">No sessions in this unit yet — add some under My Units first.</div>
              )}

              <div className="sessions-grid">
                {sessionGroups.map(group => {
                  // A group counts as "assigned" only when every session inside
                  // it is allocated to the SAME tutor — that's what this page
                  // guarantees going forward (see handleAllocate), but a group
                  // could still be partially/mixed if sessions were allocated
                  // individually before this grouping existed.
                  const groupAllocations = group.sessions.map(s => allocations.find(a => a.session.id === s.id))
                  const groupAvailableTutors = tutorsAvailableForGroup(availabilitySlots, respondedTutors, group)
                  const firstStaff = groupAllocations[0]?.staff
                  const fullyAssigned = firstStaff != null && groupAllocations.every(a => a?.staff.id === firstStaff.id)
                  const partiallyAssigned = !fullyAssigned && groupAllocations.some(a => a)

                  const isReassigning = reassigningKey === group.key
                  const showCandidates = (!fullyAssigned && !partiallyAssigned) || isReassigning

                  // One entry per distinct tutor currently covering this
                  // group — used when dates are assigned per-occurrence
                  // rather than all to the same tutor.
                  const distinctAssignedStaff = Array.from(
                    new Map(
                      groupAllocations
                        .filter((a): a is AllocationInfo => !!a)
                        .map(a => [a.staff.id, a.staff])
                    ).values()
                  )

                  const isMulti = group.sessions.length > 1
                  const isExpanded = isMulti && expandedGroups.has(group.key)
                  const isAllocating = allocatingKey === group.key

                  return (
                    <div
                      key={group.key}
                      className={`session-card allocation-card session-group-card ${isExpanded ? 'expanded' : ''}`}
                    >
                      <div className="session-card-main">
                        <div className="session-card-top">
                          <span className={`mode-badge ${group.mode}`}>{modeLabel(group.mode)}</span>
                          {isMulti ? (
                            <button
                              type="button"
                              className="session-group-count"
                              onClick={() => toggleGroupExpanded(group.key)}
                            >
                              {group.sessions.length} sessions
                              <span className={`session-group-chevron ${isExpanded ? 'open' : ''}`}>▾</span>
                            </button>
                          ) : (
                            <span className={`status-badge ${sessionStatusMeta(group.sessions[0].status).className}`}>
                              {sessionStatusMeta(group.sessions[0].status).icon} {sessionStatusMeta(group.sessions[0].status).label}
                            </span>
                          )}
                        </div>
                        <div className="session-day">{group.title}</div>
                        <div className="session-time">
                          {DAY_NAMES[group.dayOfWeek]}s, {group.timeLabel}
                          {group.endTimeLabel && ` – ${group.endTimeLabel}`}
                        </div>
                        {group.location && <div className="session-location">{group.location}</div>}
                        {isMulti && (
                          <div className="session-time session-group-range">
                            {new Date(group.sessions[0].startTime).toLocaleDateString()} –{' '}
                            {new Date(group.sessions[group.sessions.length - 1].startTime).toLocaleDateString()}
                          </div>
                        )}

                        {partiallyAssigned && !isReassigning && (
                          <div className="allocation-assigned allocation-assigned-mixed">
                            <div className="allocation-assigned-name">Assigned per session</div>
                            {distinctAssignedStaff.map(st => (
                              <div key={st.id} className="allocation-assigned-mixed-row">
                                <span className="allocation-assigned-name">
                                  {st.id === SELF_ASSIGN_STAFF_ID ? `🙋 ${st.fullName} (You)` : st.fullName}
                                </span>
                                <span className="allocation-assigned-email">
                                  {st.id === SELF_ASSIGN_STAFF_ID ? 'Self-assigned' : st.email}
                                </span>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="session-edit-btn"
                              onClick={() => setReassigningKey(group.key)}
                            >
                              Reassign whole group
                            </button>
                          </div>
                        )}

                        {fullyAssigned && !isReassigning && (
                          <div className={`allocation-assigned ${firstStaff!.id === SELF_ASSIGN_STAFF_ID ? 'self' : ''}`}>
                            {firstStaff!.id === SELF_ASSIGN_STAFF_ID ? (
                              <>
                                <div className="allocation-assigned-name">🙋 {firstStaff!.fullName} (You)</div>
                                <div className="allocation-assigned-email">Self-assigned</div>
                              </>
                            ) : (
                              <>
                                <div className="allocation-assigned-name">{firstStaff!.fullName}</div>
                                <div className="allocation-assigned-email">{firstStaff!.email}</div>
                              </>
                            )}
                            <button
                              type="button"
                              className="session-edit-btn"
                              onClick={() => setReassigningKey(group.key)}
                            >
                              Reassign
                            </button>
                          </div>
                        )}

                        {showCandidates && (
                          <div className="allocation-candidates">
                            <button
                              type="button"
                              className="allocation-self-assign-btn"
                              disabled={isAllocating}
                              onClick={() => handleSelfAssign(group)}
                            >
                              {isAllocating ? 'Assigning...' : '🙋 Assign Myself'}
                            </button>

                            {groupAvailableTutors.length > 0 ? (
                              <>
                                <p className="allocation-candidates-label">Available tutors:</p>
                                <div className="allocation-candidates-list">
                                  {groupAvailableTutors.map(t => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      className="allocation-candidate-btn"
                                      disabled={isAllocating}
                                      onClick={() => handleAllocate(group, t)}
                                    >
                                      {isAllocating ? 'Assigning...' : t.fullName}
                                    </button>
                                  ))}
                                </div>
                              </>
                            ) : respondedTutors.length > 0 ? (
                              <p className="allocation-empty-hint">
                                {respondedTutors.length} tutor{respondedTutors.length !== 1 ? 's' : ''} submitted availability for this unit, but none are free at this day/time.
                              </p>
                            ) : (
                              <p className="allocation-empty-hint">
                                No tutor has submitted availability for this unit yet.
                              </p>
                            )}

                            <div className="allocation-candidates-footer">
                              <button
                                type="button"
                                className="allocation-search-btn"
                                onClick={() => openSearch(group)}
                              >
                                {isLecture(group.title) ? '📨 Request a Tutor' : '🔍 Find & Request a Tutor'}
                              </button>
                              {isReassigning && (
                                <button
                                  type="button"
                                  className="cancel-btn"
                                  onClick={() => setReassigningKey(null)}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                            {isLecture(group.title) && (
                              <p className="allocation-lecture-hint">
                                Lectures are request-only — no standing invitation is sent.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="session-group-body">
                          {group.sessions.map(s => {
                            const a = allocations.find(al => al.session.id === s.id)
                            const pickerOpen = occurrencePickerId === s.id
                            const isBusy = occurrenceBusyId === s.id
                            const occurrenceAvailableTutors = tutorsAvailableForSession(availabilitySlots, respondedTutors, group, s)
                            return (
                              <div key={s.id} className="session-occurrence-row-wrap">
                                <div className="session-occurrence-row">
                                  <span className="session-occurrence-date">
                                    {new Date(s.startTime).toLocaleDateString(undefined, {
                                      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                                    })}
                                  </span>
                                  <span className={`status-badge ${a ? 'allocated' : 'pending'} session-occurrence-status`}>
                                    {a ? `✓ ${a.staff.fullName}` : '⏳ Pending'}
                                  </span>
                                  <button
                                    type="button"
                                    className="session-edit-btn"
                                    onClick={() => setOccurrencePickerId(pickerOpen ? null : s.id)}
                                  >
                                    {a ? 'Reassign' : 'Assign'}
                                  </button>
                                </div>

                                {pickerOpen && (
                                  <div className="allocation-candidates occurrence-candidates">
                                    <button
                                      type="button"
                                      className="allocation-self-assign-btn"
                                      disabled={isBusy}
                                      onClick={() => handleSelfAssignOccurrence(s.id)}
                                    >
                                      {isBusy ? 'Assigning...' : '🙋 Assign Myself'}
                                    </button>
                                    {occurrenceAvailableTutors.length > 0 ? (
                                      <div className="allocation-candidates-list">
                                        {occurrenceAvailableTutors.map(t => (
                                          <button
                                            key={t.id}
                                            type="button"
                                            className="allocation-candidate-btn"
                                            disabled={isBusy}
                                            onClick={() => handleAllocateOccurrence(s.id, t)}
                                          >
                                            {isBusy ? 'Assigning...' : t.fullName}
                                          </button>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="allocation-empty-hint">
                                        {respondedTutors.length > 0
                                          ? 'None of the tutors who responded are free for this specific date.'
                                          : 'No tutor has submitted availability for this unit yet.'}
                                      </p>
                                    )}
                                    <button type="button" className="cancel-btn" onClick={() => setOccurrencePickerId(null)}>Cancel</button>
                                  </div>
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
            </>
          )}
        </div>
      </main>

      {/* Auto-allocation draft modal */}
      {showDraft && (
        <div className="modal-overlay" onClick={() => !applyingDraft && setShowDraft(false)}>
          <div className="modal auto-alloc-modal" onClick={e => e.stopPropagation()}>
            <h2>Smart Draft Allocation</h2>
            <p className="modal-sub">
              The system matched tutors to sessions based on their availability and workload.
              Review and toggle each suggestion before applying.
            </p>

            {respondedTutors.length === 0 ? (
              <div className="auto-alloc-empty">
                <p>No tutors have submitted availability for this unit yet.</p>
                <p>Invite tutors and ask them to submit availability first.</p>
              </div>
            ) : (
              <>
                <div className="auto-alloc-stats">
                  <span className="auto-alloc-stat matched">
                    {draftEntries.filter(e => e.tutor && e.accepted).length} matched
                  </span>
                  <span className="auto-alloc-stat skipped">
                    {draftEntries.filter(e => !e.accepted).length} skipped
                  </span>
                  {draftEntries.some(e => !e.tutor) && (
                    <span className="auto-alloc-stat unmatched">
                      {draftEntries.filter(e => !e.tutor).length} unmatched
                    </span>
                  )}
                </div>

                <div className="auto-alloc-list">
                  {draftEntries.map((entry, idx) => (
                    <div
                      key={entry.group.key}
                      className={`auto-alloc-row ${!entry.accepted ? 'skipped' : ''} ${!entry.tutor ? 'unmatched' : ''}`}
                    >
                      <div className="auto-alloc-session">
                        <span className="auto-alloc-session-title">{entry.group.title}</span>
                        <span className="auto-alloc-session-time">
                          {DAY_NAMES[entry.group.dayOfWeek]}s · {entry.group.timeLabel}
                        </span>
                        <span className="auto-alloc-session-count">
                          {entry.group.sessions.length} session{entry.group.sessions.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <span className="auto-alloc-arrow">→</span>

                      <div className="auto-alloc-tutor">
                        {entry.tutor ? (
                          <>
                            <span className="auto-alloc-tutor-name">{entry.tutor.fullName}</span>
                            <span className={`auto-alloc-match-badge ${entry.matchType}`}>
                              {entry.matchType === 'availability' ? 'Availability match' : 'Load balanced'}
                            </span>
                          </>
                        ) : (
                          <span className="auto-alloc-no-match">No tutor available</span>
                        )}
                      </div>

                      {entry.tutor && (
                        <button
                          type="button"
                          className={`auto-alloc-toggle ${entry.accepted ? 'accepted' : 'rejected'}`}
                          onClick={() => toggleDraftAccept(idx)}
                        >
                          {entry.accepted ? 'Include' : 'Skip'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="modal-actions">
              {respondedTutors.length > 0 && (
                <button
                  type="button"
                  className="confirm-btn"
                  disabled={applyingDraft || draftEntries.every(e => !e.accepted || !e.tutor)}
                  onClick={applyDraft}
                >
                  {applyingDraft
                    ? 'Applying...'
                    : `Apply ${draftEntries.filter(e => e.accepted && e.tutor).length} Allocation${draftEntries.filter(e => e.accepted && e.tutor).length !== 1 ? 's' : ''}`
                  }
                </button>
              )}
              <button type="button" className="cancel-btn" disabled={applyingDraft} onClick={() => setShowDraft(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Request modal — for groups with no responded tutors */}
      {searchGroup && (
        <div className="modal-overlay" onClick={closeSearch}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Find a Tutor</h2>
            <p className="modal-sub">
              Search for any tutor and send them a request to take <strong>{searchGroup.title}</strong>
              {' '}({DAY_NAMES[searchGroup.dayOfWeek]}s, {searchGroup.timeLabel}
              {searchGroup.sessions.length > 1 ? `, ${searchGroup.sessions.length} sessions` : ''}).
              {isLecture(searchGroup.title) ? (
                <> This sends a direct request only — it won't invite them to the unit or give
                  them access to submit availability for it.</>
              ) : (
                <> This invites them to the unit — once they respond with availability, they'll
                  show up as a candidate here.</>
              )}
            </p>

            <div className="form-field">
              <label>Search by name or email</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Priya"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {requestError && <p className="avail-error-message">{requestError}</p>}

            <div className="allocation-search-results">
              {filteredSearchStaff.length === 0 && (
                <p className="empty-info">No tutors match your search.</p>
              )}
              {filteredSearchStaff.map(s => {
                const key = `${searchGroup.key}-${s.id}`
                const alreadyInvited = invitations.some(inv => inv.staff.id === s.id)
                const requested = requestedPairs.has(key)
                return (
                  <div key={s.id} className="allocation-search-row">
                    <div>
                      <strong>{s.fullName}</strong>
                      <span>{s.email}</span>
                    </div>
                    {requested || alreadyInvited ? (
                      <span className="status-badge pending">
                        {alreadyInvited && !requested ? 'Already Invited' : 'Request Sent'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="confirm-btn"
                        onClick={() => handleSendRequest(s)}
                      >
                        Send Request
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={closeSearch}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
