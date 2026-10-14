import { expect, test } from '@playwright/test'
import { backend, field, loginViaUi, logoutButton, sidebarLink, signIn, uid } from './support/backend'

test.describe('Coordinator creates tutor accounts', () => {
  test('create an account, see it listed, and the tutor can log in with the temporary password', async ({ page }) => {
    const coord = await backend.coordinator()
    const email = `${uid('e2e-new-tutor-')}@example.com`
    await signIn(page, coord)
    await sidebarLink(page, 'Tutors').click()

    await page.getByRole('button', { name: '+ Create Account' }).first().click()
    const modal = page.locator('.modal')
    await field(page, 'Full Name').fill('E2E Created Tutor')
    await field(page, 'University Email').fill(email)
    await field(page, 'Temporary Password').fill('TempPass1!')
    await modal.getByRole('button', { name: 'Create & Send Email' }).click()

    await expect(modal.getByRole('heading', { name: 'Account Created' })).toBeVisible()
    // Email is switched off for test runs, so the app must say so honestly.
    await expect(modal).toContainText('failed to send')
    await modal.getByRole('button', { name: 'Done' }).click()

    const row = page.locator('.tutors-table-row', { hasText: email })
    await expect(row).toContainText('E2E Created Tutor')
    await expect(row).toContainText('Not sent')

    await logoutButton(page).click()
    await loginViaUi(page, email, 'TempPass1!')
    await expect(page).toHaveURL(/\/staff$/)
  })

  test('"Generate" fills in a temporary password', async ({ page }) => {
    const coord = await backend.coordinator()
    await signIn(page, coord, '/coordinator/tutors')
    await page.getByRole('button', { name: '+ Create Account' }).first().click()
    await page.getByRole('button', { name: 'Generate' }).click()
    await expect(field(page, 'Temporary Password')).not.toHaveValue('')
  })

  test('creating an account with an email that already exists shows an error', async ({ page }) => {
    const coord = await backend.coordinator()
    const existing = await backend.tutor(coord, 'Existing Tutor')
    await signIn(page, coord, '/coordinator/tutors')
    await page.getByRole('button', { name: '+ Create Account' }).first().click()
    await field(page, 'Full Name').fill('Duplicate')
    await field(page, 'University Email').fill(existing.email)
    await field(page, 'Temporary Password').fill('TempPass1!')
    await page.getByRole('button', { name: 'Create & Send Email' }).click()
    await expect(page.getByText('Failed to create account. Email may already be registered.')).toBeVisible()
  })

  test('each coordinator only sees the tutor accounts they created', async ({ page }) => {
    test.fail(true, 'Known issue: GET /api/users/created-tutors returns every coordinator\'s tutors (findByCoordinatorCreatedTrue), not just the current coordinator\'s.')
    const a = await backend.coordinator()
    const b = await backend.coordinator()
    const tutorOfA = await backend.tutor(a, 'Tutor Of A')
    await signIn(page, b, '/coordinator/tutors')
    await expect(page.getByRole('heading', { name: 'Created Accounts' })).toBeVisible()
    await expect(page.locator('main')).not.toContainText(tutorOfA.email)
  })
})
