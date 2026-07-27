import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from "../../services/api";
import StaffSidebar from "../../components/TutorSidebar"
import { getDaysLeftInAvailabilityWindow } from "../../constants/availability"


interface Availability {
  id: number;
  startTime: string;
  endTime: string;
  unit: { id: number; name: string; code: string }
}

interface Allocation {
  id: number;
  status: string;
  session: { title: string; startTime: string; location: string }
}

interface Unit {
  id: number;
  code: string;
  name: string;
  semester: string;
}

function StaffDashboard() {
  const navigate = useNavigate()
  const [availability, setAvailability] = useState<Availability[]>([])
  const [allocations] = useState<Allocation[]>([])
  const [invitedUnits, setInvitedUnits] = useState<Unit[]>([])

  useEffect(() => {
    api.getMyAvailability().then(setAvailability).catch(console.error)
    api.getMyInvitations().then((invitations: any[]) => {
      setInvitedUnits(invitations.map(inv => inv.unit))
    }).catch(console.error)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('sessioneer_token')
    localStorage.removeItem('sessioneer_role')
    localStorage.removeItem('sessioneer_name')
    navigate('/')
  }

  // The ONLY place availability can actually be submitted or changed is the
  // Calendar page. Everywhere else (this dashboard, the My Units page) is
  // read-only status — this link just takes you there, it doesn't submit
  // anything itself.
  const goToCalendar = () => navigate('/staff-calendar?availability=1')

  const submittedUnitIds = useMemo(
    () => new Set(availability.map(a => a.unit.id)),
    [availability]
  )

  const submittedCount = invitedUnits.filter(u => submittedUnitIds.has(u.id)).length
  const daysLeft = getDaysLeftInAvailabilityWindow()

  return (
    <div className="staff-dashboard-page">
      <StaffSidebar />

      <main className="staff-main-content">
        <header className="staff-topbar">
          <div className="staff-page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Tutor Dashboard</h1>
              <p>An overview of your units and allocated classes</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </header>

        <section className="staff-stats-grid">
          <div className="staff-stat-card deadline-card">
            <span>O Week Availability Window</span>
            <h2>{daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : 'Closed'}</h2>
            <p>{daysLeft > 0 ? 'Submit or update on the Calendar page' : 'Contact your coordinator for changes'}</p>
          </div>
          <div className="staff-stat-card">
            <span>Units Invited To</span>
            <h2>{invitedUnits.length}</h2>
            <p>Units awaiting your availability</p>
          </div>
          <div className="staff-stat-card">
            <span>Units Submitted</span>
            <h2>{submittedCount}/{invitedUnits.length}</h2>
            <p>Availability submitted per unit</p>
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
              <h2>Availability by Unit</h2>
              <p>Submit or update your availability on the Calendar page</p>
            </div>
            <button onClick={goToCalendar}>Go to Calendar →</button>
          </div>

          {invitedUnits.length === 0 && (
            <div className="empty-state-warning">You haven't been invited to any units yet.</div>
          )}

          <div className="units-list">
            {invitedUnits.map(unit => {
              const submitted = submittedUnitIds.has(unit.id)
              return (
                <div key={unit.id} className="unit-row">
                  <div className="unit-row-left">
                    <div className="unit-code-badge">{unit.code}</div>
                    <div className="unit-row-info">
                      <h3>{unit.name}</h3>
                      <span className="unit-meta">{unit.semester}</span>
                    </div>
                  </div>
                  <div className="unit-row-actions">
                    <span className={`myunits-status-pill ${submitted ? 'accepted' : 'pending'}`}>
                      {submitted ? 'Submitted' : 'Pending'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="staff-panel">
          <div className="staff-panel-heading">
            <div>
              <h2>Allocated Classes</h2>
              <p>Confirmed by coordinator</p>
            </div>
          </div>

          {allocations.length === 0 && (
            <div className="empty-state-warning">No classes allocated yet.</div>
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
      </main>
    </div>
  )
}

export default StaffDashboard
