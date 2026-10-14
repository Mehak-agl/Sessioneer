import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";

function StaffSidebar() {
  const fullName = localStorage.getItem('sessioneer_name') || 'Staff';
  const initials = fullName.split(' ').map((n: string) => n[0]).join('');
  const photo = localStorage.getItem('tutor_photo');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUnread = () => {
      api.getMyNotifications()
        .then((data: { read: boolean }[]) => setUnreadCount(data.filter(n => !n.read).length))
        .catch(() => {});
    };
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const navigate = useNavigate();

  const goToProfile = () => navigate('/staff-profile');

  const handleLogout = () => {
    localStorage.removeItem('sessioneer_token');
    localStorage.removeItem('sessioneer_role');
    localStorage.removeItem('sessioneer_name');
    navigate('/');
  };

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
        onClick={goToProfile}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            goToProfile()
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
        <Link to="/staff">Dashboard</Link>
        <Link to="/staff-units">My Units</Link>
        <Link to="/staff-calendar">Calendar</Link>
                <Link to="/staff-notifications" className="notif-nav-link">
          Notification
          {unreadCount > 0 && (
            <span className="sidebar-notif-badge">{unreadCount}</span>
          )}
        </Link>
        <Link to="/staff-chat">Chat</Link>
        <Link to="/staff-swaps">Emergency Swap</Link>
      </nav>

      <div className="staff-menu-divider" />

      <button type="button" className="staff-logout-btn" onClick={handleLogout}>
        <span className="staff-logout-icon">⏻</span> Logout
      </button>
    </aside>
  );
}

export default StaffSidebar;
