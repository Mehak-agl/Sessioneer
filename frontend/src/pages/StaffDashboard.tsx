import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { INITIAL_UNITS } from '../data/dummyData'
import TutorAvailabilityView from './TutorAvailabilityView'
import StaffSidebar from "../components/StaffSidebar"
import "./StaffDashboard.css"

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

type View = 'dashboard' | 'availability'

function StaffDashboard() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('dashboard')
  const [availability, setAvailability] = useState<Availability[]>([])
  const [allocations] = useState<Allocation[]>([])

  const availableUnits = INITIAL_UNITS.filter(u => u.invitedTutors.length > 0)

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
    <div className="staff-dashboard-page">
      <StaffSidebar />

      <main className="staff-main-content">
        {view === 'availability' ? (
          <TutorAvailabilityView
            units={availableUnits}
            onBack={() => setView('dashboard')}
          />
        ) : (
          <>
            <header className="staff-topbar">
              <div className="staff-page-title">
                <img src="/logo.png" alt="Page logo" />
                <div>
                  <h1>Tutor Dashboard</h1>
                  <p>Manage your availability, allocated classes and teaching preferences</p>
                </div>
              </div>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </header>

            <section className="staff-stats-grid">
              <div className="staff-stat-card deadline-card">
                <span>Availability Deadline</span>
                <h2>14 days left</h2>
                <p>Submit before semester allocation closes</p>
              </div>
              <div className="staff-stat-card">
                <span>Availability Submitted</span>
                <h2>{availability.length}</h2>
                <p>Time slots submitted</p>
              </div>
              <div className="staff-stat-card warning">
                <span>Pending Requests</span>
                <h2>{allocations.filter(a => a.status === 'PROPOSED').length}</h2>
                <p>Waiting for your response</p>
              </div>
              <div className="staff-stat-card success">
                <span>Allocated Classes</span>
                <h2>{allocations.filter(a => a.status === 'CONFIRMED').length}</h2>
                <p>Confirmed by coordinator</p>
              </div>
            </section>

            <section className="staff-panel">
              <div className="staff-panel-heading">
                <div>
                  <h2>My Availability</h2>
                  <p>Semester 2, 2026</p>
                </div>
                <button onClick={() => setView('availability')}>Set Availability</button>
              </div>

              {availability.length === 0 && (
                <div className="empty-state">No availability submitted yet.</div>
              )}

              {availability.map((a, index) => (
                <div className="staff-class-card allocated" key={index}>
                  <div>
                    <h3>{a.unit.code} — {a.unit.name}</h3>
                    <p>{new Date(a.startTime).toLocaleString()} to {new Date(a.endTime).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </section>

            <section className="staff-panel">
              <div className="staff-panel-heading">
                <div>
                  <h2>Allocated Classes</h2>
                  <p>Confirmed by coordinator</p>
                </div>
              </div>

              {allocations.length === 0 && (
                <div className="empty-state">No classes allocated yet.</div>
              )}

              {allocations.map((a, index) => (
                <div className={`staff-class-card ${a.status === 'CONFIRMED' ? 'allocated' : 'pending'}`} key={index}>
                  <div>
                    <h3>{a.session.title}</h3>
                    <p>{new Date(a.session.startTime).toLocaleString()} · {a.session.location}</p>
                  </div>
                  <span>{a.status}</span>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default StaffDashboard