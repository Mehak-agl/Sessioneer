import { Link } from "react-router-dom";

function StaffSidebar() {
  const fullName = localStorage.getItem('sessioneer_name') || 'Staff';
  const initials = fullName.split(' ').map((n: string) => n[0]).join('');
  const photo = localStorage.getItem('sessioneer_photo');

  return (
    <aside className="staff-sidebar">
      <div className="staff-logo">
        <img src="/logo.png" alt="Sessioneer logo" />
        <div>
          <h2>SESSIONEER</h2>
          <p>Tutor Portal</p>
        </div>
      </div>

      <div className="staff-profile">
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
        <Link to="/staff">Contracts</Link>
        <Link to="/staff">Notification</Link>
        <Link to="/staff">Reports</Link>
        <Link to="/staff-chat">Chat</Link>
        <Link to="/staff-profile">Profile</Link>
      </nav>
    </aside>
  );
}

export default StaffSidebar;
