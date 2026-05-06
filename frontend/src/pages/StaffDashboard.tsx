import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import './Dashboard.css'

interface Availability {
  id: number;
  startTime: string;
  endTime: string;
  unit: { name: string; code: string }
}

interface Allocation {
  id: number;
  status: string;
  session: { title: string; startTime: string; location: string }
}

export default function StaffDashboard() {
  const navigate = useNavigate()
  const [availability, setAvailability] = useState<Availability[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const fullName = localStorage.getItem('sessioneer_name') || 'Staff'
  const initials = fullName.split(' ').map((n: string) => n[0]).join('')

  useEffect(() => {
    api.getMyAvailability().then(setAvailability).catch(console.error)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('sessioneer_token')
    localStorage.removeItem('sessioneer_role')
    localStorage.removeItem('sessioneer_name')
    navigate('/')
  }

  return (
    <div className="dashboard-bg">
      <header className="dashboard-header">
        <div className="dashboard-logo">
          <span className="logo-s">S</span>essioneer
        </div>
        <div className="dashboard-user">
          <span>{fullName}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        <h1>Welcome, {fullName}</h1>
        <p className="dashboard-desc">Indicate your availability and view your assigned sessions.</p>

        <div className="dashboard-cards">
          <div className="dash-card">
            <h2>My Availability</h2>
            {availability.length === 0 && <p>No availability submitted yet.</p>}
            {availability.map(a => (
              <div key={a.id}>
                <p><strong>{a.unit.code}</strong> — {new Date(a.startTime).toLocaleString()} to {new Date(a.endTime).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>

          <div className="dash-card">
            <h2>My Sessions</h2>
            {allocations.length === 0 && <p>No sessions allocated yet.</p>}
            {allocations.map(a => (
              <div key={a.id}>
                <p><strong>{a.session.title}</strong> — {new Date(a.session.startTime).toLocaleString()} at {a.session.location}</p>
                <p>Status: {a.status}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}