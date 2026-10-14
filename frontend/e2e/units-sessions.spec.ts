import { expect, test } from '@playwright/test'
import { backend, field, nextWeekday, sidebarLink, signIn, uid } from './support/backend'

function ymd(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

test.describe('Units and sessions', () => {
  test('create a unit from My Units', async ({ page }) => {
    const coord = await backend.coordinator()
    const code = uid('E2E').toUpperCase().slice(0, 9)
    await signIn(page, coord)
    await sidebarLink(page, 'My Units').click()

    await page.getByRole('button', { name: '+ Create Unit' }).click()
    await page.getByPlaceholder('e.g. CAB302').fill(code)
    await page.getByPlaceholder('e.g. Software Development').fill('E2E Created Unit')
    await page.getByRole('button', { name: 'Create Unit', exact: true }).click()

    const row = page.locator('.unit-row', { hasText: code })
    await expect(row).toContainText('E2E Created Unit')

    const units = await backend.call<any[]>('GET', '/units', coord.token)
    expect(units.map(u => u.code)).toContain(code)
  })

  test('add sessions on specific dates through the Add Session form', async ({ page }) => {
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord, 'E2E Session Unit')
    const d1 = nextWeekday(3, 9, 2)
    const d2 = new Date(d1.getTime() + 7 * 86400000)

    await signIn(page, coord, '/coordinator/units')
    await page.locator('.unit-row', { hasText: unit.code }).getByRole('button', { name: 'Manage →' }).click()
    await page.getByRole('button', { name: '+ Add Session' }).click()
    await expect(page.getByRole('heading', { name: 'Add Session' })).toBeVisible()

    await field(page, 'Class Type').selectOption('Workshop')
    await field(page, 'Mode').selectOption('online')
    await page.getByRole('button', { name: 'Specific Date(s)' }).click()
    for (const d of [d1, d2]) {
      await page.locator('.specific-dates-row input[type="date"]').fill(ymd(d))
      await page.getByRole('button', { name: 'Add Date' }).click()
    }
    await expect(page.getByText('This will create 2 sessions')).toBeVisible()
    await page.getByRole('button', { name: 'Create Session(s)' }).click()

    await expect(page.getByRole('heading', { name: 'Add Session' })).toBeHidden()
    const sessions = await backend.call<any[]>('GET', `/units/${unit.id}/sessions`, coord.token)
    expect(sessions).toHaveLength(2)
    expect(sessions.every(s => s.title === 'Workshop' && s.location === 'Online')).toBe(true)
    expect(sessions.map(s => s.startTime.slice(0, 16)).sort()).toEqual([`${ymd(d1)}T09:00`, `${ymd(d2)}T09:00`])
  })

  test('sessions created from the form keep their end time', async ({ page }) => {
    test.fail(true, 'Known issue: AddSessionForm only sends title/startTime/location, so endTime is never saved even though the backend accepts it.')
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord)
    await signIn(page, coord, '/coordinator/units')
    await page.locator('.unit-row', { hasText: unit.code }).getByRole('button', { name: 'Manage →' }).click()
    await page.getByRole('button', { name: '+ Add Session' }).click()
    await page.getByRole('button', { name: 'Specific Date(s)' }).click()
    await page.locator('.specific-dates-row input[type="date"]').fill(ymd(nextWeekday(1, 9, 2)))
    await page.getByRole('button', { name: 'Add Date' }).click()
    await page.getByRole('button', { name: 'Create Session(s)' }).click()
    await expect(page.getByRole('heading', { name: 'Add Session' })).toBeHidden()

    const [session] = await backend.call<any[]>('GET', `/units/${unit.id}/sessions`, coord.token)
    expect(session.endTime).toBeTruthy()
  })

  test('the Add Session form refuses to submit with no dates', async ({ page }) => {
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord)
    await signIn(page, coord, '/coordinator/units')
    await page.locator('.unit-row', { hasText: unit.code }).getByRole('button', { name: 'Manage →' }).click()
    await page.getByRole('button', { name: '+ Add Session' }).click()
    await page.getByRole('button', { name: 'Create Session(s)' }).click()
    await expect(page.getByText('At least one session needs a valid date range')).toBeVisible()
  })

  test('set an availability deadline for a unit', async ({ page }) => {
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord)
    const due = nextWeekday(5, 17, 1)
    await signIn(page, coord, '/coordinator/units')
    await page.locator('.unit-row', { hasText: unit.code }).getByRole('button', { name: 'Manage →' }).click()

    await page.getByRole('button', { name: '⏱ Set Deadline' }).click()
    await field(page, 'Deadline').fill(`${ymd(due)}T17:00`)
    await page.locator('.modal').getByRole('button', { name: 'Save' }).click()

    await expect(page.locator('.countdown-badge')).toBeVisible()
    await expect(page.getByRole('button', { name: '⏱ Edit Deadline' })).toBeVisible()
    const units = await backend.call<any[]>('GET', '/units', coord.token)
    expect(units.find(u => u.id === unit.id)?.availabilityDeadline?.slice(0, 16)).toBe(`${ymd(due)}T17:00`)
  })
})
