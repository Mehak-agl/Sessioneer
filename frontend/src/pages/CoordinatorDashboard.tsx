import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import "./CoordinatorDashboard.css";

interface Unit {
  id: number;
  name: string;
  code: string;
  semester: string;
}

function CoordinatorDashboard() {
  const navigate = useNavigate();
  const [units, setUnits] = useState<Unit[]>([]);
  const fullName = localStorage.getItem("sessioneer_name") || "Coordinator";
  const initials = fullName.split(" ").map((n: string) => n[0]).join("");

  useEffect(() => {
    api.getUnits().then(setUnits).catch(console.error);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("sessioneer_token");
    localStorage.removeItem("sessioneer_role");
    localStorage.removeItem("sessioneer_name");
    navigate("/");
  };

  return (
    <div className="dashboard-page">

      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="Sessioneer logo" />
          <div>
            <h2>SESSIONEER</h2>
            <p>Scheduling System</p>
          </div>
        </div>

        <div className="profile">
          <div className="profile-avatar">{initials}</div>
          <div>
            <h3>{fullName}</h3>
            <p>Coordinator</p>
          </div>
        </div>

        <nav className="menu">
          <p className="active">Dashboard</p>
          <p>My Units</p>
          <Link to="/calendar"><p>Calendar</p></Link>
          <p>Tutors</p>
          <p>Allocations</p>
          <p>Contracts</p>
          <p>Reports</p>
          <p>Chat</p>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="main-content">

        <header className="topbar">
          <div className="page-title">
            <img src="/icons.svg" alt="Page logo" />
            <div>
              <h1>Coordinator Dashboard</h1>
              <p>Manage tutors, units, schedules and allocations</p>
            </div>
          </div>
          <button className="new-unit-btn">+ New Unit</button>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <span>Active Units</span>
            <h2>{units.length}</h2>
            <p>Currently running</p>
          </div>
          <div className="stat-card">
            <span>Pending Responses</span>
            <h2>0</h2>
            <p>Awaiting tutor replies</p>
          </div>
          <div className="stat-card warning">
            <span>Conflicts</span>
            <h2>0</h2>
            <p>Need attention</p>
          </div>
          <div className="stat-card success">
            <span>Finalised</span>
            <h2>0</h2>
            <p>Completed allocation</p>
          </div>
        </section>

        <section className="units-panel">
          <div className="panel-heading">
            <div>
              <h2>My Units</h2>
              <p>Semester 2, 2026</p>
            </div>
            <span>{units.length} units</span>
          </div>

          {units.length === 0 && <p>No units yet. Create one to get started.</p>}

          {units.map(unit => (
            <div className="unit-card" key={unit.id}>
              <div>
                <h3>{unit.code} {unit.name}</h3>
                <p>{unit.semester}</p>
              </div>
              <div className="unit-actions">
                <Link to="/calendar"><button>Calendar</button></Link>
                <button>Allocations</button>
                <button>Export</button>
              </div>
            </div>
          ))}
        </section>
        <Link to="/calendar">
          <button className="calendar-btn">Open Calendar</button>
        </Link>

      </main>
    </div>
  );
}

export default CoordinatorDashboard;