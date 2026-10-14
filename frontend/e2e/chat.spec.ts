import { expect, test } from '@playwright/test'
import { backend, signIn } from './support/backend'

test.describe('Chat', () => {
  test('coordinator messages a tutor and the tutor sees it', async ({ page }) => {
    const coord = await backend.coordinator('Chatty Coordinator')
    const tutor = await backend.tutor(coord, `Chat Tutor ${Date.now().toString(36)}`)

    await signIn(page, coord, '/coordinator-chat')
    await page.getByPlaceholder('Search people to message...').fill(tutor.fullName)
    await page.locator('.chat-list-item', { hasText: tutor.email }).click()
    await page.getByPlaceholder('Type a message...').fill('Hello from the E2E test')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.locator('main')).toContainText('Hello from the E2E test')

    const thread = await backend.call<any[]>('GET', `/messages/with/${tutor.id}`, coord.token)
    expect(thread.map(m => m.content)).toContain('Hello from the E2E test')

    await signIn(page, tutor, '/staff-chat')
    await page.locator('.chat-list-item', { hasText: coord.fullName }).click()
    await expect(page.locator('main')).toContainText('Hello from the E2E test')
  })

  test('coordinator creates a group with a tutor and the tutor is a member', async ({ page }) => {
    const coord = await backend.coordinator()
    const tutor = await backend.tutor(coord, `Group Tutor ${Date.now().toString(36)}`)
    const groupName = `E2E Group ${Date.now().toString(36)}`

    await signIn(page, coord, '/coordinator-chat')
    await page.getByTitle('Create group').click()
    const modal = page.locator('.modal, form', { hasText: 'Create group' }).last()
    await modal.getByPlaceholder('e.g. CAB302 Tutors').fill(groupName)
    await modal.locator('label', { hasText: tutor.fullName }).click()
    await modal.getByRole('button', { name: 'Create group' }).click()
    await expect(page.locator('.chat-list-item', { hasText: groupName })).toBeVisible()

    const groups = await backend.call<any[]>('GET', '/groups', tutor.token)
    expect(groups.map(g => g.name)).toContain(groupName)
  })
})
