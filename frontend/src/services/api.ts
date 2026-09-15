import * as mockApi from './mockApi'

const BASE_URL = 'http://localhost:8080/api'

// Fixed id used to tag a coordinator's self-assignment to a session
// (as opposed to a real staff member's id, which starts at 1).
export const SELF_ASSIGN_STAFF_ID = -1

// ─────────────────────────────────────────────────────────────────────────
// Mock mode: when on, every api.* call below is served from an in-memory/
// localStorage-backed mock backend (services/mockApi.ts + mockDb.ts)
// instead of hitting the real server at BASE_URL. This lets the whole
// frontend be exercised — login, units, sessions, invitations,
// availability, allocations — without the Spring Boot backend running at
// all, and without changing anything about how the real backend works.
//
// Toggle it from the switch in the bottom-right corner of the app
// (see components/MockModeToggle.tsx), or manually via:
//   localStorage.setItem('sessioneer_mock_mode', 'true' | 'false')
// It defaults to ON so the app is testable out of the box.
// ─────────────────────────────────────────────────────────────────────────
export const MOCK_MODE_STORAGE_KEY = 'sessioneer_mock_mode'

export function isMockMode(): boolean {
  try {
    const stored = localStorage.getItem(MOCK_MODE_STORAGE_KEY)
    return stored === null ? true : stored === 'true'
  } catch {
    return true
  }
}

export function setMockMode(on: boolean) {
  try {
    localStorage.setItem(MOCK_MODE_STORAGE_KEY, on ? 'true' : 'false')
  } catch {
    // ignore — worst case the toggle doesn't persist across reloads
  }
}

function getToken() {
  return localStorage.getItem('sessioneer_token')
}

async function request(method: string, path: string, body?: object) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(error)
  }

  return res.json()
}

const realApi = {
  signup: (data: object) => request('POST', '/auth/signup', data),
  login: (data: object) => request('POST', '/auth/login', data),
  getUnits: () => request('GET', '/units'),
  createUnit: (data: object) => request('POST', '/units', data),
  getSessions: (unitId: number) => request('GET', `/units/${unitId}/sessions`),
  createSession: (unitId: number, data: object) => request('POST', `/units/${unitId}/sessions`, data),
  submitAvailability: (data: object) => request('POST', '/availability', data),
  getMyAvailability: () => request('GET', '/availability/me'),
  getUnitAvailability: (unitId: number) => request('GET', `/availability/unit/${unitId}`),
  allocate: (data: object) => request('POST', '/allocations', data),
  getUnitAllocations: (unitId: number) => request('GET', `/allocations/unit/${unitId}`),
  getMyAllocations: (staffId: number) => request('GET', `/allocations/staff/${staffId}`),
  getAllStaff: () => request('GET', '/users/staff'),
  getAllTutors: () => request('GET', '/users/tutors/reports'),
  getTutorProfile: (tutorId: number) => request('GET', `/users/tutors/${tutorId}/report`),
  inviteStaff: (unitId: number, staffId: number) => request('POST', `/units/${unitId}/invite/${staffId}`),
  getUnitInvitations: (unitId: number) => request('GET', `/units/${unitId}/invitations`),
  getMyInvitations: () => request('GET', '/invitations/me'),
  removeInvitation: (unitId: number, staffId: number) => request('DELETE', `/units/${unitId}/invite/${staffId}`),
  acceptInvitation: (unitId: number) => request('POST', `/units/${unitId}/invitations/accept`),
  respondToInvitation: (unitId: number, staffId: number) => request('POST', `/units/${unitId}/invite/${staffId}/respond`),
  declineInvitation: (unitId: number, staffId: number) => request('DELETE', `/units/${unitId}/invite/${staffId}`),
  markStaffUnavailableForSession: (sessionId: number, staffId: number, unavailable: boolean) =>
    request('POST', `/sessions/${sessionId}/unavailable/${staffId}`, { unavailable }),
  selfAssign: (data: { sessionId: number; coordinatorName: string; coordinatorEmail?: string }) =>
    request('POST', '/allocations/self-assign', data),
}

type RealApi = typeof realApi

// Delegates every call to the mock backend or the real one, decided fresh
// on every call (so flipping the toggle takes effect immediately without
// needing a reload).
function makeApi(): RealApi {
  const result = {} as RealApi
  for (const key of Object.keys(realApi) as (keyof RealApi)[]) {
    result[key] = ((...args: any[]) => {
      const impl = isMockMode() ? (mockApi as any)[key] : (realApi as any)[key]
      return impl(...args)
    }) as any
  }
  return result
}

export const api = makeApi()
