import StaffSidebar from '../../components/TutorSidebar'

export default function TutorContracts() {
  return (
    <div className="dashboard-page">
      <StaffSidebar />
      <main className="staff-main-content">
        <header className="staff-topbar">
          <div className="staff-page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Contracts</h1>
              <p>Your teaching contracts and agreements</p>
            </div>
          </div>
        </header>

        <div className="coming-soon-card">
          <div className="coming-soon-icon">📄</div>
          <h2>Contracts Coming Soon</h2>
          <p>
            Your teaching contracts, offer letters, and signed agreements
            will be available to view and download here.
          </p>
        </div>
      </main>
    </div>
  )
}
