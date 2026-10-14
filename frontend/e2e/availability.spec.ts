import { expect, test } from '@playwright/test'
import { backend, sidebarLink, signIn } from './support/backend'

test.describe('Tutor availability', () => {
  test('tutor submits availability from the Calendar and the coordinator can see it', async ({ page }) => {
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord, 'E2E Availability Unit')
    const tutor = await backend.tutor(coord, 'Available Tutor')
    await backend.invite(coord, unit.id, tutor)

    await signIn(page, tutor)
    await sidebarLink(page, 'Calendar').click()
    await page.getByRole('button', { name: 'Availability', exact: true }).click()

    const modal = page.locator('.avail-modal')
    await expect(modal.getByRole('heading', { name: 'Submit Availability' })).toBeVisible()
    await modal.locator('select').first().selectOption(String(unit.id))

    // Tuesday 10:00 and 11:00 (grid columns are Mon..Fri, rows 08:00..17:00)
    const row = (time: string) => modal.locator('.avail-row-fragment', { hasText: time }).locator('.avail-cell')
    await row('10:00').nth(1).dispatchEvent('mousedown')
    await row('11:00').nth(1).dispatchEvent('mousedown')
    await expect(modal.locator('.avail-cell.selected')).toHaveCount(2)

    const save = modal.getByRole('button', { name: 'Save Availability' })
    await expect(save).toBeDisabled() // must confirm first
    await modal.getByRole('checkbox').check()
    await save.click()
    await expect(modal.getByText(`Saved for ${unit.code} ✓`)).toBeVisible()

    const mine = await backend.call<any[]>('GET', '/availability/me', tutor.token)
    expect(mine.filter(a => a.unit.id === unit.id)).toHaveLength(2)

    const forUnit = await backend.call<any[]>('GET', `/availability/unit/${unit.id}`, coord.token)
    expect(forUnit.every(a => a.staff.id === tutor.id)).toBe(true)

    // Submitting availability counts as responding to the invitation.
    const [invite] = await backend.invitations(coord, unit.id)
    expect(invite.status).toBe('RESPONDED')
  })

  test('the tutor dashboard shows the unit deadline and submission progress', async ({ page }) => {
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord)
    const tutor = await backend.tutor(coord, 'Dashboard Tutor')
    await backend.invite(coord, unit.id, tutor)
    const due = new Date(Date.now() + 5 * 86400000)
    const p = (n: number) => String(n).padStart(2, '0')
    await backend.call('PUT', `/units/${unit.id}/deadline`, coord.token, {
      deadline: `${due.getFullYear()}-${p(due.getMonth() + 1)}-${p(due.getDate())}T17:00:00`,
    })

    await signIn(page, tutor)
    await expect(page.getByRole('heading', { name: /days left/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: '0/1' })).toBeVisible()

    await backend.availability(tutor, unit.id, new Date(Date.now() + 7 * 86400000))
    await page.reload()
    await expect(page.getByRole('heading', { name: '1/1' })).toBeVisible()
  })
})
