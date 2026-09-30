import { expect, type Page } from '@playwright/test'

// Seed accounts from src/services/mockDb.ts
export const COORDINATOR = { email: 'coordinator@qut.edu.au', password: 'admin123', name: 'Sarah Chen' }
export const ALEX = { email: 'staff@qut.edu.au', password: 'staff123', name: 'Alex Thompson' }
export const PRIYA = { email: 'priya.sharma@gmail.com', password: 'staff123', name: 'Priya Sharma' }
export const JAMES = { email: 'j.wilson@outlook.com', password: 'staff123', name: 'James Wilson' }

// Each test gets a fresh browser context, so this starts from clean seed data.
export async function useMockMode(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('sessioneer_mock_mode', 'true'))
  await page.reload()
}

export async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/')
  await page.getByLabel('Email').fill(user.email)
  await page.getByPlaceholder('Enter your password').fill(user.password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).not.toHaveURL(/\/$/)
}

export async function logout(page: Page) {
  await page.locator('aside').getByRole('button', { name: /Logout/ }).click()
  await expect(page).toHaveURL(/\/$/)
}

export function sidebarLink(page: Page, name: string | RegExp) {
  return page.locator('aside nav').getByRole('link', { name })
}
