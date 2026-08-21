import { useState } from 'react'
import CoordinatorSidebar from '../../components/CooordinatorSidebar'
import { MOCK_NOTIFICATIONS, NOTIF_READ_KEY, NOTIF_EVENT, type NotifType } from '../../data/notifications'

type TypeFilter = 'all' | 'availability' | 'invitation' | 'allocation'

const TYPE_TABS: { key: TypeFilter; label: string }[] = [
  { key: 'all',          label: 'All Types'    },
  { key: 'availability', label: 'Availability' },
  { key: 'invitation',   label: 'Invitations'  },
  { key: 'allocation',   label: 'Allocations'  },
]

function matchesType(type: NotifType, filter: TypeFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'availability') return type === 'availability'
  if (filter === 'invitation') return type === 'invitation_accepted' || type === 'invitation_declined'
  if (filter === 'allocation') return type === 'allocation_confirmed' || type === 'allocation_rejected'
  return true
}

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
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [unitFilter, setUnitFilter] = useState<string>('all')
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const allUnits = Array.from(new Set(MOCK_NOTIFICATIONS.map(n => n.unit))).sort()

  const deleteNotif = (id: string) => {
    setDeletedIds(prev => new Set(prev).add(id))
  }

  const markRead = (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }

  const markAllRead = () => {
    const all = new Set(live.map(n => n.id))
    setReadIds(all)
    saveReadIds(all)
  }

  const live = MOCK_NOTIFICATIONS.filter(n => !deletedIds.has(n.id))
  const unreadCount = live.filter(n => !readIds.has(n.id)).length

  // base = respects read filter; used for type tab counts
  const base = live.filter(n =>
    filter === 'unread' ? !readIds.has(n.id) : true
  )

  const filtered = base.filter(n =>
    matchesType(n.type, typeFilter) &&
    (unitFilter === 'all' || n.unit === unitFilter)
  )

  const typeCount = (key: TypeFilter) =>
    base.filter(n => matchesType(n.type, key)).length

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
            All <span className="notif-tab-count">{live.length}</span>
          </button>
          <button
            className={`notif-tab${filter === 'unread' ? ' active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread <span className="notif-tab-count">{unreadCount}</span>
          </button>
        </div>

        <div className="notif-type-tabs">
          <span className="notif-type-label">Type:</span>
          {TYPE_TABS.map(tab => (
            <button
              key={tab.key}
              className={`notif-type-tab${typeFilter === tab.key ? ' active' : ''}`}
              onClick={() => setTypeFilter(tab.key)}
            >
              {tab.label}
              <span className="notif-tab-count">{typeCount(tab.key)}</span>
            </button>
          ))}
          <select
            className="notif-unit-select"
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
          >
            <option value="all">All Units</option>
            {allUnits.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
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
                      <div className="notif-header-actions">
                        <span className="notif-time">{timeAgo(n.time)}</span>
                        <button
                          className="notif-delete-btn"
                          onClick={e => { e.stopPropagation(); deleteNotif(n.id) }}
                          title="Dismiss"
                        >
                          ✕
                        </button>
                      </div>
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
