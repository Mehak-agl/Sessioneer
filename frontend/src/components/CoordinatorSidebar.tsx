import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../services/api'

function CoordinatorSidebar() {
  const fullName = localStorage.getItem('sessioneer_name') || 'Coordinator'
  const initials = fullName.split(' ').map((n: string) => n[0]).join('')
  const photo = localStorage.getItem('coordinator_photo')
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname

  useEffect(() => {
    const loadUnread = () => {
      api.getMyNotifications()
        .then((data: { read: boolean }[]) => setUnreadCount(data.filter(n => !n.read).length))
        .catch(() => {})
    }
    loadUnread()
    const interval = setInterval(loadUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  const goToProfile = () => navigate('/coordinator-profile')

  const handleLogout = () => {
    localStorage.removeItem('sessioneer_token')
    localStorage.removeItem('sessioneer_role')
    localStorage.removeItem('sessioneer_name')
    navigate('/')
  }

  return (
    <aside className="coord-sidebar">
      <div className="coord-logo">
        <img src="/logo.png" alt="Sessioneer logo" />
        <div>
          <h2>SESSIONEER</h2>
          <p>Coordinator Portal</p>
        </div>
      </div>

      <div
        className="coord-profile clickable"
        role="button"
        tabIndex={0}
        onClick={goToProfile}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            goToProfile()
          }
        }}
      >
        {photo ? (
          <img src={photo} alt={fullName} className="coord-avatar sidebar-avatar-photo" />
        ) : (
          <div className="coord-avatar">{initials}</div>
        )}
        <div>
          <h3>{fullName}</h3>
          <p>Coordinator</p>
        </div>
      </div>

      <nav className="coord-menu">
        <Link className={path === '/coordinator' ? 'active' : ''} to="/coordinator">Dashboard</Link>
        <Link className={path === '/coordinator/units' ? 'active' : ''} to="/coordinator/units">My Units</Link>
        <Link className={path === '/calendar' ? 'active' : ''} to="/calendar">Calendar</Link>
        <Link className={path === '/coordinator/tutors' ? 'active' : ''} to="/coordinator/tutors">Tutors</Link>
        <Link className={path === '/coordinator/allocations' ? 'active' : ''} to="/coordinator/allocations">Allocations</Link>
        <Link className={path === '/coordinator/reports' ? 'active' : ''} to="/coordinator/reports">Reports</Link>
        <Link to="/coordinator-notifications" className={`notif-nav-link${path === '/coordinator-notifications' ? ' active' : ''}`}>
          Notifications
          {unreadCount > 0 && (
            <span className="sidebar-notif-badge">{unreadCount}</span>
          )}
        </Link>
        <Link className={path === '/coordinator-chat' ? 'active' : ''} to="/coordinator-chat">Chat</Link>
      </nav>

      <div className="coord-menu-divider" />

      <button type="button" className="coord-logout-btn" onClick={handleLogout}>
        <span className="coord-logout-icon">⏻</span> Logout
      </button>
    </aside>
  )
}

export default CoordinatorSidebar
