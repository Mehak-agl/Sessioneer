import { expect, test } from '@playwright/test'
import { COORDINATOR, JAMES, PRIYA, login, logout, sidebarLink, useMockMode } from './helpers'

test.beforeEach(async ({ page }) => {
  await useMockMode(page)
})

test('tutor accepts a pending unit invitation and the coordinator sees it', async ({ page }) => {
  await login(page, JAMES)
  await sidebarLink(page, 'My Units').click()

  const card = page.locator('.myunits-unit-card', { hasText: 'CAB302' })
  await expect(card).toContainText('Pending')
  await card.click()
  await page.getByRole('button', { name: 'Accept', exact: true }).click()

  await expect(page.getByText('✓ Accepted')).toBeVisible()
  await expect(card).toContainText('Accepted')
  await expect(page.getByRole('heading', { name: 'Scheduled Classes' })).toBeVisible()

  // Survives a reload, so it was saved, not just local state.
  await page.reload()
  await expect(page.locator('.myunits-unit-card', { hasText: 'CAB302' })).toContainText('Accepted')

  await logout(page)
  await login(page, COORDINATOR)
  await sidebarLink(page, 'My Units').click()
  await page.locator('.unit-row', { hasText: 'CAB302' }).getByRole('button', { name: 'Manage →' }).click()
  await expect(page.locator('main')).toContainText(JAMES.name)
})

test('coordinator auto-allocates from the smart draft and the tutor sees the class', async ({ page }) => {
  await login(page, COORDINATOR)
  await sidebarLink(page, 'Allocations').click()
  await page.locator('.unit-row, .unit-card, div', { hasText: 'Software Development' })
    .getByRole('button', { name: 'Allocate →' }).first().click()
  await expect(page.getByRole('heading', { name: 'CAB302 — Allocations' })).toBeVisible()

  await page.getByRole('button', { name: 'Auto Allocate' }).click()
  const draft = page.locator('.auto-alloc-modal')
  await expect(draft.getByRole('heading', { name: 'Smart Draft Allocation' })).toBeVisible()

  // Priya submitted availability for the Wednesday workshop in the seed data.
  const workshop = draft.locator('.auto-alloc-row', { hasText: 'Workshop' })
  await expect(workshop).toContainText(PRIYA.name)
  await expect(workshop).toContainText('Availability match')

  await draft.getByRole('button', { name: /^Apply \d+ Allocation/ }).click()
  await expect(draft).toBeHidden()

  const workshopCard = page.locator('.allocation-card', { hasText: 'Workshop' })
  await expect(workshopCard.locator('.allocation-assigned-name')).toHaveText(PRIYA.name)

  await logout(page)
  await login(page, PRIYA)
  await expect(page.getByRole('heading', { name: 'Allocated Classes' })).toBeVisible()
  await expect(page.locator('main')).toContainText('Workshop')
})

test('skipping a draft suggestion leaves that class unallocated', async ({ page }) => {
  await login(page, COORDINATOR)
  await sidebarLink(page, 'Allocations').click()
  await page.getByRole('button', { name: 'Allocate →' }).first().click()
  await page.getByRole('button', { name: 'Auto Allocate' }).click()

  const draft = page.locator('.auto-alloc-modal')
  const workshop = draft.locator('.auto-alloc-row', { hasText: 'Workshop' })
  await workshop.getByRole('button', { name: 'Include' }).click()
  await expect(workshop.getByRole('button', { name: 'Skip' })).toBeVisible()
  await expect(draft.locator('.auto-alloc-stat.skipped')).toHaveText('1 skipped')

  await draft.getByRole('button', { name: /^Apply \d+ Allocation/ }).click()
  await expect(draft).toBeHidden()
  const workshopCard = page.locator('.allocation-card', { hasText: 'Workshop' })
  await expect(workshopCard.locator('.allocation-assigned')).toHaveCount(0)
  await expect(workshopCard.getByRole('button', { name: PRIYA.name })).toBeVisible()
})
