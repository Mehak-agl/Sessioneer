import { useEffect, useState } from 'react'
import StaffSidebar from '../../components/TutorSidebar'
import { api } from '../../services/api'

interface AppNotification {
  id: number
  type: string
  title: string
  message: string
  unitCode: string | null
  read: boolean
  createdAt: string
}

const ICON: Record<string, { symbol: string; bg: string }> = {
  INVITATION:    { symbol: '✉', bg: '#0097B2' },
  ALLOCATION:    { symbol: '✓', bg: '#16a34a' },
  SWAP_REQUEST:  { symbol: '↔', bg: '#d97706' },
  SWAP_RESPONSE: { symbol: '↔', bg: '#059669' },
  SWAP_FYI:      { symbol: 'ℹ', bg: '#6366f1' },
}

const TYPE_LABEL: Record<string, string> = {
  INVITATION:    'Invitation',
  ALLOCATION:    'Allocation',
  SWAP_REQUEST:  'Swap Request',
  SWAP_RESPONSE: 'Swap Response',
  SWAP_FYI:      'Swap FYI',
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

export default function TutorNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    api.getMyNotifications()
      .then((data: AppNotification[]) => setNotifications(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const markRead = async (id: number) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    try {
      await api.markNotificationRead(id)
    } catch (err) {
      console.error(err)
    }
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    try {
      await api.markAllNotificationsRead()
    } catch (err) {
      console.error(err)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const types = [...new Set(notifications.map(n => n.type))]

  const filtered = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    return true
  })

  return (
    <div className="dashboard-page">
      <StaffSidebar />
      <main className="staff-main-content">
        <header className="staff-topbar">
          <div className="staff-page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Notifications</h1>
              <p>Updates from your coordinators</p>
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
            All <span className="notif-tab-count">{notifications.length}</span>
          </button>
          <button
            className={`notif-tab${filter === 'unread' ? ' active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread <span className="notif-tab-count">{unreadCount}</span>
          </button>
        </div>

        {types.length > 0 && (
          <div className="notif-type-tabs">
            <button
              className={`notif-type-tab${typeFilter === 'all' ? ' active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              All Types
            </button>
            {types.map(t => (
              <button
                key={t}
                className={`notif-type-tab${typeFilter === t ? ' active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {TYPE_LABEL[t] || t}
              </button>
            ))}
          </div>
        )}

        <div className="notif-list">
          {loading ? (
            <p className="tutors-loading">Loading notifications…</p>
          ) : filtered.length === 0 ? (
            <div className="notif-empty">
              <p>No {filter === 'unread' ? 'unread ' : ''}notifications</p>
            </div>
          ) : (
            filtered.map(n => {
              const icon = ICON[n.type] || { symbol: '🔔', bg: '#64748b' }
              const isUnread = !n.read
              return (
                <div
                  key={n.id}
                  className={`notif-item${isUnread ? ' unread' : ''}`}
                  onClick={() => isUnread && markRead(n.id)}
                >
                  <div className="notif-icon" style={{ background: icon.bg }}>
                    {icon.symbol}
                  </div>
                  <div className="notif-body">
                    <div className="notif-header-row">
                      <span className="notif-title">{n.title}</span>
                      <span className="notif-time">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="notif-message">{n.message}</p>
                    <div className="notif-footer">
                      {n.unitCode && <span className="unit-code-badge">{n.unitCode}</span>}
                      <span className="notif-type-badge">{TYPE_LABEL[n.type] || n.type}</span>
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