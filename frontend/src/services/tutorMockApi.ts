// TEMPORARY — for testing the full Tutor flow (Dashboard, My Units,
// Calendar, submitting availability) without a real backend running and
// without needing a valid login token.
// Delete this file once you're done testing, or just stop importing it.
//
// This is deliberately a SEPARATE, self-contained mock from
// coordinatorMockApi.ts — it has its own in-memory data and does not
// read or write anything the coordinator mock touches. That means
// actions on the two mocks don't reflect each other (e.g. inviting a
// tutor in the coordinator mock won't make them show up here, and
// submitting availability here won't show up in the coordinator mock's
// "Invited Tutors" list). Both are purely for exercising each role's UI
// in isolation. If you need the two to actually talk to each other,
// that's a bigger refactor (sharing one in-memory store) — ask for it
// separately.
//
// The mock "logs you in" as a fixed tutor — James Wilson — since every
// real endpoint here (getMyInvitations, getMyAvailability, etc.) infers
// "who's asking" from an auth token rather than taking an id param.
//
// Seed data below is deliberately built to exercise every state at once,
// all visible on today's calendar month (no need to page forward/back):
//   - a PENDING invitation with unsubmitted classes (blue "Invitation
//     received" events)
//   - an ALLOCATED class with a matching submitted slot (green
//     "Availability submitted", proving color follows submission, not
//     allocation, status)
//   - a PENDING (not yet allocated) class that's ALSO been submitted for
//     (same green color, different underlying state)
//   - a submitted slot with no matching class at all, for a unit you ARE
//     invited to (teal "Additional availability" — clicking it goes to
//     that unit's page)
//   - a submitted slot for a unit you're NOT invited to (same teal color,
//     but clicking it falls back to opening the Availability modal
//     directly, since there's no unit page for it)
//   - CAB204, a unit with two OVERLAPPING sessions (Monday 9–11am and
//     Monday 10am–12pm) plus one non-overlapping one (Wednesday 5–6pm),
//     for testing that selecting one of the two clashing sessions
//     disables the other — see "Scheduled Classes" in TutorMyUnits.tsx
//   - CAB201's Tutorial is a proper 4-week recurring series (same day,
//     time, campus, room and class type each week) with one date marked
//     HOLIDAY — for testing the session-group summary in "Scheduled
//     Classes": First Class Date, End Date, Total Number of Sessions
//     (which excludes the holiday date), and the Holidays list itself.

interface MockUnit {
  id: number
  code: string
  name: string
  semester: string
  coordinator: { fullName: string }
}

interface MockStaff {
  id: number
  fullName: string
  email: string
}

interface MockInvitation {
  id: number
  unit: MockUnit
  staff: MockStaff
  status: 'PENDING' | 'RESPONDED'
}

interface MockSession {
  id: number
  title: string
  startTime: string
  endTime: string
  location: string
  status: string
  unit: { id: number }
}

interface MockAvailability {
  id: number
  unit: { id: number; code: string; name: string }
  startTime: string
  endTime: string
}

interface MockAllocation {
  id: number
  status: string
  session: MockSession
}

// "You" for every call below.
const ME: MockStaff = { id: 3, fullName: 'James Wilson', email: 'j.wilson@outlook.com' }

let nextInvitationId = 1
let nextAvailabilityId = 1
let nextAllocationId = 1
let nextSessionId = 9001 // high range so ids never collide with coordinatorMockApi's own counters

// ── Seed units ──────────────────────────────────────────────────────────
const unitCAB201: MockUnit = {
  id: 9201, code: 'CAB201', name: 'Programming Principles',
  semester: 'Semester 2, 2026', coordinator: { fullName: 'Dr. Sarah Mitchell' },
}
const unitIFB398: MockUnit = {
  id: 9202, code: 'IFB398', name: 'IT Capstone Project',
  semester: 'Semester 2, 2026', coordinator: { fullName: 'Dr. Michael Chen' },
}
const unitCAB302: MockUnit = {
  id: 9203, code: 'CAB302', name: 'Database Systems',
  semester: 'Semester 2, 2026', coordinator: { fullName: 'Dr. Sarah Mitchell' },
}
const unitCAB204: MockUnit = {
  id: 9204, code: 'CAB204', name: 'Software Testing',
  semester: 'Semester 2, 2026', coordinator: { fullName: 'Dr. Michael Chen' },
}

let mockInvitations: MockInvitation[] = [
  { id: nextInvitationId++, unit: unitCAB201, staff: ME, status: 'PENDING' },
  { id: nextInvitationId++, unit: unitIFB398, staff: ME, status: 'RESPONDED' },
  { id: nextInvitationId++, unit: unitCAB302, staff: ME, status: 'RESPONDED' },
  { id: nextInvitationId++, unit: unitCAB204, staff: ME, status: 'RESPONDED' },
]

