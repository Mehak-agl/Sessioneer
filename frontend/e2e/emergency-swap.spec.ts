import { expect, test, type Page } from '@playwright/test'
import { backend, signIn, type Account } from './support/backend'

// Two tutors on the same unit; the first one ("giver") is allocated an
// upcoming weekly class they will try to hand off to the second ("taker").
async function swapScenario() {
  const coord = await backend.coordinator('Swap Coordinator')
  const unit = await backend.unit(coord, 'E2E Swap Unit')
  const sessions = await backend.weeklySessions(coord, unit.id, { title: 'Practical', weekday: 4, hour: 14, count: 2 })
  const giver = await backend.tutor(coord, 'Giver Tutor')
  const taker = await backend.tutor(coord, 'Taker Tutor')
  for (const t of [giver, taker]) {
    await backend.invite(coord, unit.id, t)
    await backend.accept(t, unit.id)
  }
  for (const s of sessions) await backend.allocate(coord, s.id, giver)
  return { coord, unit, sessions, giver, taker }
}

async function requestSwap(page: Page, giver: Account, taker: Account, reason: string) {
  await signIn(page, giver, '/staff-swaps')
  await expect(page.getByRole('heading', { name: 'Emergency Class Swap' })).toBeVisible()
  await page.getByRole('button', { name: 'Request swap' }).first().click()
  const select = page.locator('select').filter({ has: page.locator('option', { hasText: taker.fullName }) })
  await select.selectOption({ label: taker.fullName })
  await page.getByPlaceholder(/Family emergency/).fill(reason)
  await page.getByRole('button', { name: 'Send Request' }).click()
  await expect(page.getByText("Swap request sent")).toBeVisible()
  await expect(page.locator('main')).toContainText(taker.fullName)
}

