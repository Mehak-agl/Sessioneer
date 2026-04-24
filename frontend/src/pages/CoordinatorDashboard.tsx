import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

export default function CoordinatorDashboard() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('sessioneer_role')
    navigate('/')
  }

  return (
    <div className="dashboard-bg">
      <header className="dashboard-header">
        <div className="dashboard-logo">
          <span className="logo-s">S</span>essioneer
        </div>
        <div className="dashboard-user">
          <span>Unit Coordinator</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main className="dashboard-main">
        <h1>Coordinator Dashboard</h1>
        <p className="dashboard-desc">Manage your units, sessions, and sessional staff allocations.</p>
        <div className="dashboard-cards">
          <div className="dash-card">
            <h2>My Units</h2>
            <p>View and manage your units and tutorial sessions.</p>
          </div>
          <div className="dash-card">
            <h2>Staff Availability</h2>
            <p>Review availability submitted by sessional staff.</p>
          </div>
          <div className="dash-card">
            <h2>Allocations</h2>
            <p>Assign sessional staff to tutorial sessions.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
