import { describe, expect, it } from 'vitest'
import * as mockApi from './mockApi'
import { getDb } from './mockDb'
import { ALEX, COORDINATOR, JAMES, PRIYA, signInAs } from '../test/helpers'

describe('auth', () => {
  it('logs in a seeded coordinator and returns a mock token', async () => {
    const res = await mockApi.login(COORDINATOR)
    expect(res).toEqual({ token: 'mock-user:1', role: 'COORDINATOR', fullName: 'Sarah Chen' })
  })

  it('treats email as case-insensitive', async () => {
    const res = await mockApi.login({ email: 'STAFF@QUT.EDU.AU', password: 'staff123' })
    expect(res.role).toBe('STAFF')
  })

  it('rejects a wrong password', async () => {
    await expect(mockApi.login({ email: COORDINATOR.email, password: 'nope' })).rejects.toThrow('Invalid email or password.')
  })

  it('signs up a new tutor who can then log in', async () => {
    const created = await mockApi.signup({ fullName: 'New Tutor', email: 'new@qut.edu.au', password: 'secret1', role: 'staff' })
    expect(created.role).toBe('STAFF')
    const res = await mockApi.login({ email: 'new@qut.edu.au', password: 'secret1' })
    expect(res.fullName).toBe('New Tutor')
  })

  it('refuses to register the same email twice', async () => {
    await expect(mockApi.signup({ fullName: 'Dup', email: COORDINATOR.email, password: 'x', role: 'STAFF' }))
      .rejects.toThrow('Email already registered.')
  })

  it('requires being signed in for tutor-only calls', async () => {
    await expect(mockApi.getMyInvitations()).rejects.toThrow(/Not signed in/)
  })
})

describe('units and sessions', () => {
  it('creates a unit with an upper-cased code', async () => {
    const unit = await mockApi.createUnit({ code: 'cab999', name: 'Testing', semester: 'Semester 2, 2026' })
    expect(unit.code).toBe('CAB999')
    const units = await mockApi.getUnits()
    expect(units.map(u => u.code)).toContain('CAB999')
  })

  it('returns a unit\'s sessions sorted by start time', async () => {
    await mockApi.createSession(3, { title: 'Late', startTime: '2026-10-10T15:00:00', location: 'Online' })
    await mockApi.createSession(3, { title: 'Early', startTime: '2026-10-10T09:00:00', location: 'Online' })
    const sessions = await mockApi.getSessions(3)
    expect(sessions.map(s => s.title)).toEqual(['Early', 'Late'])
    expect(sessions.every(s => s.status === 'PENDING')).toBe(true)
  })
})

describe('invitations', () => {
  it('invites a tutor to a unit as PENDING', async () => {
    const inv = await mockApi.inviteStaff(3, ALEX.id)
    expect(inv.status).toBe('PENDING')
    expect(inv.staff.email).toBe(ALEX.email)
  })

  it('does not allow inviting the same tutor twice', async () => {
    await expect(mockApi.inviteStaff(1, ALEX.id)).rejects.toThrow('Already invited.')
  })

  it('lets the invited tutor accept, flipping the invite to RESPONDED', async () => {
    await signInAs(JAMES.email, JAMES.password)
    await mockApi.acceptInvitation(1)
    const mine = await mockApi.getMyInvitations()
    expect(mine.find(i => i.unit.id === 1)?.status).toBe('RESPONDED')
  })

  it('removes an invitation when the tutor declines', async () => {
    await mockApi.declineInvitation(1, JAMES.id)
    const invites = await mockApi.getUnitInvitations(1)
    expect(invites.some(i => i.staff.id === JAMES.id)).toBe(false)
  })
})

describe('availability', () => {
  it('submitting availability marks a pending invitation as RESPONDED', async () => {
    await signInAs(JAMES.email, JAMES.password)
    await mockApi.submitAvailability({ unitId: 1, startTime: '2026-10-12T09:00:00', endTime: '2026-10-12T11:00:00' })
    const invites = await mockApi.getUnitInvitations(1)
    expect(invites.find(i => i.staff.id === JAMES.id)?.status).toBe('RESPONDED')
    const mine = await mockApi.getMyAvailability()
    expect(mine).toHaveLength(1)
    expect(mine[0].unit).toMatchObject({ code: 'CAB302' })
  })
})

describe('allocations', () => {
  it('allocating a session marks it ALLOCATED and replaces any previous tutor', async () => {
    const session = (await mockApi.getSessions(1))[0]
    await mockApi.allocate({ sessionId: session.id, staffId: ALEX.id })
    const again = await mockApi.allocate({ sessionId: session.id, staffId: PRIYA.id })
    expect(again.staff.id).toBe(PRIYA.id)

    const unitAllocations = await mockApi.getUnitAllocations(1)
    expect(unitAllocations.filter(a => a.session?.id === session.id)).toHaveLength(1)
    const sessions = await mockApi.getSessions(1)
    expect(sessions.find(s => s.id === session.id)?.status).toBe('ALLOCATED')
  })

  it('self-assign records the coordinator as the allocated staff', async () => {
    const session = (await mockApi.getSessions(2))[0]
    const alloc = await mockApi.selfAssign({ sessionId: session.id, coordinatorName: 'Sarah Chen' })
    expect(alloc.staff).toMatchObject({ id: mockApi.SELF_ASSIGN_STAFF_ID, fullName: 'Sarah Chen' })
  })

  it('rejects allocating a session that does not exist', async () => {
    await expect(mockApi.allocate({ sessionId: 99999, staffId: ALEX.id })).rejects.toThrow('Session not found.')
  })

  it('returns only the given tutor\'s allocations', async () => {
    const mine = await mockApi.getMyAllocations(ALEX.id)
    expect(mine).toHaveLength(2)
    expect(mine.every(a => a.staff.id === ALEX.id)).toBe(true)
  })
})

