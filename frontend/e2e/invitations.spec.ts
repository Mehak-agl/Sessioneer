import { expect, test } from '@playwright/test'
import { backend, sidebarLink, signIn } from './support/backend'

test.describe('Inviting tutors to a unit', () => {
  test('coordinator invites a tutor, who is notified and sees the unit as pending', async ({ page }) => {
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord, 'E2E Invite Unit')
    const tutor = await backend.tutor(coord, `Invitee ${unit.code}`)

    await signIn(page, coord, '/coordinator/units')
    await page.locator('.unit-row', { hasText: unit.code }).getByRole('button', { name: 'Manage →' }).click()
    await page.getByRole('button', { name: '+ Invite Tutors' }).click()
    const modal = page.locator('.modal', { hasText: 'Invite Tutors' })
    await modal.getByPlaceholder('Search by name or email...').fill(tutor.email)
    await modal.locator('label', { hasText: tutor.email }).click()
    await modal.getByRole('button', { name: 'Invite Selected (1)' }).click()

    await expect(modal).toBeHidden()
    const row = page.locator('.tutor-row', { hasText: tutor.email })
    await expect(row).toContainText('⏳ Pending')

    const invites = await backend.invitations(coord, unit.id)
    expect(invites.map(i => i.staff.id)).toEqual([tutor.id])

    const notes = await backend.notifications(tutor)
    expect(notes.find(n => n.type === 'INVITATION')?.message).toContain(unit.code)

    await signIn(page, tutor)
    await sidebarLink(page, 'My Units').click()
    await expect(page.locator('.myunits-unit-card', { hasText: unit.code })).toContainText('Pending')
  })

  test('tutor accepts the invitation and the coordinator sees them as responded', async ({ page }) => {
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord)
    const tutor = await backend.tutor(coord, 'Accepting Tutor')
    await backend.invite(coord, unit.id, tutor)

    await signIn(page, tutor, '/staff-units')
    await page.locator('.myunits-unit-card', { hasText: unit.code }).click()
    await page.getByRole('button', { name: 'Accept', exact: true }).click()
    await expect(page.getByText('✓ Accepted')).toBeVisible()

    await page.reload()
    await expect(page.locator('.myunits-unit-card', { hasText: unit.code })).toContainText('Accepted')

    const [invite] = await backend.invitations(coord, unit.id)
    expect(invite.status).toBe('RESPONDED')

    await signIn(page, coord, '/coordinator/units')
    await page.locator('.unit-row', { hasText: unit.code }).getByRole('button', { name: 'Manage →' }).click()
    await expect(page.locator('.tutor-row', { hasText: tutor.email })).toContainText('✓ Responded')
  })

  async function declineAsTutor(page: import('@playwright/test').Page) {
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord)
    const tutor = await backend.tutor(coord, 'Declining Tutor')
    await backend.invite(coord, unit.id, tutor)
    await signIn(page, tutor, '/staff-units')
    await page.locator('.myunits-unit-card', { hasText: unit.code }).click()
    page.once('dialog', d => d.accept())
    await page.getByRole('button', { name: 'Decline', exact: true }).click()
    return { coord, unit }
  }

  async function removeAsCoordinator(page: import('@playwright/test').Page) {
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord)
    const tutor = await backend.tutor(coord, 'Removed Tutor')
    await backend.invite(coord, unit.id, tutor)
    await signIn(page, coord, '/coordinator/units')
    await page.locator('.unit-row', { hasText: unit.code }).getByRole('button', { name: 'Manage →' }).click()
    page.on('dialog', d => d.accept())
    await page.locator('.tutor-row', { hasText: tutor.email }).getByRole('button', { name: 'Remove' }).click()
    return { coord, unit, tutor }
  }

  test('tutor declines the invitation: it is deleted and gone after a reload', async ({ page }) => {
    const { coord, unit } = await declineAsTutor(page)
    await expect.poll(async () => (await backend.invitations(coord, unit.id)).length).toBe(0)
    await page.reload()
    await expect(page.locator('.myunits-unit-card', { hasText: unit.code })).toHaveCount(0)
  })

  test('declining removes the unit from the tutor\'s list straight away', async ({ page }) => {
    test.fail(true, 'Known issue: api.removeInvitation uses request(), which calls res.json() on the empty DELETE response and throws, so the page never updates.')
    const { unit } = await declineAsTutor(page)
    await expect(page.locator('.myunits-unit-card', { hasText: unit.code })).toHaveCount(0, { timeout: 5000 })
  })

  test('coordinator removes an invited tutor: it is deleted and gone after a reload', async ({ page }) => {
    const { coord, unit, tutor } = await removeAsCoordinator(page)
    await expect.poll(async () => (await backend.invitations(coord, unit.id)).length).toBe(0)
    await page.reload()
    await page.locator('.unit-row', { hasText: unit.code }).getByRole('button', { name: 'Manage →' }).click()
    await expect(page.locator('.tutor-row', { hasText: tutor.email })).toHaveCount(0)
  })

  test('removing a tutor updates the coordinator\'s list straight away', async ({ page }) => {
    test.fail(true, 'Known issue: same empty-response bug in api.removeInvitation as the tutor decline.')
    const { tutor } = await removeAsCoordinator(page)
    await expect(page.locator('.tutor-row', { hasText: tutor.email })).toHaveCount(0, { timeout: 5000 })
  })

  test('inviting the same tutor twice is rejected by the backend', async () => {
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord)
    const tutor = await backend.tutor(coord, 'Twice Invited')
    await backend.invite(coord, unit.id, tutor)
    await expect(backend.invite(coord, unit.id, tutor)).rejects.toThrow()
  })
})