const mockSessionsByUnit: Record<number, MockSession[]> = {
  [unitCAB201.id]: [
    { id: nextSessionId++, title: 'Tutorial', startTime: '2026-08-25T10:00:00', endTime: '2026-08-25T11:00:00', location: 'Gardens Point - Block P, Room 404', status: 'PENDING', unit: { id: unitCAB201.id } },
    { id: nextSessionId++, title: 'Tutorial', startTime: '2026-09-01T10:00:00', endTime: '2026-09-01T11:00:00', location: 'Gardens Point - Block P, Room 404', status: 'PENDING', unit: { id: unitCAB201.id } },
    // Marked as a holiday by the coordinator — no class actually runs
    // this week. Note: this is seeded directly here rather than coming
    // from the coordinator mock, since holiday marks there are local-only
    // to that page and were never wired to persist anywhere the tutor
    // side could read from — see the note in CoordinatorUnitDetailView.tsx.
    { id: nextSessionId++, title: 'Tutorial', startTime: '2026-09-08T10:00:00', endTime: '2026-09-08T11:00:00', location: 'Gardens Point - Block P, Room 404', status: 'HOLIDAY', unit: { id: unitCAB201.id } },
    { id: nextSessionId++, title: 'Tutorial', startTime: '2026-09-15T10:00:00', endTime: '2026-09-15T11:00:00', location: 'Gardens Point - Block P, Room 404', status: 'PENDING', unit: { id: unitCAB201.id } },
  ],
  [unitIFB398.id]: [
    { id: nextSessionId++, title: 'Practical', startTime: '2026-08-26T13:00:00', endTime: '2026-08-26T14:00:00', location: 'Gardens Point - Block S, Room 209', status: 'ALLOCATED', unit: { id: unitIFB398.id } },
    { id: nextSessionId++, title: 'Practical', startTime: '2026-09-02T13:00:00', endTime: '2026-09-02T14:00:00', location: 'Gardens Point - Block S, Room 209', status: 'ALLOCATED', unit: { id: unitIFB398.id } },
    { id: nextSessionId++, title: 'Practical', startTime: '2026-09-09T13:00:00', endTime: '2026-09-09T14:00:00', location: 'Gardens Point - Block S, Room 209', status: 'PENDING', unit: { id: unitIFB398.id } },
  ],
  [unitCAB302.id]: [
    { id: nextSessionId++, title: 'Tutorial', startTime: '2026-08-27T11:00:00', endTime: '2026-08-27T12:00:00', location: 'Kelvin Grove - Block D, Room 301', status: 'PENDING', unit: { id: unitCAB302.id } },
  ],
  // Matches the exact example used to design the "select which session(s)
  // you'll take, can't select two that overlap" feature: two Monday
  // sessions that clash, plus one Wednesday session that doesn't.
  [unitCAB204.id]: [
    { id: nextSessionId++, title: 'Tutorial', startTime: '2026-08-24T09:00:00', endTime: '2026-08-24T11:00:00', location: 'Gardens Point - Block G, Room 202', status: 'PENDING', unit: { id: unitCAB204.id } },
    { id: nextSessionId++, title: 'Tutorial', startTime: '2026-08-24T10:00:00', endTime: '2026-08-24T12:00:00', location: 'Kelvin Grove - Block V, Room 101', status: 'PENDING', unit: { id: unitCAB204.id } },
    { id: nextSessionId++, title: 'Workshop', startTime: '2026-08-26T17:00:00', endTime: '2026-08-26T18:00:00', location: 'Gardens Point - Block P, Room 401', status: 'PENDING', unit: { id: unitCAB204.id } },
  ],
}

let mockAvailability: MockAvailability[] = [
  // Matches IFB398's first ALLOCATED session exactly → that class shows
  // green "Availability submitted" instead of blue "Invitation received".
  { id: nextAvailabilityId++, unit: { id: unitIFB398.id, code: unitIFB398.code, name: unitIFB398.name }, startTime: '2026-08-26T13:00:00', endTime: '2026-08-26T14:00:00' },
  // Matches CAB302's only (PENDING, unallocated) session exactly — same
  // green color works for a class that hasn't been allocated to anyone.
  { id: nextAvailabilityId++, unit: { id: unitCAB302.id, code: unitCAB302.code, name: unitCAB302.name }, startTime: '2026-08-27T11:00:00', endTime: '2026-08-27T12:00:00' },
  // Doesn't match any scheduled class in IFB398 — shows as its own teal
  // "Additional availability" entry; clicking it goes to IFB398's page.
  { id: nextAvailabilityId++, unit: { id: unitIFB398.id, code: unitIFB398.code, name: unitIFB398.name }, startTime: '2026-08-28T09:00:00', endTime: '2026-08-28T10:00:00' },
  // For a unit you're NOT invited to at all — simulates "availability
  // submitted for classes outside their assigned units". Clicking this
  // one falls back to opening the Availability modal directly, since
  // there's no unit page to land on.
  { id: nextAvailabilityId++, unit: { id: 9299, code: 'MXB103', name: 'Business Analytics (not one of your invited units)' }, startTime: '2026-08-29T15:00:00', endTime: '2026-08-29T16:00:00' },
]

