import { expect, test } from '@playwright/test'
import { backend, field, loginViaUi, signIn } from './support/backend'

test.describe('Profile', () => {
  test('tutor changes their password and can log in with the new one', async ({ page }) => {
    const coord = await backend.coordinator()
    const tutor = await backend.tutor(coord, 'Password Tutor')
    await signIn(page, tutor, '/staff-profile')

    await field(page, 'Current Password').fill(tutor.password)
    await field(page, 'New Password').fill('NewPass123!')
    await field(page, 'Confirm New Password').fill('NewPass123!')
    await page.getByRole('button', { name: 'Update Password' }).click()
    await expect(page.getByText('Password changed successfully.')).toBeVisible()

    await expect(backend.login(tutor.email, tutor.password)).rejects.toThrow()
    await loginViaUi(page, tutor.email, 'NewPass123!')
    await expect(page).toHaveURL(/\/staff$/)
  })

  test('wrong current password is rejected and the old password still works', async ({ page }) => {
    const coord = await backend.coordinator()
    const tutor = await backend.tutor(coord, 'Wrong Password Tutor')
    await signIn(page, tutor, '/staff-profile')

    await field(page, 'Current Password').fill('definitely-wrong')
    await field(page, 'New Password').fill('NewPass123!')
    await field(page, 'Confirm New Password').fill('NewPass123!')
    await page.getByRole('button', { name: 'Update Password' }).click()
    await expect(page.locator('.password-form .avail-error-message')).toBeVisible()
    await expect(backend.login(tutor.email, tutor.password)).resolves.toBeTruthy()
  })

  test('password form validates before calling the backend', async ({ page }) => {
    const coord = await backend.coordinator()
    const tutor = await backend.tutor(coord, 'Validation Tutor')
    await signIn(page, tutor, '/staff-profile')

    await page.getByRole('button', { name: 'Update Password' }).click()
    await expect(page.getByText('Fill in all three fields.')).toBeVisible()

    await field(page, 'Current Password').fill(tutor.password)
    await field(page, 'New Password').fill('abc')
    await field(page, 'Confirm New Password').fill('abc')
    await page.getByRole('button', { name: 'Update Password' }).click()
    await expect(page.getByText('New password must be at least 6 characters.')).toBeVisible()

    await field(page, 'New Password').fill('NewPass123!')
    await field(page, 'Confirm New Password').fill('Different123!')
    await page.getByRole('button', { name: 'Update Password' }).click()
    await expect(page.getByText('New password and confirmation do not match.')).toBeVisible()
  })

  test('tutor saves a notification email and it is stored on their profile', async ({ page }) => {
    const coord = await backend.coordinator()
    const tutor = await backend.tutor(coord, 'Notify Email Tutor')
    await signIn(page, tutor, '/staff-profile')

    // The browser's own email-field validation blocks an invalid address.
    await field(page, 'Notification Email').fill('not-an-email')
    await page.getByRole('button', { name: 'Save Notification Email' }).click()
    expect(await field(page, 'Notification Email').evaluate(el => el.matches(':invalid'))).toBe(true)
    expect((await backend.call('GET', '/profile', tutor.token)).notificationEmail ?? '').toBe('')

    await field(page, 'Notification Email').fill('alerts@example.com')
    await page.getByRole('button', { name: 'Save Notification Email' }).click()
    await expect(page.getByText('Notification email saved.')).toBeVisible()

    const profile = await backend.call('GET', '/profile', tutor.token)
    expect(profile.notificationEmail).toBe('alerts@example.com')
  })

  test('tutor uploads a profile photo and it is saved to the backend', async ({ page }) => {
    const coord = await backend.coordinator()
    const tutor = await backend.tutor(coord, 'Photo Tutor')
    await signIn(page, tutor, '/staff-profile')

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    )
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: png })
    await expect(page.locator('img.profile-photo-circle')).toBeVisible()
    await expect.poll(async () => Boolean((await backend.call('GET', '/profile', tutor.token)).photo)).toBe(true)
  })

  test('tutor uploads a PDF resume and the coordinator can see it in Tutor Reports', async ({ page }) => {
    const coord = await backend.coordinator()
    const tutor = await backend.tutor(coord, 'Resume Tutor')
    await signIn(page, tutor, '/staff-profile')

    await page.locator('input[type="file"][accept=".pdf"]').setInputFiles({
      name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n'),
    })
    await expect(page.locator('.resume-filename')).toHaveText('resume.pdf')
    await expect.poll(async () => (await backend.call('GET', '/profile', tutor.token)).resumeName).toBe('resume.pdf')

    await signIn(page, coord, '/coordinator/reports')
    await page.getByPlaceholder('Search by name or email...').fill(tutor.email)
    await expect(page.locator('.tutors-table-row', { hasText: tutor.email })).toContainText('Uploaded')
  })

  test('coordinator can change their password too', async ({ page }) => {
    const coord = await backend.coordinator()
    await signIn(page, coord, '/coordinator-profile')
    await field(page, 'Current Password').fill(coord.password)
    await field(page, 'New Password').fill('CoordNew123!')
    await field(page, 'Confirm New Password').fill('CoordNew123!')
    await page.getByRole('button', { name: 'Update Password' }).click()
    await expect(page.getByText('Password changed successfully.')).toBeVisible()
    await expect(backend.login(coord.email, 'CoordNew123!')).resolves.toBeTruthy()
  })
})
