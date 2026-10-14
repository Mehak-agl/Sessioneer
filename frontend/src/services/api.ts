const BASE_URL = 'http://localhost:8080/api'
export const SELF_ASSIGN_STAFF_ID = 0

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

async function requestNoBody(method: string, path: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(error)
  }
}

async function requestEmptyResponse(method: string, path: string, body?: object) {
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
}

async function requestText(method: string, path: string, body?: object) {
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

  const text = await res.text()
  if (!res.ok) throw new Error(text)
  return text
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
  createTutorAccount: (data: object) => request('POST', '/users/create-tutor', data),
  getCreatedTutors: () => request('GET', '/users/created-tutors'),
  inviteStaff: (unitId: number, staffId: number) => request('POST', `/units/${unitId}/invite/${staffId}`),
  getUnitInvitations: (unitId: number) => request('GET', `/units/${unitId}/invitations`),
  getMyInvitations: () => request('GET', '/invitations/me'),
  removeInvitation: (unitId: number, staffId: number) => request('DELETE', `/units/${unitId}/invite/${staffId}`),
  sendMessage: (data: object) => request('POST', '/messages', data),
  getMessages: (userId: number) => request('GET', `/messages/with/${userId}`),
  getConversations: () => request('GET', '/messages/conversations'),
  createGroup: (data: object) => request('POST', '/groups', data),
  getMyGroups: () => request('GET', '/groups'),
  getGroupMembers: (groupId: number) => request('GET', `/groups/${groupId}/members`),
  sendGroupMessage: (groupId: number, data: object) => request('POST', `/groups/${groupId}/messages`, data),
  getGroupMessages: (groupId: number) => request('GET', `/groups/${groupId}/messages`),
  addGroupMember: (groupId: number, userId: number) => requestNoBody('POST', `/groups/${groupId}/members/${userId}`),
  removeGroupMember: (groupId: number, userId: number) => requestNoBody('DELETE', `/groups/${groupId}/members/${userId}`),
  renameGroup: (groupId: number, name: string) => request('PUT', `/groups/${groupId}/name`, { name }),
  updateGroupPermissions: (groupId: number, permissions: object) => request('PUT', `/groups/${groupId}/permissions`, permissions),
  setGroupMemberAdmin: (groupId: number, userId: number, isAdmin: boolean) => requestEmptyResponse('PUT', `/groups/${groupId}/members/${userId}/admin`, { isAdmin }),
  updateAdminPermissions: (groupId: number, userId: number, permissions: object) => requestEmptyResponse('PUT', `/groups/${groupId}/members/${userId}/admin-permissions`, permissions),
  getProfile: () => request('GET', '/profile'),
  updatePhoto: (photo: string) => request('PUT', '/profile/photo', { photo }),
  updateResume: (resumeName: string, resumeData: string, resumeType: string) => request('PUT', '/profile/resume', { resumeName, resumeData, resumeType }),
  changePassword: (currentPassword: string, newPassword: string) => requestText('PUT', '/profile/password', { currentPassword, newPassword }),
  updateNotificationEmail: (notificationEmail: string) => request('PUT', '/profile/notification-email', { notificationEmail }),
  selfAssign: (data: object) => request('POST', '/allocations/self-assign', data),
  //deleteSession: (sessionId: number) => requestNoBody('DELETE', `/units/0/sessions/${sessionId}`),
  respondToInvitation: (unitId: number, staffId: number) => requestEmptyResponse('POST', `/units/${unitId}/invite/${staffId}/respond`, {}),
  declineInvitation: (unitId: number, staffId: number) => requestNoBody('DELETE', `/units/${unitId}/invite/${staffId}`),
  markStaffUnavailableForSession: (sessionId: number, staffId: number, unavailable: boolean) => requestEmptyResponse('POST', `/sessions/${sessionId}/unavailable/${staffId}`, { unavailable }),
  //updateSession: (sessionId: number, data: object) => request('PUT', `/units/0/sessions/${sessionId}`, data),
  //updateSessionStatus: (sessionId: number, status: string) => request('PUT', `/units/0/sessions/${sessionId}/status`, { status }),
  updateSessionStatus: (sessionId: number, status: string) => request('PUT', `/sessions/${sessionId}/status`, { status }),
  deleteSession: (unitId: number, sessionId: number) => requestNoBody('DELETE', `/units/${unitId}/sessions/${sessionId}`),  
  updateSession: (unitId: number,sessionId: number, data: object) => request('PUT', `/units/${unitId}/sessions/${sessionId}`, data),
  setDeadline: (unitId: number, deadline: string) => request('PUT', `/units/${unitId}/deadline`, { deadline }),
  clearDeadline: (unitId: number) => requestNoBody('DELETE', `/units/${unitId}/deadline`),
  acceptInvitation: (unitId: number, staffId: number) => requestEmptyResponse('POST', `/units/${unitId}/invite/${staffId}/respond`, {}),
  getAllTutors: () => request('GET', '/tutors'),
  getTutorProfile: (id: number) => request('GET', `/tutors/${id}`),
  getUnitTutors: (unitId: number) => request('GET', `/units/${unitId}/tutors`),
  getMySwapRequests: () => request('GET', '/swap-requests/me'),
  createSwapRequest: (data: object) => request('POST', '/swap-requests', data),
  respondToSwapRequest: (requestId: number, accept: boolean) => request('POST', `/swap-requests/${requestId}/respond`, { accept }),
  getMyNotifications: () => request('GET', '/notifications/me'),
  markNotificationRead: (id: number) => requestNoBody('POST', `/notifications/${id}/read`),
  markAllNotificationsRead: () => requestNoBody('POST', '/notifications/read-all'),
}