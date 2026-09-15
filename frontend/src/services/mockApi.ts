// ─────────────────────────────────────────────────────────────────────────
// Mock implementation of every function in services/api.ts, backed by
// mockDb.ts. Used only when mock mode is on (see the toggle in the corner
// of the app, or MockModeToggle.tsx) — the real backend and services/api.ts
// itself are untouched.
//
// Every function here has the exact same name, parameters and return
// shape as its real counterpart in api.ts, so every page in the app works
// identically whether it's talking to this mock or the real backend.
// ─────────────────────────────────────────────────────────────────────────

import { getDb, saveDb, type MockUser } from './mockDb'

export const SELF_ASSIGN_STAFF_ID = -1

// Small artificial delay so loading states are actually visible/testable,
// like a real network call.
function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

function fail(message: string): never {
  throw new Error(message)
}

function getToken(): string | null {
  return localStorage.getItem('sessioneer_token')
}

function currentUserId(): number | null {
  const token = getToken()
  if (!token) return null
  const match = /^mock-user:(\d+)$/.exec(token)
  return match ? Number(match[1]) : null
}

function requireCurrentUser(): MockUser {
  const db = getDb()
  const id = currentUserId()
  const user = id != null ? db.users.find(u => u.id === id) : undefined
  if (!user) fail('Not signed in (mock mode): please log out and back in.')
  return user
}

function toStaffSummary(user: MockUser) {
  return { id: user.id, fullName: user.fullName, email: user.email }
}

function hydrateStaffOrSelf(db: ReturnType<typeof getDb>, staffId: number) {
  if (staffId === SELF_ASSIGN_STAFF_ID) {
    const identity = db.selfAssignIdentities[String(staffId)] ?? { fullName: 'Coordinator', email: undefined }
    return { id: SELF_ASSIGN_STAFF_ID, fullName: identity.fullName, email: identity.email ?? '' }
  }
  const user = db.users.find(u => u.id === staffId)
  return user ? toStaffSummary(user) : { id: staffId, fullName: 'Unknown Staff', email: '' }
}

function hydrateSession(db: ReturnType<typeof getDb>, sessionId: number) {
  const session = db.sessions.find(s => s.id === sessionId)
  if (!session) return null
  return { ...session, unit: { id: session.unitId } }
}

function hydrateAllocation(db: ReturnType<typeof getDb>, allocationId: number) {
  const a = db.allocations.find(x => x.id === allocationId)!
  return {
    id: a.id,
    status: a.status,
    session: hydrateSession(db, a.sessionId),
    staff: hydrateStaffOrSelf(db, a.staffId),
  }
}

