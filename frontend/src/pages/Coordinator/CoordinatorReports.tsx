import CoordinatorSidebar from '../../components/CooordinatorSidebar'

export default function CoordinatorReports() {
  return (
    <div className="dashboard-page">
      <CoordinatorSidebar />
      <main className="main-content">
        <header className="topbar">
          <div className="page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Reports</h1>
              <p>Analytics and reporting for your units</p>
            </div>
          </div>
        </header>

        <div className="coming-soon-card">
          <div className="coming-soon-icon">📊</div>
          <h2>Reports Coming Soon</h2>
          <p>
            Detailed reports and analytics for allocation summaries, tutor
            hours, and unit coverage will be available here.
          </p>
          <p className="coming-soon-hint">
            For now, you can export unit data from the <strong>My Units</strong> page
            as Excel, CSV, or PDF.
          </p>
        </div>
      </main>
    </div>
  )
}
