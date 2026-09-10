import StaffSidebar from '../../components/TutorSidebar'

export default function TutorNotifications() {
  return (
    <div className="dashboard-page">
      <StaffSidebar />
      <main className="staff-main-content">
        <header className="staff-topbar">
          <div className="staff-page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Notifications</h1>
              <p>Updates from your coordinators</p>
            </div>
          </div>
        </header>

        <div className="coming-soon-card">
          <div className="coming-soon-icon">🔔</div>
          <h2>Notifications Coming Soon</h2>
          <p>
            Allocation confirmations, coordinator messages, and availability
            deadline reminders will appear here.
          </p>
        </div>
      </main>
    </div>
  )
}