describe('emergency swap', () => {
  async function alexsFirstAllocatedSession() {
    return getDb().allocations.find(a => a.staffId === ALEX.id)!.sessionId
  }

  it('lists other tutors on the unit who have responded, excluding yourself', async () => {
    await signInAs(ALEX.email, ALEX.password)
    const tutors = await mockApi.getUnitTutors(1)
    const ids = tutors.map(t => t.id)
    expect(ids).toContain(PRIYA.id)
    expect(ids).not.toContain(ALEX.id)
    expect(ids).not.toContain(JAMES.id) // still PENDING
  })

  it('moves the allocation and notifies the coordinator when the swap is accepted', async () => {
    const sessionId = await alexsFirstAllocatedSession()
    await signInAs(ALEX.email, ALEX.password)
    const req = await mockApi.createSwapRequest({
      unitId: 1, scope: 'SESSION', sessionIds: [sessionId], targetStaffId: PRIYA.id, reason: 'Sick',
    })
    expect(req.status).toBe('PENDING')

    await signInAs(PRIYA.email, PRIYA.password)
    const { incoming } = await mockApi.getMySwapRequests()
    expect(incoming.map(r => r.id)).toContain(req.id)

    const done = await mockApi.respondToSwapRequest(req.id, true)
    expect(done.status).toBe('ACCEPTED')
    expect(getDb().allocations.find(a => a.sessionId === sessionId)?.staffId).toBe(PRIYA.id)

    const notice = getDb().coordinatorNotices[0]
    expect(notice.title).toBe('Emergency Swap Completed')
    expect(notice.message).toContain('Alex Thompson')
    expect(notice.message).toContain('Sick')
  })

  it('leaves the allocation alone when the swap is declined', async () => {
    const sessionId = await alexsFirstAllocatedSession()
    await signInAs(ALEX.email, ALEX.password)
    const req = await mockApi.createSwapRequest({ unitId: 1, sessionIds: [sessionId], targetStaffId: PRIYA.id })
    await signInAs(PRIYA.email, PRIYA.password)
    await mockApi.respondToSwapRequest(req.id, false)
    expect(getDb().allocations.find(a => a.sessionId === sessionId)?.staffId).toBe(ALEX.id)
    expect(getDb().coordinatorNotices).toHaveLength(0)
  })

  it('refuses to hand off a class that is not yours', async () => {
    const sessionId = await alexsFirstAllocatedSession()
    await signInAs(PRIYA.email, PRIYA.password)
    await expect(mockApi.createSwapRequest({ unitId: 1, sessionIds: [sessionId], targetStaffId: ALEX.id }))
      .rejects.toThrow(/not currently allocated to you/)
  })

  it('refuses to swap with yourself or with no classes selected', async () => {
    const sessionId = await alexsFirstAllocatedSession()
    await signInAs(ALEX.email, ALEX.password)
    await expect(mockApi.createSwapRequest({ unitId: 1, sessionIds: [sessionId], targetStaffId: ALEX.id }))
      .rejects.toThrow('You cannot swap with yourself.')
    await expect(mockApi.createSwapRequest({ unitId: 1, sessionIds: [], targetStaffId: PRIYA.id }))
      .rejects.toThrow('No classes selected for this swap.')
  })

  it('blocks a second pending request for the same class', async () => {
    const sessionId = await alexsFirstAllocatedSession()
    await signInAs(ALEX.email, ALEX.password)
    await mockApi.createSwapRequest({ unitId: 1, sessionIds: [sessionId], targetStaffId: PRIYA.id })
    await expect(mockApi.createSwapRequest({ unitId: 1, sessionIds: [sessionId], targetStaffId: 5 }))
      .rejects.toThrow(/already have a pending swap request/)
  })

  it('only the tutor asked to cover can respond, and only once', async () => {
    const sessionId = await alexsFirstAllocatedSession()
    await signInAs(ALEX.email, ALEX.password)
    const req = await mockApi.createSwapRequest({ unitId: 1, sessionIds: [sessionId], targetStaffId: PRIYA.id })
    await expect(mockApi.respondToSwapRequest(req.id, true)).rejects.toThrow(/Only the tutor asked/)

    await signInAs(PRIYA.email, PRIYA.password)
    await mockApi.respondToSwapRequest(req.id, true)
    await expect(mockApi.respondToSwapRequest(req.id, true)).rejects.toThrow(/already been responded/)
  })
})

describe('profile', () => {
  it('changes password only when the current one is correct', async () => {
    await signInAs(ALEX.email, ALEX.password)
    await expect(mockApi.changePassword('wrong', 'newpass1')).rejects.toThrow('Current password is incorrect.')
    await mockApi.changePassword(ALEX.password, 'newpass1')
    await expect(mockApi.login({ email: ALEX.email, password: 'newpass1' })).resolves.toMatchObject({ role: 'STAFF' })
  })
})
