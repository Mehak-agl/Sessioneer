import { Link } from "react-router-dom";
import "./StaffSidebar.css";

function StaffSidebar() {
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
        <div className="staff-avatar">TS</div>
        <div>
          <h3>Tanvi Sharma</h3>
          <p>Tutor</p>
        </div>
      </div>

      <nav className="staff-menu">
        <Link className="active" to="/staff-dashboard">Dashboard</Link>
        <Link to="/staff-units">My Units</Link>
        <Link to="/staff-calendar">Calendar</Link>
        <Link to="/staff-contracts">Contracts</Link>
        <Link to="/staff-notifications">Notification</Link>
        <Link to="/staff-reports">Reports</Link>
        <Link to="/staff-chat">Chat</Link>
      </nav>
    </aside>
  );
}

export default StaffSidebar;