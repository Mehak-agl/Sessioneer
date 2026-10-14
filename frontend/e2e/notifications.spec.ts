import { expect, test } from '@playwright/test'
import { backend, sidebarLink, signIn } from './support/backend'

// A tutor invited to two units and allocated one class => 3 notifications.
async function tutorWithNotifications() {
  const coord = await backend.coordinator()
  const unitA = await backend.unit(coord, 'E2E Notify A')
  const unitB = await backend.unit(coord, 'E2E Notify B')
  const [session] = await backend.weeklySessions(coord, unitA.id, { count: 1 })
  const tutor = await backend.tutor(coord, 'Notified Tutor')
  await backend.invite(coord, unitA.id, tutor)
  await backend.invite(coord, unitB.id, tutor)
  await backend.allocate(coord, session.id, tutor)
  return { coord, unitA, unitB, tutor }
}

test.describe('Notifications (real backend)', () => {
  test('tutor sees their notifications with an unread badge in the sidebar', async ({ page }) => {
    const { unitA, unitB, tutor } = await tutorWithNotifications()
    await signIn(page, tutor)
    await expect(sidebarLink(page, /^Notification/).locator('.sidebar-notif-badge')).toHaveText('3')

    await sidebarLink(page, /^Notification/).click()
    const items = page.locator('.notif-item')
    await expect(items).toHaveCount(3)
    await expect(page.locator('.notif-item.unread')).toHaveCount(3)
    await expect(page.locator('main')).toContainText(unitA.code)
    await expect(page.locator('main')).toContainText(unitB.code)
  })

  test('filter by type and by unread', async ({ page }) => {
    const { tutor } = await tutorWithNotifications()
    await signIn(page, tutor, '/staff-notifications')
    const items = page.locator('.notif-item')
    await expect(items).toHaveCount(3)

    await page.getByRole('button', { name: 'Invitation', exact: true }).click()
    await expect(items).toHaveCount(2)
    await page.getByRole('button', { name: 'Allocation', exact: true }).click()
    await expect(items).toHaveCount(1)
    await expect(items.first()).toContainText('Session Allocated')

    await page.getByRole('button', { name: 'All Types' }).click()
    await items.first().click()
    await page.getByRole('button', { name: /^Unread/ }).click()
    await expect(items).toHaveCount(2)
  })

  test('clicking a notification marks it read on the server', async ({ page }) => {
    const { tutor } = await tutorWithNotifications()
    await signIn(page, tutor, '/staff-notifications')
    await page.locator('.notif-item').first().click()
    await expect(page.locator('.notif-item.unread')).toHaveCount(2)
    await expect.poll(async () => (await backend.notifications(tutor)).filter(n => n.read).length).toBe(1)

    await page.reload()
    await expect(page.locator('.notif-item.unread')).toHaveCount(2)
  })

  test('"Mark all as read" clears everything and survives a reload', async ({ page }) => {
    const { tutor } = await tutorWithNotifications()
    await signIn(page, tutor, '/staff-notifications')
    await page.getByRole('button', { name: 'Mark all as read' }).click()
    await expect(page.locator('.notif-item.unread')).toHaveCount(0)
    await expect.poll(async () => (await backend.notifications(tutor)).every(n => n.read)).toBe(true)

    await page.reload()
    await expect(page.locator('.notif-item.unread')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Mark all as read' })).toHaveCount(0)
  })

  test('a user cannot mark someone else\'s notification as read', async () => {
    const { coord, tutor } = await tutorWithNotifications()
    const [note] = await backend.notifications(tutor)
    await expect(backend.call('POST', `/notifications/${note.id}/read`, coord.token)).rejects.toThrow()
    expect((await backend.notifications(tutor)).find(n => n.id === note.id)?.read).toBe(false)
  })

  test('coordinator notifications page lists their notifications', async ({ page }) => {
    const coord = await backend.coordinator()
    await signIn(page, coord)
    await sidebarLink(page, /^Notifications/).click()
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
    await expect(page.getByText('No notifications')).toBeVisible()
  })
})