test.describe('Emergency swap (real backend)', () => {
  test('tutor hands off one class, colleague accepts, everyone is notified', async ({ page }) => {
    const { coord, unit, sessions, giver, taker } = await swapScenario()
    await requestSwap(page, giver, taker, 'Sick')

    const takerNotes = await backend.notifications(taker)
    expect(takerNotes.find(n => n.type === 'SWAP_REQUEST')?.message).toContain('Sick')

    await signIn(page, taker, '/staff-swaps')
    await expect(page.locator('main')).toContainText(giver.fullName)
    await page.getByRole('button', { name: 'Accept', exact: true }).click()
    await expect(page.getByText('Class accepted — it now belongs to you.')).toBeVisible()

    const allocations = await backend.unitAllocations(coord, unit.id)
    const first = allocations.find(a => a.session.id === sessions[0].id)
    const second = allocations.find(a => a.session.id === sessions[1].id)
    expect(first.staff.id).toBe(taker.id)
    expect(first.status).toBe('CONFIRMED')
    expect(second.staff.id).toBe(giver.id) // only the one class moved

    expect((await backend.notifications(giver)).some(n => n.title === 'Swap Request Accepted')).toBe(true)
    const fyi = (await backend.notifications(coord)).find(n => n.type === 'SWAP_FYI')
    expect(fyi?.title).toBe('Emergency Swap Completed')
    expect(fyi?.message).toContain(giver.fullName)
    expect(fyi?.message).toContain(taker.fullName)
  })

  test('handing off the whole session moves every remaining class', async ({ page }) => {
    const { coord, unit, giver, taker } = await swapScenario()
    await signIn(page, giver, '/staff-swaps')
    await page.getByRole('button', { name: 'Swap whole session' }).click()
    await page.locator('select').filter({ has: page.locator('option', { hasText: taker.fullName }) }).selectOption({ label: taker.fullName })
    await page.getByRole('button', { name: 'Send Request' }).click()
    await expect(page.getByText('Swap request sent')).toBeVisible()

    const [req] = (await backend.swaps(taker)).incoming
    expect(req.scope).toBe('SERIES')
    await backend.call('POST', `/swap-requests/${req.id}/respond`, taker.token, { accept: true })

    const allocations = await backend.unitAllocations(coord, unit.id)
    expect(allocations.every(a => a.staff.id === taker.id)).toBe(true)
  })

  test('declining keeps the class with the original tutor and the coordinator is not told', async ({ page }) => {
    const { coord, unit, giver, taker } = await swapScenario()
    await requestSwap(page, giver, taker, 'Clash')

    await signIn(page, taker, '/staff-swaps')
    await page.getByRole('button', { name: 'Decline', exact: true }).click()
    await expect(page.getByText('Swap request declined.')).toBeVisible()

    const allocations = await backend.unitAllocations(coord, unit.id)
    expect(allocations.every(a => a.staff.id === giver.id)).toBe(true)
    expect((await backend.notifications(giver)).some(n => n.title === 'Swap Request Declined')).toBe(true)
    expect((await backend.notifications(coord)).some(n => n.type === 'SWAP_FYI')).toBe(false)

    await signIn(page, giver, '/staff-swaps')
    await expect(page.locator('.status-badge.declined')).toBeVisible()
  })

  // The backend has no exception handler, so every rule violation comes back
  // as a bare 500 without its message — these check the rule held, not the text.
  test('backend rules: only your own classes, not yourself, no duplicates, only the asked tutor responds once', async () => {
    const { coord, unit, sessions, giver, taker } = await swapScenario()
    const create = (who: Account, body: object) => backend.call('POST', '/swap-requests', who.token, { unitId: unit.id, scope: 'SESSION', ...body })

    await expect(create(taker, { sessionIds: [sessions[0].id], targetStaffId: giver.id }), 'not your class').rejects.toThrow()
    await expect(create(giver, { sessionIds: [sessions[0].id], targetStaffId: giver.id }), 'swap with yourself').rejects.toThrow()
    await expect(create(giver, { sessionIds: [], targetStaffId: taker.id }), 'no classes').rejects.toThrow()
    expect((await backend.swaps(giver)).outgoing).toHaveLength(0)

    const req = await create(giver, { sessionIds: [sessions[0].id], targetStaffId: taker.id })
    await expect(create(giver, { sessionIds: [sessions[0].id], targetStaffId: taker.id }), 'duplicate pending').rejects.toThrow()
    expect((await backend.swaps(giver)).outgoing).toHaveLength(1)

    await expect(backend.call('POST', `/swap-requests/${req.id}/respond`, giver.token, { accept: true }), 'requester responding').rejects.toThrow()
    expect((await backend.unitAllocations(coord, unit.id)).every(a => a.staff.id === giver.id)).toBe(true)

    await backend.call('POST', `/swap-requests/${req.id}/respond`, taker.token, { accept: true })
    await expect(backend.call('POST', `/swap-requests/${req.id}/respond`, taker.token, { accept: false }), 'responding twice').rejects.toThrow()
    expect((await backend.swaps(taker)).incoming[0].status).toBe('ACCEPTED')
  })

  test('swap errors are shown to the tutor as readable messages', async () => {
    test.fail(true, 'Known issue: no @ControllerAdvice on the backend, so RuntimeException messages are hidden behind a generic 500 error.')
    const { unit, sessions, giver } = await swapScenario()
    const res = await fetch('http://localhost:8080/api/swap-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${giver.token}` },
      body: JSON.stringify({ unitId: unit.id, scope: 'SESSION', sessionIds: [sessions[0].id], targetStaffId: giver.id }),
    })
    expect(res.status).toBe(400)
    expect(await res.text()).toContain('cannot swap with yourself')
  })

  test('a tutor on a unit with no upcoming classes sees an empty state', async ({ page }) => {
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord)
    const tutor = await backend.tutor(coord, 'Idle Tutor')
    await backend.invite(coord, unit.id, tutor)
    await signIn(page, tutor, '/staff-swaps')
    await expect(page.getByText(/No upcoming allocated classes/)).toBeVisible()
  })

  test('a tutor with no units at all sees an empty state instead of loading forever', async ({ page }) => {
    test.fail(true, 'Known issue: TutorEmergencySwap gets the staff id from the first invitation, so with no invitations "Loading..." never ends.')
    const coord = await backend.coordinator()
    const tutor = await backend.tutor(coord, 'Brand New Tutor')
    await signIn(page, tutor, '/staff-swaps')
    await expect(page.getByText(/No upcoming allocated classes/)).toBeVisible({ timeout: 5000 })
  })
})
