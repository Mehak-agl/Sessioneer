// TEMPORARY — for testing the full Coordinator flow (My Units, Unit
// Detail, Add Session, Calendar, Import Tutors) without a real backend
// running and without needing a valid login token.
// Delete this file once you're done testing, or just stop importing it.

let nextUnitId = 101
let nextSessionId = 1
let nextInvitationId = 1

interface MockUnit {
  id: number
  code: string
  name: string
  semester: string
}

interface MockSession {
  id: number
  title: string
  startTime: string
  // Real duration now flows through from AddSessionForm (see the note
  // there) instead of every consumer having to assume a flat 1 hour.
  // Optional so old callers/tests that don't pass it still type-check.
  endTime?: string
  location: string
  status: string
  // Staff ids who've flagged themselves as unable to teach this specific
  // dated session — the display surface the coordinator side was
  // missing entirely. There's still no real link to the Tutor mock's own
  // "Mark I'm Unavailable" (see markStaffUnavailableForSession below for
  // why), so this only ever gets populated by that simulate action.
  unavailableStaffIds?: number[]
}

interface MockStaff {
  id: number
  fullName: string
  email: string
}

interface MockInvitation {
  id: number
  unit: { id: number }
  staff: MockStaff
  status: 'PENDING' | 'RESPONDED'
}

interface MockAllocation {
  id: number
  status: string
  session: MockSession & { unit: { id: number } }
  staff: MockStaff
}

// Starts empty on purpose — lets you see the real "No units yet" empty
// state first, then watch units actually appear as you create them.
let mockUnits: MockUnit[] = []

const mockSessionsByUnit: Record<number, MockSession[]> = {}
const mockInvitationsByUnit: Record<number, MockInvitation[]> = {}
const mockAllocationsByUnit: Record<number, MockAllocation[]> = {}

// Fixed pool of tutors available to invite/import.
let mockStaff: MockStaff[] = [
  { id: 1, fullName: 'Alex Thompson', email: 'alex.thompson@gmail.com' },
  { id: 2, fullName: 'Priya Sharma', email: 'priya.sharma@gmail.com' },
  { id: 3, fullName: 'James Wilson', email: 'j.wilson@outlook.com' },
  { id: 4, fullName: 'Emily Chen', email: 'emily.chen@gmail.com' },
  { id: 5, fullName: 'Rohit Patel', email: 'rohit.patel@gmail.com' },
]
let nextStaffId = 6

