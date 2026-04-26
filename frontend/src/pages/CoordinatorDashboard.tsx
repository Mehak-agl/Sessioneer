import { Link } from "react-router-dom";
import "./CoordinatorDashboard.css";

function CoordinatorDashboard() {
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
          <div className="profile-avatar">SC</div>
          <div>
            <h3>Sarah Chen</h3>
            <p>Coordinator</p>
          </div>
        </div>

        <nav className="menu">
          <p className="active">Dashboard</p>
          <p>My Units</p>
          <p>Schedule</p>
          <p>Tutors</p>
          <p>Allocations</p>
          <p>Contracts</p>
          <p>Reports</p>
          <p>Chat</p>
        </nav>
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
            <h2>3</h2>
            <p>Currently running</p>
          </div>

          <div className="stat-card">
            <span>Pending Responses</span>
            <h2>8</h2>
            <p>Awaiting tutor replies</p>
          </div>

          <div className="stat-card warning">
            <span>Conflicts</span>
            <h2>2</h2>
            <p>Need attention</p>
          </div>

          <div className="stat-card success">
            <span>Finalised</span>
            <h2>1</h2>
            <p>Completed allocation</p>
          </div>
        </section>

        <div className="alert-box">
          ⚠ 3 unassigned sessions in CAB302 · Rohit R. conflict on Friday · IFN660 awaiting 2 tutor responses
        </div>

        <section className="units-panel">
          <div className="panel-heading">
            <div>
              <h2>My Units</h2>
              <p>Semester 2, 2026</p>
            </div>
            <span>3 units</span>
          </div>

          <div className="unit-card">
            <div>
              <h3>CAB302 Software Development</h3>
              <p>18 sessions · 6 tutors invited · 4/6 responded</p>
            </div>
            <div className="unit-actions">
              <button>Schedule</button>
              <button>Allocations</button>
              <button>Export</button>
            </div>
          </div>

          <div className="unit-card">
            <div>
              <h3>IFN660 Advanced Topics</h3>
              <p>12 sessions · 4 tutors · awaiting 2 responses</p>
            </div>
            <div className="unit-actions">
              <button>Schedule</button>
              <button>Allocations</button>
            </div>
          </div>

          <div className="unit-card">
            <div>
              <h3>CAB301 Algorithms</h3>
              <p>No sessions defined yet · 0 tutors invited</p>
            </div>
            <div className="unit-actions">
              <button className="setup-btn">Set up sessions</button>
            </div>
          </div>
        </section>

        <Link to="/calendar">
          <button className="calendar-btn">Open Calendar</button>
        </Link>

      </main>
    </div>
  );
}

export default CoordinatorDashboard;
