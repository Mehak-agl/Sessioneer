const BASE_URL = 'http://localhost:8080/api'

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

export const api = {
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
}