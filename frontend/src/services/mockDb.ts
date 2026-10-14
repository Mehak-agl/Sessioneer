// ─────────────────────────────────────────────────────────────────────────
// Mock database for frontend-only testing.
//
// This is a small in-memory "database" (persisted to localStorage so it
// survives refreshes) that stands in for the real Spring Boot backend.
// It is only ever used when mock mode is switched on (see api.ts /
// MockModeToggle.tsx) — no backend code is touched, and when mock mode is
// off the app talks to the real backend exactly as before.
//
// Nothing here needs to be understood to use the app — see
// MockModeToggle.tsx for the on/off switch and demo login details.
// ─────────────────────────────────────────────────────────────────────────

export type Role = 'COORDINATOR' | 'STAFF'

export interface MockUser {
  id: number
  fullName: string
  email: string
  password: string
  role: Role
}

export interface MockUnit {
  id: number
  code: string
  name: string
  semester: string
}

export interface MockSession {
  id: number
  unitId: number
  title: string
  startTime: string // ISO-ish "YYYY-MM-DDTHH:mm:00"
  endTime?: string
  location: string
  status: 'PENDING' | 'ALLOCATED'
}

export interface MockInvitation {
  id: number
  unitId: number
  staffId: number
  status: 'PENDING' | 'RESPONDED'
}

export interface MockAvailability {
  id: number
  staffId: number
  unitId: number
  startTime: string
  endTime: string
}

export interface MockAllocation {
  id: number
  sessionId: number
  staffId: number // may be SELF_ASSIGN_STAFF_ID (-1)
  status: 'ALLOCATED'
}

// ── Emergency Class Swap ────────────────────────────────────────────────
// A tutor who's already allocated a class/session can hand it off to a
// colleague without the coordinator needing to approve it — see
// pages/Tutor/TutorEmergencySwap.tsx. The coordinator is only ever told
// about it after the fact (see coordinatorNotices below).
export interface MockSwapRequest {
  id: number
  unitId: number
  scope: 'SESSION' | 'SERIES'
  sessionIds: number[]
  requestingStaffId: number
  targetStaffId: number
  reason: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED'
  createdAt: string
  respondedAt?: string
}

// Informational-only notices for the coordinator — nothing here ever
// needs a decision from them, it's purely "FYI, this happened".
export interface MockCoordinatorNotice {
  id: string
  unit: string
  title: string
  message: string
  time: string
}

export interface MockDb {
  nextId: {
    user: number
    unit: number
    session: number
    invitation: number
    availability: number
    allocation: number
    swapRequest: number
  }
  users: MockUser[]
  units: MockUnit[]
  sessions: MockSession[]
  invitations: MockInvitation[]
  availability: MockAvailability[]
  allocations: MockAllocation[]
  swapRequests: MockSwapRequest[]
  coordinatorNotices: MockCoordinatorNotice[]
  // Extra "self-assign" identities keyed by the coordinator name/email used
  // at the time — lets the Allocations page show a real name for a
  // self-assigned card instead of just "id -1".
  selfAssignIdentities: Record<string, { fullName: string; email?: string }>
}

const STORAGE_KEY = 'sessioneer_mock_db_v1'

// ── Date helpers for seed data (relative to "today" so the demo always
// looks current, regardless of when this is opened) ───────────────────
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function isoAt(date: Date, hour: number, minute: number): string {
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  return `${y}-${m}-${d}T${pad2(hour)}:${pad2(minute)}:00`
}

// Next occurrence of `weekday` (0=Sun..6=Sat) on/after `from`, then every
// 7 days after that, `count` times.
function weeklyOccurrences(from: Date, weekday: number, count: number, weeksBack = 0): Date[] {
  const start = new Date(from)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - weeksBack * 7)
  while (start.getDay() !== weekday) start.setDate(start.getDate() + 1)
  const dates: Date[] = []
  for (let i = 0; i < count; i++) {
    dates.push(new Date(start))
    start.setDate(start.getDate() + 7)
  }
  return dates
}