// The two "ALLOCATED" sessions above (in IFB398) are allocated to ME —
// this list is what makes them show up under "My Sessions" and on the
// dashboard's Allocated Classes stat.
let mockAllocations: MockAllocation[] = [
  { id: nextAllocationId++, status: 'CONFIRMED', session: mockSessionsByUnit[unitIFB398.id][0] },
  { id: nextAllocationId++, status: 'CONFIRMED', session: mockSessionsByUnit[unitIFB398.id][1] },
]

export const tutorMockApi = {
  getMyInvitations: async () => {
    console.log('[TUTOR MOCK] getMyInvitations')
    return mockInvitations
  },

  removeInvitation: async (unitId: number, staffId: number) => {
    console.log('[TUTOR MOCK] removeInvitation (decline)', { unitId, staffId })
    mockInvitations = mockInvitations.filter(inv => inv.unit.id !== unitId)
    return {}
  },

  // FIX: previously "Accept" only flipped local component state in
  // TutorMyUnits.tsx — nothing was actually recorded, so navigating away
  // and back (or refreshing) landed you right back at the Accept/Decline
  // prompt even though your intent hadn't changed. This is the one real
  // signal that durably marks an invitation RESPONDED — same value the
  // coordinator's "Invited Tutors" list reads as Responded, so clicking
  // Accept here and seeing "Responded" over there now actually agree.
  // (Submitting a class/availability slot still also implies acceptance,
  // same as before — this just gives Accept its own real effect too,
  // instead of being the only thing that silently did nothing.)
  acceptInvitation: async (unitId: number) => {
    console.log('[TUTOR MOCK] acceptInvitation', unitId)
    const invite = mockInvitations.find(inv => inv.unit.id === unitId)
    if (!invite) throw new Error('Invitation not found')
    mockInvitations = mockInvitations.map(inv =>
      inv.unit.id === unitId ? { ...inv, status: 'RESPONDED' } : inv
    )
    return invite
  },

  getSessions: async (unitId: number) => {
    console.log('[TUTOR MOCK] getSessions for unit', unitId)
    const sessions = mockSessionsByUnit[unitId] ?? []
    // Attach tutorName for sessions allocated to ME, purely so the
    // Calendar page's "My Sessions" unit filter (which matches on
    // tutorName) has something real to match against — the actual
    // backend session DTO doesn't send this today either, so treat it
    // as a mock-only nicety rather than something to rely on elsewhere.
    const myAllocatedSessionIds = new Set(mockAllocations.map(a => a.session.id))
    return sessions.map(s => myAllocatedSessionIds.has(s.id) ? { ...s, tutorName: ME.fullName } : s)
  },

  getMyAvailability: async () => {
    console.log('[TUTOR MOCK] getMyAvailability')
    return mockAvailability
  },

  submitAvailability: async (data: { unitId: number; startTime: string; endTime: string }) => {
    console.log('[TUTOR MOCK] submitAvailability', data)
    const invite = mockInvitations.find(inv => inv.unit.id === data.unitId)
    const unit = invite?.unit
    const newSlot: MockAvailability = {
      id: nextAvailabilityId++,
      unit: unit ? { id: unit.id, code: unit.code, name: unit.name } : { id: data.unitId, code: '', name: '' },
      startTime: data.startTime,
      endTime: data.endTime,
    }
    mockAvailability = [...mockAvailability, newSlot]
    // Matches the real backend's documented behaviour (see the comment
    // in TutorMyUnits.tsx): an invitation flips PENDING → RESPONDED the
    // moment the tutor submits ANY availability for that unit.
    if (invite && invite.status === 'PENDING') {
      mockInvitations = mockInvitations.map(inv =>
        inv.unit.id === data.unitId ? { ...inv, status: 'RESPONDED' } : inv
      )
    }
    return newSlot
  },

  getMyAllocations: async (staffId: number) => {
    console.log('[TUTOR MOCK] getMyAllocations', staffId)
    if (staffId !== ME.id) return []
    return mockAllocations
  },
}