export const coordinatorMockApi = {
  // ── Units ──────────────────────────────────────────────────────────
  getUnits: async () => {
    console.log('[MOCK] getUnits')
    return mockUnits
  },

  createUnit: async (data: { code: string; name: string; semester: string }) => {
    console.log('[MOCK] createUnit', data)
    const newUnit: MockUnit = { id: nextUnitId++, ...data }
    mockUnits = [...mockUnits, newUnit]
    mockSessionsByUnit[newUnit.id] = []
    mockInvitationsByUnit[newUnit.id] = []
    mockAllocationsByUnit[newUnit.id] = []
    return newUnit
  },

  // ── Sessions ───────────────────────────────────────────────────────
  getSessions: async (unitId: number) => {
    console.log('[MOCK] getSessions for unit', unitId)
    return mockSessionsByUnit[unitId] ?? []
  },

  createSession: async (unitId: number, data: { title: string; startTime: string; endTime?: string; location: string }) => {
    console.log('[MOCK] createSession', unitId, data)
    const newSession: MockSession = { id: nextSessionId++, ...data, status: 'PENDING' }
    mockSessionsByUnit[unitId] = [...(mockSessionsByUnit[unitId] ?? []), newSession]
    return newSession
  },

  // ── Staff / Tutors ─────────────────────────────────────────────────
  getAllStaff: async () => {
    console.log('[MOCK] getAllStaff')
    return mockStaff
  },

  getUnitInvitations: async (unitId: number) => {
    console.log('[MOCK] getUnitInvitations for unit', unitId)
    return mockInvitationsByUnit[unitId] ?? []
  },

  inviteStaff: async (unitId: number, staffId: number) => {
    console.log('[MOCK] inviteStaff', { unitId, staffId })
    const staff = mockStaff.find(s => s.id === staffId)
    if (!staff) throw new Error('Staff not found')
    const existing = mockInvitationsByUnit[unitId] ?? []
    if (existing.some(inv => inv.staff.id === staffId)) throw new Error('Already invited')
    const newInvitation: MockInvitation = {
      id: nextInvitationId++,
      unit: { id: unitId },
      staff,
      status: 'PENDING',
    }
    mockInvitationsByUnit[unitId] = [...existing, newInvitation]
    return newInvitation
  },

  removeInvitation: async (unitId: number, staffId: number) => {
    console.log('[MOCK] removeInvitation', { unitId, staffId })
    mockInvitationsByUnit[unitId] = (mockInvitationsByUnit[unitId] ?? []).filter(
      inv => inv.staff.id !== staffId
    )
    return {}
  },

  // Simulates a tutor accepting their invitation and submitting
  // availability for the unit — in the real backend this happens
  // automatically the moment the tutor submits via the Calendar page
  // (their invitation flips PENDING → RESPONDED server-side). There's no
  // tutor-facing flow wired into this mock, so this lets you flip that
  // status by hand from the coordinator side to test what the Allocation
  // screen looks like once someone has responded.
  respondToInvitation: async (unitId: number, staffId: number) => {
    console.log('[MOCK] respondToInvitation (simulates tutor submitting availability)', { unitId, staffId })
    const invite = (mockInvitationsByUnit[unitId] ?? []).find(inv => inv.staff.id === staffId)
    if (!invite) throw new Error('Invitation not found')
    invite.status = 'RESPONDED'
    return invite
  },

  // A "decline" is just the invitation going away — same as
  // removeInvitation above (this is what the real Tutor "Decline"
  // button already calls). Exported under its own name too so the
  // coordinator-side testing UI can call something named for what it's
  // simulating, without it looking like a tutor-initiated remove.
  declineInvitation: async (unitId: number, staffId: number) => {
    console.log('[MOCK] declineInvitation (simulates tutor declining)', { unitId, staffId })
    mockInvitationsByUnit[unitId] = (mockInvitationsByUnit[unitId] ?? []).filter(
      inv => inv.staff.id !== staffId
    )
    return {}
  },

  // Flags (or unflags) a specific tutor as unable to teach one dated
  // session — gives the coordinator side an actual place to see "this
  // tutor said they can't do this date", which previously had nowhere to
  // render at all. NOTE: this is NOT wired to the Tutor mock's own
  // unavailableSessionIds (see tutorMockApi.ts's "Mark I'm Unavailable")
  // — the two mocks still don't share a store, so a tutor marking
  // themself unavailable over there never reaches here automatically.
  // This exists so the coordinator can simulate that signal by hand and
  // see how it looks once there's a real shared backend to wire it to.
  markStaffUnavailableForSession: async (sessionId: number, staffId: number, unavailable: boolean) => {
    console.log('[MOCK] markStaffUnavailableForSession', { sessionId, staffId, unavailable })
    for (const sessions of Object.values(mockSessionsByUnit)) {
      const session = sessions.find(s => s.id === sessionId)
      if (session) {
        const current = new Set(session.unavailableStaffIds ?? [])
        if (unavailable) current.add(staffId)
        else current.delete(staffId)
        session.unavailableStaffIds = Array.from(current)
        return session
      }
    }
    throw new Error('Session not found')
  },

  // ── Allocations (used by Calendar page + export) ──────────────────
  getUnitAllocations: async (unitId: number) => {
    console.log('[MOCK] getUnitAllocations for unit', unitId)
    return mockAllocationsByUnit[unitId] ?? []
  },

  allocate: async (data: { sessionId: number; staffId: number }) => {
    console.log('[MOCK] allocate', data)
    // finds which unit the session belongs to, so the allocation shows
    // up correctly on the Calendar page and in exports
    for (const [unitIdStr, sessions] of Object.entries(mockSessionsByUnit)) {
      const session = sessions.find(s => s.id === data.sessionId)
      if (session) {
        const unitId = Number(unitIdStr)
        const staff = mockStaff.find(s => s.id === data.staffId)
        if (!staff) throw new Error('Staff not found')
        session.status = 'ALLOCATED'
        const newAllocation: MockAllocation = {
          id: Math.floor(Math.random() * 100000),
          status: 'CONFIRMED',
          session: { ...session, unit: { id: unitId } },
          staff,
        }
        mockAllocationsByUnit[unitId] = [...(mockAllocationsByUnit[unitId] ?? []), newAllocation]
        return newAllocation
      }
    }
    throw new Error('Session not found')
  },

  // Lets a coordinator assign themself to a lecture/class instead of a
  // tutor — e.g. when they're personally covering it. There's no
  // "coordinator" entry in the tutor pool (mockStaff), so this builds a
  // lightweight synthetic staff record from whatever name/email is
  // passed in, tagged with a fixed negative id (SELF_ASSIGN_STAFF_ID)
  // that will never collide with a real staff id — real ids start at 1.
  selfAssign: async (data: { sessionId: number; coordinatorName: string; coordinatorEmail?: string }) => {
    console.log('[MOCK] selfAssign (coordinator self-assigning)', data)
    for (const [unitIdStr, sessions] of Object.entries(mockSessionsByUnit)) {
      const session = sessions.find(s => s.id === data.sessionId)
      if (session) {
        const unitId = Number(unitIdStr)
        session.status = 'ALLOCATED'
        const coordinatorStaff: MockStaff = {
          id: SELF_ASSIGN_STAFF_ID,
          fullName: data.coordinatorName,
          email: data.coordinatorEmail || 'you@sessioneer.edu',
        }
        const newAllocation: MockAllocation = {
          id: Math.floor(Math.random() * 100000),
          status: 'CONFIRMED',
          session: { ...session, unit: { id: unitId } },
          staff: coordinatorStaff,
        }
        mockAllocationsByUnit[unitId] = [
          ...(mockAllocationsByUnit[unitId] ?? []).filter(a => a.session.id !== data.sessionId),
          newAllocation,
        ]
        return newAllocation
      }
    }
    throw new Error('Session not found')
  },

  // ── Auth / Import Tutors (used by the Dashboard's bulk import modal) ──
  signup: async (data: { fullName: string; email: string; password: string; role: string }) => {
    console.log('[MOCK] signup', data)
    const existing = mockStaff.find(s => s.email.toLowerCase() === data.email.toLowerCase())
    if (existing) throw new Error('Email already registered')
    const newStaff: MockStaff = { id: nextStaffId++, fullName: data.fullName, email: data.email }
    mockStaff = [...mockStaff, newStaff]
    return { token: 'mock-token', role: data.role, fullName: data.fullName }
  },

  submitAvailability: async (data: { unitId: number; startTime: string; endTime: string }) => {
    console.log('[MOCK] submitAvailability', data)
    return { id: Math.floor(Math.random() * 100000), ...data }
  },
}

// Fixed id used to tag a coordinator's self-assignment (see selfAssign
// above) — exported so the UI can recognise/display it distinctly from
// a real tutor allocation without hardcoding the number twice.
export const SELF_ASSIGN_STAFF_ID = -1