function hydrateInvitation(db: ReturnType<typeof getDb>, invitationId: number) {
  const inv = db.invitations.find(x => x.id === invitationId)!
  const unit = db.units.find(u => u.id === inv.unitId)
  const staff = db.users.find(u => u.id === inv.staffId)
  return {
    id: inv.id,
    unit: unit ? { ...unit } : { id: inv.unitId },
    staff: staff ? toStaffSummary(staff) : { id: inv.staffId, fullName: 'Unknown', email: '' },
    status: inv.status,
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────

export async function signup(data: any) {
  const db = getDb()
  const fullName = String(data?.fullName ?? '').trim() || 'New User'
  const email = String(data?.email ?? '').trim().toLowerCase()
  const password = String(data?.password ?? '')
  const role = String(data?.role ?? 'STAFF').toUpperCase() === 'COORDINATOR' ? 'COORDINATOR' : 'STAFF'

  if (!email) return delay(fail('Email is required.'))
  if (db.users.some(u => u.email.toLowerCase() === email)) {
    return delay(fail('Email already registered.'))
  }

  const user: MockUser = { id: db.nextId.user++, fullName, email, password, role: role as any }
  db.users.push(user)
  saveDb()
  return delay({ token: `mock-user:${user.id}`, role: user.role, fullName: user.fullName })
}

export async function login(data: any) {
  const db = getDb()
  const email = String(data?.email ?? '').trim().toLowerCase()
  const password = String(data?.password ?? '')
  const user = db.users.find(u => u.email.toLowerCase() === email && u.password === password)
  if (!user) return delay(fail('Invalid email or password.'))
  return delay({ token: `mock-user:${user.id}`, role: user.role, fullName: user.fullName })
}

// ── Units ────────────────────────────────────────────────────────────────

export async function getUnits() {
  const db = getDb()
  return delay(db.units.map(u => ({ ...u })))
}

export async function createUnit(data: any) {
  const db = getDb()
  const unit = {
    id: db.nextId.unit++,
    code: String(data?.code ?? '').toUpperCase(),
    name: String(data?.name ?? ''),
    semester: String(data?.semester ?? ''),
  }
  db.units.push(unit)
  saveDb()
  return delay({ ...unit })
}

// ── Sessions ─────────────────────────────────────────────────────────────

export async function getSessions(unitId: number) {
  const db = getDb()
  const sessions = db.sessions
    .filter(s => s.unitId === unitId)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map(s => ({ ...s, unit: { id: unitId } }))
  return delay(sessions)
}

export async function createSession(unitId: number, data: any) {
  const db = getDb()
  const session = {
    id: db.nextId.session++,
    unitId,
    title: String(data?.title ?? ''),
    startTime: String(data?.startTime ?? ''),
    endTime: data?.endTime ? String(data.endTime) : undefined,
    location: String(data?.location ?? ''),
    status: 'PENDING' as const,
  }
  db.sessions.push(session)
  saveDb()
  return delay({ ...session, unit: { id: unitId } })
}

// ── Availability ─────────────────────────────────────────────────────────

export async function submitAvailability(data: any) {
  const db = getDb()
  const user = requireCurrentUser()
  const unitId = Number(data?.unitId)
  const entry = {
    id: db.nextId.availability++,
    staffId: user.id,
    unitId,
    startTime: String(data?.startTime ?? ''),
    endTime: String(data?.endTime ?? ''),
  }
  db.availability.push(entry)

  // Submitting any availability for a unit flips that invitation to
  // RESPONDED — mirrors the real backend's behaviour (availability is
  // tracked per unit, not per session).
  const invitation = db.invitations.find(inv => inv.unitId === unitId && inv.staffId === user.id)
  if (invitation && invitation.status === 'PENDING') {
    invitation.status = 'RESPONDED'
  }

  saveDb()
  const unit = db.units.find(u => u.id === unitId)
  return delay({ ...entry, unit: unit ? { ...unit } : { id: unitId } })
}

export async function getMyAvailability() {
  const db = getDb()
  const user = requireCurrentUser()
  const rows = db.availability
    .filter(a => a.staffId === user.id)
    .map(a => {
      const unit = db.units.find(u => u.id === a.unitId)
      return { ...a, unit: unit ? { ...unit } : { id: a.unitId } }
    })
  return delay(rows)
}

export async function getUnitAvailability(unitId: number) {
  const db = getDb()
  const rows = db.availability
    .filter(a => a.unitId === unitId)
    .map(a => ({ ...a, staff: hydrateStaffOrSelf(db, a.staffId) }))
  return delay(rows)
}

// ── Allocations ──────────────────────────────────────────────────────────

export async function allocate(data: any) {
  const db = getDb()
  const sessionId = Number(data?.sessionId)
  const staffId = Number(data?.staffId)
  const session = db.sessions.find(s => s.id === sessionId)
  if (!session) return delay(fail('Session not found.'))

  // Re-assigning replaces any existing allocation for this session.
  db.allocations = db.allocations.filter(a => a.sessionId !== sessionId)
  const allocation = { id: db.nextId.allocation++, sessionId, staffId, status: 'ALLOCATED' as const }
  db.allocations.push(allocation)
  session.status = 'ALLOCATED'
  saveDb()
  return delay(hydrateAllocation(db, allocation.id))
}

export async function selfAssign(data: any) {
  const db = getDb()
  const sessionId = Number(data?.sessionId)
  const session = db.sessions.find(s => s.id === sessionId)
  if (!session) return delay(fail('Session not found.'))

  db.selfAssignIdentities[String(SELF_ASSIGN_STAFF_ID)] = {
    fullName: String(data?.coordinatorName ?? 'Coordinator'),
    email: data?.coordinatorEmail ? String(data.coordinatorEmail) : undefined,
  }

  db.allocations = db.allocations.filter(a => a.sessionId !== sessionId)
  const allocation = {
    id: db.nextId.allocation++,
    sessionId,
    staffId: SELF_ASSIGN_STAFF_ID,
    status: 'ALLOCATED' as const,
  }
  db.allocations.push(allocation)
  session.status = 'ALLOCATED'
  saveDb()
  return delay(hydrateAllocation(db, allocation.id))
}

export async function getUnitAllocations(unitId: number) {
  const db = getDb()
  const sessionIdsInUnit = new Set(db.sessions.filter(s => s.unitId === unitId).map(s => s.id))
  const rows = db.allocations
    .filter(a => sessionIdsInUnit.has(a.sessionId))
    .map(a => hydrateAllocation(db, a.id))
  return delay(rows)
}

export async function getMyAllocations(staffId: number) {
  const db = getDb()
  const rows = db.allocations.filter(a => a.staffId === staffId).map(a => hydrateAllocation(db, a.id))
  return delay(rows)
}

// ── Staff / Invitations ──────────────────────────────────────────────────

export async function getAllStaff() {
  const db = getDb()
  return delay(db.users.filter(u => u.role === 'STAFF').map(toStaffSummary))
}

// ── Tutor Report section (Coordinator view of all tutors) ─────────────────
//
// A tutor's resume is uploaded from their own Profile page (see
// pages/Tutor/TutorProfile.tsx). There's no backend endpoint to store it
// against their account yet, so — same mock-only approach as everything
// else in this file — it's kept in localStorage, one entry per tutor id,
// which lets the Coordinator's Tutor Report screens read it back here.

function readResume(userId: number): { fileName?: string; data?: string } {
  try {
    const fileName = localStorage.getItem(`sessioneer_resume_name_${userId}`)
    const data = localStorage.getItem(`sessioneer_resume_${userId}`)
    return { fileName: fileName ?? undefined, data: data ?? undefined }
  } catch {
    return {}
  }
}

function tutorUnitsFor(db: ReturnType<typeof getDb>, staffId: number) {
  return db.invitations
    .filter(inv => inv.staffId === staffId)
    .map(inv => {
      const unit = db.units.find(u => u.id === inv.unitId)
      const sessionIdsInUnit = new Set(db.sessions.filter(s => s.unitId === inv.unitId).map(s => s.id))
      const sessionsAllocated = db.allocations.filter(
        a => a.staffId === staffId && sessionIdsInUnit.has(a.sessionId),
      ).length
      return {
        unitId: inv.unitId,
        code: unit?.code ?? 'Unknown',
        name: unit?.name ?? 'Unknown unit',
        semester: unit?.semester ?? '',
        invitationStatus: inv.status,
        sessionsAllocated,
      }
    })
}

export async function getAllTutors() {
  const db = getDb()
  const tutors = db.users
    .filter(u => u.role === 'STAFF')
    .map(u => {
      const units = tutorUnitsFor(db, u.id)
      const totalSessionsAllocated = units.reduce((sum, unit) => sum + unit.sessionsAllocated, 0)
      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        unitCount: units.length,
        totalSessionsAllocated,
        hasResume: Boolean(readResume(u.id).data),
      }
    })
  return delay(tutors)
}

export async function getTutorProfile(tutorId: number) {
  const db = getDb()
  const user = db.users.find(u => u.id === tutorId && u.role === 'STAFF')
  if (!user) return delay(fail('Tutor not found.'))

  const units = tutorUnitsFor(db, user.id)
  const totalSessionsAllocated = units.reduce((sum, unit) => sum + unit.sessionsAllocated, 0)
  const pendingInvitations = units.filter(u => u.invitationStatus === 'PENDING').length
  const resume = readResume(user.id)

  return delay({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    units,
    totalSessionsAllocated,
    pendingInvitations,
    hasResume: Boolean(resume.data),
    resumeFileName: resume.fileName,
    resumeData: resume.data,
  })
}

export async function inviteStaff(unitId: number, staffId: number) {
  const db = getDb()
  if (!db.units.some(u => u.id === unitId)) return delay(fail('Unit not found.'))
  if (!db.users.some(u => u.id === staffId)) return delay(fail('Staff member not found.'))
  if (db.invitations.some(inv => inv.unitId === unitId && inv.staffId === staffId)) {
    return delay(fail('Already invited.'))
  }
  const invitation = { id: db.nextId.invitation++, unitId, staffId, status: 'PENDING' as const }
  db.invitations.push(invitation)
  saveDb()
  return delay(hydrateInvitation(db, invitation.id))
}

export async function getUnitInvitations(unitId: number) {
  const db = getDb()
  const rows = db.invitations.filter(inv => inv.unitId === unitId).map(inv => hydrateInvitation(db, inv.id))
  return delay(rows)
}

export async function getMyInvitations() {
  const db = getDb()
  const user = requireCurrentUser()
  const rows = db.invitations.filter(inv => inv.staffId === user.id).map(inv => hydrateInvitation(db, inv.id))
  return delay(rows)
}

export async function removeInvitation(unitId: number, staffId: number) {
  const db = getDb()
  db.invitations = db.invitations.filter(inv => !(inv.unitId === unitId && inv.staffId === staffId))
  saveDb()
  return delay({})
}

export async function declineInvitation(unitId: number, staffId: number) {
  return removeInvitation(unitId, staffId)
}

export async function acceptInvitation(unitId: number) {
  const db = getDb()
  const user = requireCurrentUser()
  const invitation = db.invitations.find(inv => inv.unitId === unitId && inv.staffId === user.id)
  if (!invitation) return delay(fail('Invitation not found.'))
  invitation.status = 'RESPONDED'
  saveDb()
  return delay(hydrateInvitation(db, invitation.id))
}

export async function respondToInvitation(unitId: number, staffId: number) {
  const db = getDb()
  const invitation = db.invitations.find(inv => inv.unitId === unitId && inv.staffId === staffId)
  if (!invitation) return delay(fail('Invitation not found.'))
  invitation.status = 'RESPONDED'
  saveDb()
  return delay(hydrateInvitation(db, invitation.id))
}

export async function markStaffUnavailableForSession(sessionId: number, staffId: number, unavailable: boolean) {
  // Purely a client-side concept even on the real backend flow (see the
  // notes in CoordinatorUnitDetailView.tsx) — just acknowledge the call.
  return delay({ sessionId, staffId, unavailable })
}
