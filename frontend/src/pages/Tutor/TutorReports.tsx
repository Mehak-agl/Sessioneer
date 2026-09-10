import StaffSidebar from '../../components/TutorSidebar'

export default function TutorReports() {
  return (
    <div className="dashboard-page">
      <StaffSidebar />
      <main className="staff-main-content">
        <header className="staff-topbar">
          <div className="staff-page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Reports</h1>
              <p>Your teaching history and summaries</p>
            </div>
          </div>
        </header>

        <div className="coming-soon-card">
          <div className="coming-soon-icon">📊</div>
          <h2>Reports Coming Soon</h2>
          <p>
            A summary of your allocated sessions, hours taught, and unit
            history will be available here.
          </p>
        </div>
      </main>
    </div>
  )
}
