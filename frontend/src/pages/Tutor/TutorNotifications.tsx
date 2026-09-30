import { useState } from 'react'
import StaffSidebar from '../../components/TutorSidebar'
import { MOCK_TUTOR_NOTIFICATIONS, TUTOR_NOTIF_READ_KEY, TUTOR_NOTIF_EVENT, type TutorNotifType } from '../../data/notifications'

const ICON: Record<TutorNotifType, { symbol: string; bg: string }> = {
  invitation:    { symbol: '✉', bg: '#0097B2' },
  allocation:    { symbol: '✓', bg: '#16a34a' },
  deadline:      { symbol: '⏰', bg: '#d97706' },
  swap_approved: { symbol: '↔', bg: '#059669' },
  swap_declined: { symbol: '✕', bg: '#dc2626' },
}

const TYPE_LABEL: Record<TutorNotifType, string> = {
  invitation:    'Invitation',
  allocation:    'Allocation',
  deadline:      'Deadline',
  swap_approved: 'Swap Approved',
  swap_declined: 'Swap Declined',
}

type TypeFilter = 'all' | TutorNotifType

const TYPE_TABS: { key: TypeFilter; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'invitation',   label: 'Invitations' },
  { key: 'allocation',   label: 'Allocations' },
  { key: 'deadline',     label: 'Deadlines' },
  { key: 'swap_approved',label: 'Swap Approved' },
  { key: 'swap_declined',label: 'Swap Declined' },
]

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
    const raw = localStorage.getItem(TUTOR_NOTIF_READ_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(TUTOR_NOTIF_READ_KEY, JSON.stringify([...ids]))
  window.dispatchEvent(new Event(TUTOR_NOTIF_EVENT))
}

const ALL_UNITS = [...new Set(MOCK_TUTOR_NOTIFICATIONS.map(n => n.unit))].sort()

export default function TutorNotifications() {
  const [readIds, setReadIds]     = useState<Set<string>>(loadReadIds)
  const [filter, setFilter]       = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [unitFilter, setUnitFilter] = useState<string>('all')
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const markRead = (id: string) => {
    if (readIds.has(id)) return
    const next = new Set(readIds).add(id)
    setReadIds(next)
    saveReadIds(next)
  }

  const markAllRead = () => {
    const all = new Set(MOCK_TUTOR_NOTIFICATIONS.map(n => n.id))
    setReadIds(all)
    saveReadIds(all)
  }

  const deleteNotif = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletedIds(prev => new Set(prev).add(id))
  }

  const live = MOCK_TUTOR_NOTIFICATIONS.filter(n => !deletedIds.has(n.id))
  const unreadCount = live.filter(n => !readIds.has(n.id)).length

  const filtered = live.filter(n => {
    if (filter === 'unread' && readIds.has(n.id)) return false
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    if (unitFilter !== 'all' && n.unit !== unitFilter) return false
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

        {/* All / Unread tabs */}
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

        {/* Type filter tabs */}
        <div className="notif-type-tabs">
          {TYPE_TABS.map(tab => {
            const count = live.filter(n => tab.key === 'all' || n.type === tab.key).length
            return (
              <button
                key={tab.key}
                className={`notif-type-tab${typeFilter === tab.key ? ' active' : ''}`}
                onClick={() => setTypeFilter(tab.key)}
              >
                {tab.label}
                {tab.key !== 'all' && <span className="notif-tab-count">{count}</span>}
              </button>
            )
          })}

          {/* Unit filter */}
          <select
            className="notif-unit-select"
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
          >
            <option value="all">All Units</option>
            {ALL_UNITS.map(u => (
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
                          onClick={e => deleteNotif(e, n.id)}
                          title="Dismiss"
                        >✕</button>
                      </div>
                    </div>
                    <p className="notif-message">{n.message}</p>
                    <div className="notif-footer">
                      <span className="unit-code-badge">{n.unit}</span>
                      <span className="notif-type-badge">{TYPE_LABEL[n.type]}</span>
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
