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
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Coordinator Dashboard</h1>
              <p>Manage tutors, units, schedules and allocations</p>
            </div>
          </div>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <span>Active Units</span>
            <h2>3</h2>
            <p>Currently running</p>
          </div>

          <div className="stat-card warning">
            <span>Pending Responses</span>
            <h2>8</h2>
            <p>Awaiting tutor replies</p>
          </div>

          <div className="stat-card danger">
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
              <p>Semester 2, 2026 allocation overview</p>
            </div>
            <span>Coordinator View</span>
          </div>

          <div className="dashboard-section">
            <h3 className="section-title">Allocated Units / Classes</h3>

            <div className="unit-card allocated-unit">
              <div>
                <h3>CAB302 Software Development</h3>
                <p>Workshop · Monday 9:00 AM - 11:00 AM · Gardens Point</p>
                <p>Allocated tutor: Alex K.</p>
              </div>
              <div className="unit-actions">
                <button>View Schedule</button>
                <button>View Allocation</button>
              </div>
            </div>

            <div className="unit-card allocated-unit">
              <div>
                <h3>IFN660 Advanced Topics</h3>
                <p>Lab · Wednesday 2:00 PM - 4:00 PM · Online</p>
                <p>Allocated tutor: Mehak A.</p>
              </div>
              <div className="unit-actions">
                <button>View Schedule</button>
                <button>View Allocation</button>
              </div>
            </div>
          </div>

          <div className="dashboard-section">
            <h3 className="section-title">Pending Class Allocations</h3>

            <div className="unit-card pending-unit">
              <div>
                <h3>CAB302 Software Development</h3>
                <p>Lab B · Friday 9:00 AM - 11:00 AM · Gardens Point</p>
                <p>Status: Waiting for tutor confirmation</p>
              </div>
              <div className="unit-actions">
                <button>Send Request</button>
                <button>Find Tutor</button>
              </div>
            </div>

            <div className="unit-card pending-unit">
              <div>
                <h3>CAB301 Algorithms</h3>
                <p>Tutorial · Tuesday 1:00 PM - 3:00 PM · Kelvin Grove</p>
                <p>Status: No tutor allocated yet</p>
              </div>
              <div className="unit-actions">
                <button>Send Request</button>
                <button>Find Tutor</button>
              </div>
            </div>
          </div>

          <div className="dashboard-section">
            <h3 className="section-title">Classes Still To Create</h3>

            <div className="unit-card create-unit">
              <div>
                <h3>CAB301 Algorithms</h3>
                <p>Required: 2 tutorials and 1 lab need to be created</p>
                <p>Suggested campuses: Gardens Point and Online</p>
              </div>
              <div className="unit-actions">
                <Link to="/calendar">
                  <button className="setup-btn">Create Class</button>
                </Link>
              </div>
            </div>

            <div className="unit-card create-unit">
              <div>
                <h3>IFN555 Database Systems</h3>
                <p>Required: Weekly workshop schedule not created yet</p>
                <p>Suggested mode: Online</p>
              </div>
              <div className="unit-actions">
                <Link to="/calendar">
                  <button className="setup-btn">Create Class</button>
                </Link>
              </div>
            </div>
          </div>

          <div className="dashboard-section">
            <h3 className="section-title">Coordinator Lecture Classes</h3>

            <div className="unit-card lecture-unit">
              <div>
                <h3>CAB302 Lecture</h3>
                <p>Thursday 10:00 AM - 12:00 PM · Gardens Point</p>
                <p>Lecturer / Coordinator: Sarah Chen</p>
              </div>
              <div className="unit-actions">
                <button>View Details</button>
              </div>
            </div>

            <div className="unit-card lecture-unit">
              <div>
                <h3>IFN660 Lecture</h3>
                <p>Monday 4:00 PM - 6:00 PM · Online</p>
                <p>Lecturer / Coordinator: Sarah Chen</p>
              </div>
              <div className="unit-actions">
                <button>View Details</button>
              </div>
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