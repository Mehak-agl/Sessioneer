import { expect, test } from '@playwright/test'
import { ALEX, COORDINATOR, login, logout, useMockMode } from './helpers'

test.beforeEach(async ({ page }) => {
  await useMockMode(page)
})

test('coordinator signs in and lands on the coordinator dashboard', async ({ page }) => {
  await login(page, COORDINATOR)
  await expect(page).toHaveURL(/\/coordinator$/)
  await expect(page.locator('aside')).toContainText(COORDINATOR.name)
  await expect(page.locator('aside')).toContainText('Coordinator Portal')
})

test('tutor signs in and lands on the tutor dashboard', async ({ page }) => {
  await login(page, ALEX)
  await expect(page).toHaveURL(/\/staff$/)
  await expect(page.getByRole('heading', { name: 'Tutor Dashboard' })).toBeVisible()
  await expect(page.locator('aside')).toContainText('Tutor Portal')
})

test('wrong password shows an error and stays on the login page', async ({ page }) => {
  await page.getByLabel('Email').fill(COORDINATOR.email)
  await page.getByPlaceholder('Enter your password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByText('Invalid email or password.')).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})

test('password can be shown and hidden', async ({ page }) => {
  const password = page.getByPlaceholder('Enter your password')
  await password.fill('secret')
  await expect(password).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(password).toHaveAttribute('type', 'text')
})

test('logout returns to the login page', async ({ page }) => {
  await login(page, COORDINATOR)
  await logout(page)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('mock mode toggle shows demo logins', async ({ page }) => {
  await page.getByRole('button', { name: 'Mock Mode' }).click()
  await expect(page.getByText('Mock mode is ON')).toBeVisible()
  await expect(page.getByText(`Coordinator: ${COORDINATOR.email}`)).toBeVisible()
})
