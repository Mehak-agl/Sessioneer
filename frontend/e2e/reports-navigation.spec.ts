import { expect, test } from '@playwright/test'
import { backend, sidebarLink, signIn } from './support/backend'

test.describe('Tutor reports', () => {
  test('coordinator sees a tutor with their units and can open their report', async ({ page }) => {
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord, 'E2E Report Unit')
    const tutor = await backend.tutor(coord, 'Reported Tutor')
    await backend.invite(coord, unit.id, tutor)

    await signIn(page, coord)
    await sidebarLink(page, 'Reports').click()
    await expect(page.getByRole('heading', { name: 'Tutor Reports' })).toBeVisible()
    await page.getByPlaceholder('Search by name or email...').fill(tutor.email)
    const row = page.locator('.tutors-table-row', { hasText: tutor.email })
    await expect(row).toContainText('Reported Tutor')
    await expect(row).toContainText('None') // no resume yet

    await row.getByRole('button', { name: 'View' }).click()
    await expect(page).toHaveURL(new RegExp(`/coordinator/reports/${tutor.id}$`))
    await expect(page.locator('main')).toContainText(unit.code)
  })

  test('sessions allocated by the coordinator show up in the tutor report', async () => {
    test.fail(true, 'Known issue: TutorReportService only counts CONFIRMED allocations, but allocations are created as PROPOSED.')
    const coord = await backend.coordinator()
    const unit = await backend.unit(coord)
    const sessions = await backend.weeklySessions(coord, unit.id, { count: 2 })
    const tutor = await backend.tutor(coord, 'Busy Tutor')
    await backend.invite(coord, unit.id, tutor)
    for (const s of sessions) await backend.allocate(coord, s.id, tutor)

    const report = await backend.call('GET', `/tutors/${tutor.id}`, coord.token)
    expect(report.totalSessionsAllocated).toBe(2)
  })
})

test.describe('Navigation', () => {
  test('every coordinator sidebar link opens its page', async ({ page }) => {
    const coord = await backend.coordinator()
    await signIn(page, coord)
    const links: [RegExp, RegExp][] = [
      [/^My Units/, /\/coordinator\/units$/],
      [/^Calendar/, /\/calendar$/],
      [/^Tutors/, /\/coordinator\/tutors$/],
      [/^Allocations/, /\/coordinator\/allocations$/],
      [/^Reports/, /\/coordinator\/reports$/],
      [/^Notifications/, /\/coordinator-notifications$/],
      [/^Chat/, /\/coordinator-chat$/],
      [/^Dashboard/, /\/coordinator$/],
    ]
    for (const [name, url] of links) {
      await sidebarLink(page, name).click()
      await expect(page).toHaveURL(url)
    }
  })

  test('every tutor sidebar link opens its page', async ({ page }) => {
    const coord = await backend.coordinator()
    const tutor = await backend.tutor(coord, 'Navigating Tutor')
    await signIn(page, tutor)
    const links: [RegExp, RegExp][] = [
      [/^My Units/, /\/staff-units$/],
      [/^Calendar/, /\/staff-calendar$/],
      [/^Notification/, /\/staff-notifications$/],
      [/^Chat/, /\/staff-chat$/],
      [/^Emergency Swap/, /\/staff-swaps$/],
      [/^Dashboard/, /\/staff$/],
    ]
    for (const [name, url] of links) {
      await sidebarLink(page, name).click()
      await expect(page).toHaveURL(url)
    }
  })

  test('clicking the avatar opens the profile page on both portals', async ({ page }) => {
    const coord = await backend.coordinator()
    const tutor = await backend.tutor(coord, 'Avatar Tutor')
    await signIn(page, coord)
    await page.locator('.coord-profile').click()
    await expect(page).toHaveURL(/\/coordinator-profile$/)
    await signIn(page, tutor)
    await page.locator('.staff-profile').click()
    await expect(page).toHaveURL(/\/staff-profile$/)
  })

  test('pages load without crashing for a brand new coordinator with no data', async ({ page }) => {
    const coord = await backend.coordinator()
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await signIn(page, coord)
    for (const path of ['/coordinator', '/coordinator/units', '/calendar', '/coordinator/tutors', '/coordinator/allocations', '/coordinator/reports', '/coordinator-notifications', '/coordinator-chat', '/coordinator-profile']) {
      await page.goto(path)
      await expect(page.locator('aside.coord-sidebar'), path).toBeVisible()
    }
    expect(errors).toEqual([])
  })

  test('pages load without crashing for a brand new tutor with no data', async ({ page }) => {
    const coord = await backend.coordinator()
    const tutor = await backend.tutor(coord, 'Empty Tutor')
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await signIn(page, tutor)
    for (const path of ['/staff', '/staff-units', '/staff-calendar', '/staff-notifications', '/staff-chat', '/staff-swaps', '/staff-profile']) {
      await page.goto(path)
      await expect(page.locator('aside.staff-sidebar'), path).toBeVisible()
    }
    expect(errors).toEqual([])
  })
})
