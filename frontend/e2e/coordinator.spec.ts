import { expect, test } from '@playwright/test'
import { COORDINATOR, PRIYA, login, sidebarLink, useMockMode } from './helpers'

test.beforeEach(async ({ page }) => {
  await useMockMode(page)
  await login(page, COORDINATOR)
})

test('dashboard shows the coordinator overview cards', async ({ page }) => {
  await expect(page.getByText('Submission Deadline').first()).toBeVisible()
  await expect(page.getByText('Pending Invitations').first()).toBeVisible()
})

test('create a new unit', async ({ page }) => {
  await sidebarLink(page, 'My Units').click()
  await page.getByRole('button', { name: '+ Create Unit' }).click()
  await page.getByPlaceholder('e.g. CAB302').fill('cab999')
  await page.getByPlaceholder('e.g. Software Development').fill('End to End Testing')
  await page.getByRole('button', { name: 'Create Unit', exact: true }).click()

  const row = page.locator('.unit-row', { hasText: 'CAB999' })
  await expect(row).toBeVisible()
  await expect(row).toContainText('End to End Testing')
})

test('invite a tutor to a unit', async ({ page }) => {
  await sidebarLink(page, 'My Units').click()
  await page.locator('.unit-row', { hasText: 'CAB301' }).getByRole('button', { name: 'Manage →' }).click()
  await expect(page.getByRole('heading', { name: 'Algorithms and Complexity' })).toBeVisible()

  await page.getByRole('button', { name: '+ Invite Tutors' }).click()
  const modal = page.locator('.modal', { hasText: 'Invite Tutors' })
  await modal.getByPlaceholder('Search by name or email...').fill('Priya')
  await modal.locator('label', { hasText: PRIYA.name }).click()
  await modal.getByRole('button', { name: 'Invite Selected (1)' }).click()

  await expect(modal).toBeHidden()
  await expect(page.locator('main')).toContainText(PRIYA.name)
})

test('coordinator notifications can be filtered and marked read', async ({ page }) => {
  await sidebarLink(page, /^Notifications/).click()
  const items = page.locator('.notif-item')
  const all = await items.count()
  expect(all).toBeGreaterThan(0)

  await page.getByRole('button', { name: /^Invitations/ }).click()
  expect(await items.count()).toBeLessThan(all)

  await page.getByRole('button', { name: 'Mark all as read' }).click()
  await expect(page.locator('.notif-item.unread')).toHaveCount(0)
  await expect(sidebarLink(page, /^Notifications/).locator('.sidebar-notif-badge')).toHaveCount(0)
})
