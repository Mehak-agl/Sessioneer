import StaffSidebar from "../components/StaffSidebar";
import "./StaffDashboard.css";

function StaffDashboard() {
  const allocatedClasses = [
    {
      unit: "CAB302 Software Development",
      classType: "Workshop",
      day: "Monday",
      time: "9:00 AM - 11:00 AM",
      location: "Gardens Point",
      status: "Allocated"
    },
    {
      unit: "IFN660 Advanced Topics",
      classType: "Lab",
      day: "Wednesday",
      time: "2:00 PM - 4:00 PM",
      location: "Online",
      status: "Allocated"
    }
  ];

  const pendingRequests = [
    {
      unit: "CAB301 Algorithms",
      classType: "Tutorial",
      day: "Tuesday",
      time: "1:00 PM - 3:00 PM",
      location: "Kelvin Grove"
    }
  ];

  return (
    <div className="staff-dashboard-page">
      <StaffSidebar />

      <main className="staff-main-content">
        <header className="staff-topbar">
          <div className="staff-page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Tutor Dashboard</h1>
              <p>Manage your availability, allocated classes and teaching preferences</p>
            </div>
          </div>
        </header>

        <section className="staff-stats-grid">
          <div className="staff-stat-card deadline-card">
            <span>Availability Deadline</span>
            <h2>14 days left</h2>
            <p>Submit before semester allocation closes</p>
          </div>

          <div className="staff-stat-card">
            <span>Allocated Classes</span>
            <h2>{allocatedClasses.length}</h2>
            <p>Confirmed by coordinator</p>
          </div>

          <div className="staff-stat-card warning">
            <span>Pending Requests</span>
            <h2>{pendingRequests.length}</h2>
            <p>Waiting for your response</p>
          </div>

          <div className="staff-stat-card success">
            <span>Max Classes / Week</span>
            <h2>3</h2>
            <p>Your teaching preference</p>
          </div>
        </section>

        <section className="staff-panel">
          <div className="staff-panel-heading">
            <div>
              <h2>Availability & Preferences</h2>
              <p>Semester 2, 2026</p>
            </div>
            <div className="staff-panel-buttons">
              <button>Set Availability</button>
              <button>Update Preferences</button>
            </div>
          </div>

          <div className="preference-grid">
            <div className="preference-card">
              <h3>Preferred Campus</h3>
              <p>Gardens Point, Online</p>
            </div>

            <div className="preference-card">
              <h3>Available Days</h3>
              <p>Monday, Wednesday, Friday</p>
            </div>

            <div className="preference-card">
              <h3>Preferred Time</h3>
              <p>Morning and Afternoon</p>
            </div>
          </div>
        </section>

        <section className="staff-panel">
          <div className="staff-panel-heading">
            <div>
              <h2>Allocated Classes</h2>
              <p>These appear after coordinator confirms allocation</p>
            </div>
          </div>

          {allocatedClasses.length > 0 ? (
            allocatedClasses.map((item, index) => (
              <div className="staff-class-card allocated" key={index}>
                <div>
                  <h3>{item.unit}</h3>
                  <p>{item.classType} · {item.day} · {item.time}</p>
                  <p>{item.location}</p>
                </div>
                <span>{item.status}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">
              No classes allocated yet. Your classes will appear here once the coordinator confirms them.
            </div>
          )}
        </section>

        <section className="staff-panel">
          <div className="staff-panel-heading">
            <div>
              <h2>Pending Tutor Requests</h2>
              <p>Accept or decline requests sent by coordinator</p>
            </div>
          </div>

          {pendingRequests.map((request, index) => (
            <div className="staff-class-card pending" key={index}>
              <div>
                <h3>{request.unit}</h3>
                <p>{request.classType} · {request.day} · {request.time}</p>
                <p>{request.location}</p>
              </div>

              <div className="request-actions">
                <button className="accept-btn">Accept</button>
                <button className="decline-btn">Decline</button>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default StaffDashboard;