import { expect, test, type Page } from '@playwright/test'
import { ALEX, COORDINATOR, PRIYA, login, logout, sidebarLink, useMockMode } from './helpers'

// The seed data only pre-allocates classes in the past, and only upcoming
// classes can be swapped — so the coordinator first gives Priya the
// CAB302 Wednesday workshop through the Allocations page.
async function coordinatorAssignsWorkshopToPriya(page: Page) {
  await login(page, COORDINATOR)
  await sidebarLink(page, 'Allocations').click()
  await page.getByRole('button', { name: 'Allocate →' }).first().click()
  const workshop = page.locator('.allocation-card', { hasText: 'Workshop' })
  await workshop.getByRole('button', { name: PRIYA.name }).click()
  await expect(workshop.locator('.allocation-assigned-name')).toHaveText(PRIYA.name)
  await logout(page)
}

async function priyaRequestsSwapToAlex(page: Page, reason: string) {
  await login(page, PRIYA)
  await sidebarLink(page, 'Emergency Swap').click()
  await expect(page.getByRole('heading', { name: 'Emergency Class Swap' })).toBeVisible()

  await page.getByRole('button', { name: 'Request swap' }).first().click()
  await page.getByLabel('Hand off to').selectOption({ label: ALEX.name })
  await page.getByPlaceholder(/Family emergency/).fill(reason)
  await page.getByRole('button', { name: 'Send Request' }).click()

  await expect(page.locator('main')).toContainText(`To ${ALEX.name}`)
  await logout(page)
}

test.beforeEach(async ({ page }) => {
  await useMockMode(page)
  await coordinatorAssignsWorkshopToPriya(page)
})

test('tutor hands off a class, colleague accepts, coordinator is notified', async ({ page }) => {
  await priyaRequestsSwapToAlex(page, 'Sick')

  await login(page, ALEX)
  await sidebarLink(page, 'Emergency Swap').click()
  await expect(page.locator('main')).toContainText(`From ${PRIYA.name}`)
  await page.getByRole('button', { name: 'Accept', exact: true }).click()
  await expect(page.getByText('Class accepted — it now belongs to you.')).toBeVisible()
  await logout(page)

  await login(page, COORDINATOR)
  await sidebarLink(page, /^Notifications/).click()
  const notice = page.locator('.notif-item', { hasText: 'Emergency Swap Completed' })
  await expect(notice).toBeVisible()
  await expect(notice).not.toContainText(PRIYA.name) // collapsed until clicked
  await notice.click()
  await expect(notice).toContainText(PRIYA.name)
  await expect(notice).toContainText(ALEX.name)
  await expect(notice).toContainText('Sick')

  await page.getByRole('button', { name: /^Emergency Swaps/ }).click()
  await expect(page.locator('.notif-item')).toHaveCount(1)
})

test('declining a swap keeps the class with the original tutor', async ({ page }) => {
  await priyaRequestsSwapToAlex(page, 'Clash')

  await login(page, ALEX)
  await sidebarLink(page, 'Emergency Swap').click()
  await page.getByRole('button', { name: 'Decline', exact: true }).click()
  await expect(page.getByText('Swap request declined.')).toBeVisible()
  await logout(page)

  await login(page, PRIYA)
  await sidebarLink(page, 'Emergency Swap').click()
  await expect(page.locator('main')).toContainText('Declined')

  await logout(page)
  await login(page, COORDINATOR)
  await sidebarLink(page, /^Notifications/).click()
  await expect(page.locator('.notif-item', { hasText: 'Emergency Swap Completed' })).toHaveCount(0)
})