function buildSeed(): MockDb {
  const today = new Date()

  const users: MockUser[] = [
    { id: 1, fullName: 'Sarah Chen', email: 'coordinator@qut.edu.au', password: 'admin123', role: 'COORDINATOR' },
    { id: 2, fullName: 'Alex Thompson', email: 'staff@qut.edu.au', password: 'staff123', role: 'STAFF' },
    { id: 3, fullName: 'Priya Sharma', email: 'priya.sharma@gmail.com', password: 'staff123', role: 'STAFF' },
    { id: 4, fullName: 'James Wilson', email: 'j.wilson@outlook.com', password: 'staff123', role: 'STAFF' },
    { id: 5, fullName: 'Emily Chen', email: 'emily.chen@gmail.com', password: 'staff123', role: 'STAFF' },
    { id: 6, fullName: 'Rohit Patel', email: 'rohit.patel@gmail.com', password: 'staff123', role: 'STAFF' },
    { id: 7, fullName: 'Sarah Kim', email: 'sarah.kim@email.com', password: 'staff123', role: 'STAFF' },
    { id: 8, fullName: 'Michael Brown', email: 'm.brown@outlook.com', password: 'staff123', role: 'STAFF' },
    { id: 9, fullName: 'Jessica Lee', email: 'jessica.lee@gmail.com', password: 'staff123', role: 'STAFF' },
    { id: 10, fullName: 'David Nguyen', email: 'david.nguyen@gmail.com', password: 'staff123', role: 'STAFF' },
    { id: 11, fullName: 'Aisha Malik', email: 'aisha.malik@email.com', password: 'staff123', role: 'STAFF' },
  ]

  const units: MockUnit[] = [
    { id: 1, code: 'CAB302', name: 'Software Development', semester: 'Semester 2, 2026' },
    { id: 2, code: 'IFN660', name: 'Advanced Topics in IT', semester: 'Semester 2, 2026' },
    { id: 3, code: 'CAB301', name: 'Algorithms and Complexity', semester: 'Semester 2, 2026' },
  ]

  const sessions: MockSession[] = []
  let sessionId = 1
  const addSeries = (
    unitId: number,
    title: string,
    weekday: number,
    startHM: [number, number],
    endHM: [number, number],
    location: string,
    count: number,
    weeksBack: number,
  ) => {
    for (const date of weeklyOccurrences(today, weekday, count, weeksBack)) {
      sessions.push({
        id: sessionId++,
        unitId,
        title,
        startTime: isoAt(date, startHM[0], startHM[1]),
        endTime: isoAt(date, endHM[0], endHM[1]),
        location,
        status: 'PENDING',
      })
    }
  }

  // CAB302 — Software Development
  addSeries(1, 'Tutorial', 1, [9, 0], [11, 0], 'Gardens Point - Block P, Room P404', 6, 2)
  addSeries(1, 'Workshop', 3, [14, 0], [15, 0], 'Online', 6, 2)
  addSeries(1, 'Lecture', 5, [10, 0], [12, 0], 'Gardens Point - Block B, Room B204', 6, 2)

  // IFN660 — Advanced Topics in IT
  addSeries(2, 'Tutorial', 2, [13, 0], [14, 0], 'Online', 5, 1)
  addSeries(2, 'Practical', 4, [10, 0], [11, 0], 'Kelvin Grove - Block Y, Room Y302', 5, 1)

  // CAB301 — Algorithms and Complexity: deliberately left with no
  // sessions/tutors yet, so the "empty state" screens are testable too.

  const invitations: MockInvitation[] = [
    { id: 1, unitId: 1, staffId: 2, status: 'RESPONDED' }, // Alex Thompson
    { id: 2, unitId: 1, staffId: 3, status: 'RESPONDED' }, // Priya Sharma
    { id: 3, unitId: 1, staffId: 4, status: 'PENDING' },  // James Wilson
    { id: 4, unitId: 1, staffId: 5, status: 'RESPONDED' }, // Emily Chen
    { id: 5, unitId: 1, staffId: 6, status: 'PENDING' },  // Rohit Patel
    { id: 6, unitId: 2, staffId: 7, status: 'RESPONDED' }, // Sarah Kim
    { id: 7, unitId: 2, staffId: 8, status: 'PENDING' },  // Michael Brown
  ]

  // Availability entries for everyone who's already RESPONDED, matching
  // some of that unit's real session times so the calendars have data.
  const availability: MockAvailability[] = []
  let availId = 1
  const cab302Mon = sessions.filter(s => s.unitId === 1 && s.title === 'Tutorial')
  const cab302Wed = sessions.filter(s => s.unitId === 1 && s.title === 'Workshop')
  const ifn660Tue = sessions.filter(s => s.unitId === 2 && s.title === 'Tutorial')

  for (const s of cab302Mon.slice(0, 3)) {
    availability.push({ id: availId++, staffId: 2, unitId: 1, startTime: s.startTime, endTime: s.endTime! })
  }
  for (const s of cab302Wed.slice(0, 3)) {
    availability.push({ id: availId++, staffId: 3, unitId: 1, startTime: s.startTime, endTime: s.endTime! })
  }
  for (const s of cab302Mon.slice(0, 2)) {
    availability.push({ id: availId++, staffId: 5, unitId: 1, startTime: s.startTime, endTime: s.endTime! })
  }
  for (const s of ifn660Tue.slice(0, 2)) {
    availability.push({ id: availId++, staffId: 7, unitId: 2, startTime: s.startTime, endTime: s.endTime! })
  }

  // Pre-allocate the first couple of CAB302 Monday tutorials to Alex
  // Thompson, so the Allocations/Dashboard screens have something to show
  // immediately instead of starting completely empty.
  const allocations: MockAllocation[] = []
  let allocId = 1
  for (const s of cab302Mon.slice(0, 2)) {
    s.status = 'ALLOCATED'
    allocations.push({ id: allocId++, sessionId: s.id, staffId: 2, status: 'ALLOCATED' })
  }

  return {
    nextId: {
      user: users.length + 1,
      unit: units.length + 1,
      session: sessionId,
      invitation: invitations.length + 1,
      availability: availId,
      allocation: allocId,
      swapRequest: 1,
    },
    users,
    units,
    sessions,
    invitations,
    availability,
    allocations,
    swapRequests: [],
    coordinatorNotices: [],
    selfAssignIdentities: {},
  }
}

let cache: MockDb | null = null

function load(): MockDb {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      cache = JSON.parse(raw)
      return cache!
    }
  } catch {
    // fall through to a fresh seed
  }
  cache = buildSeed()
  persist()
  return cache
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // ignore quota errors — the in-memory cache still works for this tab
  }
}

/** Read-write handle to the mock DB. Call `save()` after mutating. */
export function getDb(): MockDb {
  return load()
}

export function saveDb() {
  persist()
}

/** Wipes all mock data and reseeds it fresh — used by the "Reset demo data" button. */
export function resetMockDb() {
  cache = buildSeed()
  persist()
}
