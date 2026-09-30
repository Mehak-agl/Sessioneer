import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TutorNotifications from './TutorNotifications'
import { MOCK_TUTOR_NOTIFICATIONS, TUTOR_NOTIF_READ_KEY } from '../../data/notifications'

const TOTAL = MOCK_TUTOR_NOTIFICATIONS.length

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/staff-notifications']}>
      <TutorNotifications />
    </MemoryRouter>,
  )
}

const items = () => document.querySelectorAll('.notif-item')
const unreadItems = () => document.querySelectorAll('.notif-item.unread')
const sidebarBadge = () => document.querySelector('.sidebar-notif-badge')
const tab = (name: RegExp) => screen.getByRole('button', { name })

describe('TutorNotifications', () => {
  it('shows every notification as unread at first, with a matching sidebar badge', () => {
    renderPage()
    expect(items()).toHaveLength(TOTAL)
    expect(unreadItems()).toHaveLength(TOTAL)
    expect(sidebarBadge()).toHaveTextContent(String(TOTAL))
  })

  it('filters by type', async () => {
    renderPage()
    await userEvent.click(tab(/^Invitations/))
    const invites = MOCK_TUTOR_NOTIFICATIONS.filter(n => n.type === 'invitation')
    expect(items()).toHaveLength(invites.length)
    expect(screen.getAllByText('Unit Invitation')).toHaveLength(invites.length)
  })

  it('filters by unit', async () => {
    renderPage()
    await userEvent.selectOptions(screen.getByRole('combobox'), 'IFN660')
    const expected = MOCK_TUTOR_NOTIFICATIONS.filter(n => n.unit === 'IFN660').length
    expect(items()).toHaveLength(expected)
    items().forEach(el => expect(el.querySelector('.unit-code-badge')).toHaveTextContent('IFN660'))
  })

  it('combines type and unit filters, and shows an empty state when nothing matches', async () => {
    renderPage()
    await userEvent.click(tab(/^Swap Declined/))
    await userEvent.selectOptions(screen.getByRole('combobox'), 'CAB301')
    expect(items()).toHaveLength(0)
    expect(screen.getByText('No notifications')).toBeInTheDocument()
  })

  it('marks one notification read on click, updating the badge and saving it', async () => {
    renderPage()
    await userEvent.click(items()[0] as HTMLElement)
    expect(unreadItems()).toHaveLength(TOTAL - 1)
    expect(sidebarBadge()).toHaveTextContent(String(TOTAL - 1))
    expect(JSON.parse(localStorage.getItem(TUTOR_NOTIF_READ_KEY)!)).toEqual([MOCK_TUTOR_NOTIFICATIONS[0].id])
  })

  it('updates the sidebar badge without React render warnings', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPage()
    await userEvent.click(items()[0] as HTMLElement)
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('"Mark all as read" clears the unread state and hides itself', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))
    expect(unreadItems()).toHaveLength(0)
    expect(sidebarBadge()).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).toBeNull()

    await userEvent.click(tab(/^Unread/))
    expect(screen.getByText('No unread notifications')).toBeInTheDocument()
  })

  it('dismissing removes the notification without marking it read', async () => {
    renderPage()
    const first = items()[0] as HTMLElement
    await userEvent.click(within(first).getByTitle('Dismiss'))
    expect(items()).toHaveLength(TOTAL - 1)
    expect(localStorage.getItem(TUTOR_NOTIF_READ_KEY)).toBeNull()
    expect(tab(/^All\s*\d/)).toHaveTextContent(String(TOTAL - 1))
  })

  it('remembers read notifications across visits', async () => {
    localStorage.setItem(TUTOR_NOTIF_READ_KEY, JSON.stringify(['t1', 't2']))
    renderPage()
    expect(unreadItems()).toHaveLength(TOTAL - 2)
  })
})
