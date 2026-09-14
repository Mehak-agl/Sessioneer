import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MOCK_TUTOR_NOTIFICATIONS, TUTOR_NOTIF_READ_KEY, TUTOR_NOTIF_EVENT } from '../data/notifications'

function getUnreadCount(): number {
  try {
    const raw = localStorage.getItem(TUTOR_NOTIF_READ_KEY)
    const readIds: string[] = raw ? JSON.parse(raw) : []
    return MOCK_TUTOR_NOTIFICATIONS.filter(n => !readIds.includes(n.id)).length
  } catch {
    return MOCK_TUTOR_NOTIFICATIONS.length
  }
}

function StaffSidebar() {
  const fullName = localStorage.getItem('sessioneer_name') || 'Staff'
  const initials = fullName.split(' ').map((n: string) => n[0]).join('')
  const photo = localStorage.getItem('sessioneer_photo')
  const [unreadCount, setUnreadCount] = useState(getUnreadCount)
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname

  useEffect(() => {
    const handler = () => setUnreadCount(getUnreadCount())
    window.addEventListener(TUTOR_NOTIF_EVENT, handler)
    return () => window.removeEventListener(TUTOR_NOTIF_EVENT, handler)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('sessioneer_token')
    localStorage.removeItem('sessioneer_role')
    localStorage.removeItem('sessioneer_name')
    navigate('/')
  }

  return (
    <aside className="staff-sidebar">
      <div className="staff-logo">
        <img src="/logo.png" alt="Sessioneer logo" />
        <div>
          <h2>SESSIONEER</h2>
          <p>Tutor Portal</p>
        </div>
      </div>

      <div
        className="staff-profile clickable"
        role="button"
        tabIndex={0}
        onClick={() => navigate('/staff-profile')}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate('/staff-profile')
          }
        }}
      >
        {photo ? (
          <img src={photo} alt={fullName} className="staff-avatar sidebar-avatar-photo" />
        ) : (
          <div className="staff-avatar">{initials}</div>
        )}
        <div>
          <h3>{fullName}</h3>
          <p>Tutor</p>
        </div>
      </div>

      <nav className="staff-menu">
        <Link className={path === '/staff' ? 'active' : ''} to="/staff">Dashboard</Link>
        <Link className={path === '/staff-units' ? 'active' : ''} to="/staff-units">My Units</Link>
        <Link className={path === '/staff-calendar' ? 'active' : ''} to="/staff-calendar">Calendar</Link>
        <Link to="/staff-notifications" className={`notif-nav-link${path === '/staff-notifications' ? ' active' : ''}`}>
          Notifications
          {unreadCount > 0 && (
            <span className="sidebar-notif-badge">{unreadCount}</span>
          )}
        </Link>
        <Link className={path === '/staff-chat' ? 'active' : ''} to="/staff-chat">Chat</Link>
        <Link className={path === '/staff-profile' ? 'active' : ''} to="/staff-profile">Profile</Link>
      </nav>

      <div className="staff-menu-divider" />

      <button type="button" className="staff-logout-btn" onClick={handleLogout}>
        <span className="staff-logout-icon">⏻</span> Logout
      </button>
    </aside>
  )
}

export default StaffSidebar