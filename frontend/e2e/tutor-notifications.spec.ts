import { expect, test } from '@playwright/test'
import { ALEX, login, sidebarLink, useMockMode } from './helpers'

test.beforeEach(async ({ page }) => {
  await useMockMode(page)
  await login(page, ALEX)
  await sidebarLink(page, /^Notifications/).click()
})

test('filters by type and unit', async ({ page }) => {
  const items = page.locator('.notif-item')
  await expect(items).toHaveCount(8)

  await page.getByRole('button', { name: /^Deadlines/ }).click()
  await expect(items).toHaveCount(2)

  await page.locator('.notif-unit-select').selectOption('CAB302')
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('Availability Deadline Passed')
})

test('reading notifications updates the sidebar badge and persists', async ({ page }) => {
  const badge = sidebarLink(page, /^Notifications/).locator('.sidebar-notif-badge')
  await expect(badge).toHaveText('8')

  await page.locator('.notif-item').first().click()
  await expect(badge).toHaveText('7')

  await page.reload()
  await expect(badge).toHaveText('7')

  await page.getByRole('button', { name: 'Mark all as read' }).click()
  await expect(badge).toHaveCount(0)
})

test('dismissed notifications disappear', async ({ page }) => {
  const items = page.locator('.notif-item')
  await items.first().getByTitle('Dismiss').click()
  await expect(items).toHaveCount(7)
})
