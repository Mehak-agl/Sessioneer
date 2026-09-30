import { expect, test } from '@playwright/test'
import { ALEX, COORDINATOR, login, sidebarLink, useMockMode } from './helpers'

test.beforeEach(async ({ page }) => {
  await useMockMode(page)
})

test('every coordinator sidebar link opens its page', async ({ page }) => {
  await login(page, COORDINATOR)
  const pages: [string, RegExp][] = [
    ['My Units', /\/coordinator\/units$/],
    ['Calendar', /\/calendar$/],
    ['Create Accounts', /\/coordinator\/tutors$/],
    ['Allocations', /\/coordinator\/allocations$/],
    ["Tutor's Resume", /\/coordinator\/reports$/],
    ['Notifications', /\/coordinator-notifications$/],
    ['Chat', /\/coordinator-chat$/],
    ['Dashboard', /\/coordinator$/],
  ]
  for (const [name, url] of pages) {
    await sidebarLink(page, new RegExp(`^${name}`)).click()
    await expect(page).toHaveURL(url)
    await expect(sidebarLink(page, new RegExp(`^${name}`))).toHaveClass(/active/)
  }
})

test('every tutor sidebar link opens its page', async ({ page }) => {
  await login(page, ALEX)
  const pages: [string, RegExp][] = [
    ['My Units', /\/staff-units$/],
    ['Emergency Swap', /\/staff-swaps$/],
    ['Calendar', /\/staff-calendar$/],
    ['Notifications', /\/staff-notifications$/],
    ['Chat', /\/staff-chat$/],
    ['Dashboard', /\/staff$/],
  ]
  for (const [name, url] of pages) {
    await sidebarLink(page, new RegExp(`^${name}`)).click()
    await expect(page).toHaveURL(url)
  }
})

test('clicking the avatar opens the profile page', async ({ page }) => {
  await login(page, ALEX)
  await page.locator('.staff-profile').click()
  await expect(page).toHaveURL(/\/staff-profile$/)

  await login(page, COORDINATOR)
  await page.locator('.coord-profile').click()
  await expect(page).toHaveURL(/\/coordinator-profile$/)
})

test('unknown URLs redirect to the login page', async ({ page }) => {
  await page.goto('/this-page-does-not-exist')
  await expect(page).toHaveURL(/\/$/)
})
