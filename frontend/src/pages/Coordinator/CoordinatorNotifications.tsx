import { useState } from 'react'
import CoordinatorSidebar from '../../components/CoordinatorSidebar'
import { MOCK_NOTIFICATIONS, NOTIF_READ_KEY, NOTIF_EVENT, type NotifType } from '../../data/notifications'

const ICON: Record<NotifType, { symbol: string; bg: string }> = {
  availability:         { symbol: '◷', bg: '#0097B2' },
  invitation_accepted:  { symbol: '✓', bg: '#16a34a' },
  invitation_declined:  { symbol: '✕', bg: '#dc2626' },
  allocation_confirmed: { symbol: '✓', bg: '#059669' },
  allocation_rejected:  { symbol: '✕', bg: '#b91c1c' },
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'Yesterday' : `${d}d ago`
}

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIF_READ_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...ids]))
  window.dispatchEvent(new Event(NOTIF_EVENT))
}

export default function CoordinatorNotifications() {
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const markRead = (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }

  const markAllRead = () => {
    const all = new Set(MOCK_NOTIFICATIONS.map(n => n.id))
    setReadIds(all)
    saveReadIds(all)
  }

  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !readIds.has(n.id)).length
  const filtered = MOCK_NOTIFICATIONS.filter(n =>
    filter === 'unread' ? !readIds.has(n.id) : true
  )

  return (
    <div className="dashboard-page">
      <CoordinatorSidebar />
      <main className="main-content">
        <header className="topbar">
          <div className="page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Notifications</h1>
              <p>Activity updates from your tutors</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button className="add-btn" onClick={markAllRead}>
              Mark all as read
            </button>
          )}
        </header>

        <div className="notif-filter-tabs">
          <button
            className={`notif-tab${filter === 'all' ? ' active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All <span className="notif-tab-count">{MOCK_NOTIFICATIONS.length}</span>
          </button>
          <button
            className={`notif-tab${filter === 'unread' ? ' active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread <span className="notif-tab-count">{unreadCount}</span>
          </button>
        </div>

        <div className="notif-list">
          {filtered.length === 0 ? (
            <div className="notif-empty">
              <p>No {filter === 'unread' ? 'unread ' : ''}notifications</p>
            </div>
          ) : (
            filtered.map(n => {
              const icon = ICON[n.type]
              const isUnread = !readIds.has(n.id)
              return (
                <div
                  key={n.id}
                  className={`notif-item${isUnread ? ' unread' : ''}`}
                  onClick={() => markRead(n.id)}
                >
                  <div className="notif-icon" style={{ background: icon.bg }}>
                    {icon.symbol}
                  </div>
                  <div className="notif-body">
                    <div className="notif-header-row">
                      <span className="notif-title">{n.title}</span>
                      <span className="notif-time">{timeAgo(n.time)}</span>
                    </div>
                    <p className="notif-message">{n.message}</p>
                    <div className="notif-footer">
                      <span className="unit-code-badge">{n.unit}</span>
                      {isUnread && <span className="notif-unread-dot" />}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
