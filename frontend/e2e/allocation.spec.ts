import { expect, test, type Page } from '@playwright/test'
import { backend, signIn, type Account } from './support/backend'

// A unit with a weekly Tuesday 10am tutorial (3 weeks) and one tutor who
// has accepted and submitted availability for every one of those times.
async function unitReadyToAllocate(tutorName = 'Allocated Tutor') {
  const coord = await backend.coordinator()
  const unit = await backend.unit(coord, 'E2E Allocation Unit')
  const sessions = await backend.weeklySessions(coord, unit.id, { title: 'Tutorial', weekday: 2, hour: 10, count: 3 })
  const tutor = await backend.tutor(coord, tutorName)
  await backend.invite(coord, unit.id, tutor)
  await backend.accept(tutor, unit.id)
  for (const s of sessions) await backend.availability(tutor, unit.id, new Date(s.startTime))
  return { coord, unit, sessions, tutor }
}

async function openAllocations(page: Page, coord: Account, unitCode: string) {
  await signIn(page, coord, '/coordinator/allocations')
  await page.getByRole('button', { name: 'Allocate →' }).first().click()
  await expect(page.getByRole('heading', { name: `${unitCode} — Allocations` })).toBeVisible()
}

test.describe('Allocating tutors to sessions', () => {
  test('coordinator assigns an available tutor to a weekly class', async ({ page }) => {
    const { coord, unit, sessions, tutor } = await unitReadyToAllocate()
    await openAllocations(page, coord, unit.code)

    const card = page.locator('.allocation-card', { hasText: 'Tutorial' })
    await expect(card).toContainText('3 sessions')
    await card.getByRole('button', { name: tutor.fullName }).click()
    await expect(card.locator('.allocation-assigned-name')).toHaveText(tutor.fullName)

    const allocations = await backend.unitAllocations(coord, unit.id)
    expect(allocations).toHaveLength(sessions.length)
    expect(allocations.every(a => a.staff.id === tutor.id)).toBe(true)

    const notes = await backend.notifications(tutor)
    expect(notes.filter(n => n.type === 'ALLOCATION')).toHaveLength(sessions.length)
  })

  test('the smart draft suggests the available tutor and applies it', async ({ page }) => {
    const { coord, unit, tutor } = await unitReadyToAllocate('Draft Tutor')
    await openAllocations(page, coord, unit.code)

    await page.getByRole('button', { name: 'Auto Allocate' }).click()
    const draft = page.locator('.auto-alloc-modal')
    const row = draft.locator('.auto-alloc-row', { hasText: 'Tutorial' })
    await expect(row).toContainText(tutor.fullName)
    await expect(row).toContainText('Availability match')
    await draft.getByRole('button', { name: /^Apply 1 Allocation$/ }).click()
    await expect(draft).toBeHidden()

    await expect(page.locator('.allocation-card', { hasText: 'Tutorial' }).locator('.allocation-assigned-name')).toHaveText(tutor.fullName)
    await expect.poll(async () => (await backend.unitAllocations(coord, unit.id)).length).toBe(3)
  })

  test('skipping the only suggestion means nothing is applied', async ({ page }) => {
    const { coord, unit } = await unitReadyToAllocate('Skipped Tutor')
    await openAllocations(page, coord, unit.code)
    await page.getByRole('button', { name: 'Auto Allocate' }).click()
    const draft = page.locator('.auto-alloc-modal')
    await draft.getByRole('button', { name: 'Include' }).click()
    await expect(draft.locator('.auto-alloc-stat.skipped')).toHaveText('1 skipped')
    await expect(draft.getByRole('button', { name: /^Apply/ })).toBeDisabled()
  })

  test('the draft explains when nobody has submitted availability', async ({ page }) => {
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord)
    await backend.weeklySessions(coord, unit.id, { count: 1 })
    await openAllocations(page, coord, unit.code)
    await page.getByRole('button', { name: 'Auto Allocate' }).click()
    await expect(page.getByText('No tutors have submitted availability for this unit yet.')).toBeVisible()
  })

  test('coordinator can assign a class to themself', async ({ page }) => {
    const { coord, unit } = await unitReadyToAllocate('Unused Tutor')
    await openAllocations(page, coord, unit.code)
    const card = page.locator('.allocation-card', { hasText: 'Tutorial' })
    await card.getByRole('button', { name: '🙋 Assign Myself' }).click()
    await expect(card.locator('.allocation-assigned-name')).toContainText(coord.fullName)

    const allocations = await backend.unitAllocations(coord, unit.id)
    expect(allocations.every(a => a.staff.id === coord.id && a.status === 'CONFIRMED')).toBe(true)
  })

  test('a self-assigned class is labelled as "(You)"', async ({ page }) => {
    test.fail(true, 'Known issue: the page checks staff id === SELF_ASSIGN_STAFF_ID (0), but the backend stores the coordinator\'s real user id.')
    const { coord, unit } = await unitReadyToAllocate('Unused Tutor')
    await openAllocations(page, coord, unit.code)
    const card = page.locator('.allocation-card', { hasText: 'Tutorial' })
    await card.getByRole('button', { name: '🙋 Assign Myself' }).click()
    await expect(card.locator('.allocation-assigned-name')).toContainText('(You)', { timeout: 5000 })
  })

  test('the tutor sees their allocated classes on their dashboard and in My Units', async ({ page }) => {
    const { coord, unit, sessions, tutor } = await unitReadyToAllocate('Viewing Tutor')
    for (const s of sessions) await backend.allocate(coord, s.id, tutor)

    await signIn(page, tutor)
    await expect(page.locator('.staff-class-card')).toHaveCount(sessions.length)

    await page.goto('/staff-units')
    await page.locator('.myunits-unit-card', { hasText: unit.code }).click()
    await expect(page.getByRole('heading', { name: 'My Sessions' })).toBeVisible()
    await expect(page.locator('.status-badge.allocated')).toContainText(`${sessions.length} Allocated`)
  })

  test('the tutor dashboard counts classes the coordinator allocated', async ({ page }) => {
    test.fail(true, 'Known issue: allocations are saved as PROPOSED and nothing ever confirms them, but the dashboard (and tutor reports) only count CONFIRMED.')
    const { coord, sessions, tutor } = await unitReadyToAllocate('Counting Tutor')
    for (const s of sessions) await backend.allocate(coord, s.id, tutor)
    await signIn(page, tutor)
    const allocatedCard = page.locator('.staff-stat-card', { hasText: 'Allocated Classes' })
    await expect(allocatedCard.getByRole('heading', { level: 2 })).toHaveText(String(sessions.length))
  })
})
