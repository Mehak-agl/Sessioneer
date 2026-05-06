import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

export default function StaffDashboard() {
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
          <span>Sessional Staff</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main className="dashboard-main">
        <h1>Staff Dashboard</h1>
        <p className="dashboard-desc">Indicate your availability and view your assigned sessions.</p>
        <div className="dashboard-cards">
          <div className="dash-card">
            <h2>My Availability</h2>
            <p>Submit the sessions you are available to teach.</p>
          </div>
          <div className="dash-card">
            <h2>My Sessions</h2>
            <p>View sessions you have been allocated to teach.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
