import { Link } from "react-router-dom";

function CoordinatorSidebar() {
  const fullName = localStorage.getItem('sessioneer_name') || 'Coordinator';
  const initials = fullName.split(' ').map((n: string) => n[0]).join('');
  const photo = localStorage.getItem('sessioneer_photo');

  return (
    <aside className="coord-sidebar">
      <div className="coord-logo">
        <img src="/logo.png" alt="Sessioneer logo" />
        <div>
          <h2>SESSIONEER</h2>
          <p>Coordinator Portal</p>
        </div>
      </div>

      <div className="coord-profile">
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
        <Link className="active" to="/coordinator">Dashboard</Link>
        <Link to="/coordinator">My Units</Link>
        <Link to="/calendar">Calendar</Link>
        <Link to="/coordinator">Tutors</Link>
        <Link to="/coordinator">Allocations</Link>
        <Link to="/coordinator">Reports</Link>
        <Link to="/coordinator-chat">Chat</Link>
        <Link to="/coordinator-profile">Profile</Link>
      </nav>
    </aside>
  );
}

export default CoordinatorSidebar;
