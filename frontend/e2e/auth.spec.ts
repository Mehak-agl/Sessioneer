import { expect, test } from '@playwright/test'
import { API, backend, loginViaUi, logoutButton, signIn, uid } from './support/backend'

test.describe('Sign up and login', () => {
  test('a coordinator can sign up and lands on the coordinator dashboard', async ({ page }) => {
    const email = `${uid('e2e-signup-')}@example.com`
    await page.goto('/signup')
    await page.getByLabel('Full Name').fill('E2E Signup Coordinator')
    await page.getByLabel('Email').fill(email)
    await page.locator('#password').fill('Signup123!')
    await page.locator('#confirmPassword').fill('Signup123!')
    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page).toHaveURL(/\/coordinator$/)
    await expect(page.locator('aside')).toContainText('E2E Signup Coordinator')

    const res = await backend.login(email, 'Signup123!')
    expect(res.role).toBe('COORDINATOR')
  })

  test('signup rejects mismatched passwords without calling the backend', async ({ page }) => {
    const email = `${uid('e2e-signup-')}@example.com`
    await page.goto('/signup')
    await page.getByLabel('Full Name').fill('Mismatch')
    await page.getByLabel('Email').fill(email)
    await page.locator('#password').fill('Signup123!')
    await page.locator('#confirmPassword').fill('Different1!')
    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page.getByText('Passwords do not match.')).toBeVisible()
    await expect(backend.login(email, 'Signup123!')).rejects.toThrow()
  })

  test('coordinator logs in through the login page', async ({ page }) => {
    const coord = await backend.coordinator('E2E Login Coordinator')
    await loginViaUi(page, coord.email, coord.password)
    await expect(page).toHaveURL(/\/coordinator$/)
    await expect(page.locator('aside')).toContainText('Coordinator Portal')
  })

  test('tutor logs in through the login page and lands on the tutor dashboard', async ({ page }) => {
    const coord = await backend.coordinator()
    const tutor = await backend.tutor(coord, 'E2E Login Tutor')
    await loginViaUi(page, tutor.email, tutor.password)
    await expect(page).toHaveURL(/\/staff$/)
    await expect(page.getByRole('heading', { name: 'Tutor Dashboard' })).toBeVisible()
  })

  test('wrong password shows an error and stays on the login page', async ({ page }) => {
    const coord = await backend.coordinator()
    await page.goto('/')
    await page.getByLabel('Email').fill(coord.email)
    await page.getByPlaceholder('Enter your password').fill('not-the-password')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.locator('.login-error')).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
    expect(await page.evaluate(() => localStorage.getItem('sessioneer_token'))).toBeNull()
  })

  test('logout clears the session and returns to login', async ({ page }) => {
    const coord = await backend.coordinator()
    await signIn(page, coord)
    await logoutButton(page).click()
    await expect(page).toHaveURL(/\/$/)
    expect(await page.evaluate(() => localStorage.getItem('sessioneer_token'))).toBeNull()
  })
})

test.describe('Backend access control', () => {
  test('protected endpoints reject requests without a token', async () => {
    for (const path of ['/units', '/notifications/me', '/users/staff', '/swap-requests/me']) {
      const res = await fetch(`${API}${path}`)
      expect(res.status, path).toBe(403)
    }
  })

  test('a coordinator only sees their own units', async () => {
    const a = await backend.coordinator()
    const b = await backend.coordinator()
    const unitA = await backend.unit(a)
    const bUnits = await backend.call<any[]>('GET', '/units', b.token)
    expect(bUnits.map(u => u.id)).not.toContain(unitA.id)
  })
})
