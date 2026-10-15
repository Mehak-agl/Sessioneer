import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from "../../services/api";
import StaffSidebar from "../../components/TutorSidebar"


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
  // FIX: this was declared with no setter and never fetched, so
  // "Allocated Classes" always showed 0/empty no matter what data
  // existed — see the real fetch added below, same myStaffId trick
  // TutorMyUnits.tsx already uses (invitations don't carry a
  // separate "who am I" endpoint, but every invitation includes
  // staff.id, which is this tutor's own id).
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [invitedUnits, setInvitedUnits] = useState<Unit[]>([])
  const [myStaffId, setMyStaffId] = useState<number | null>(null)
  const [nearestDeadline, setNearestDeadline] = useState<string | null>(null)

  useEffect(() => {
    api.getMyAvailability().then(setAvailability).catch(console.error)
    api.getMyInvitations().then((invitations: any[]) => {
      setInvitedUnits(invitations.map(inv => inv.unit))
      setMyStaffId(invitations[0]?.staff?.id ?? null)
      
      // Find nearest upcoming deadline
      const deadlines = invitations
        .map(inv => inv.unit.availabilityDeadline)
        .filter(Boolean)
        .map(d => new Date(d).getTime())
        .filter(t => t > Date.now())
        .sort()
      
      if (deadlines.length > 0) {
        setNearestDeadline(new Date(deadlines[0]).toISOString())
      }
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (myStaffId == null) return
    api.getMyAllocations(myStaffId).then(setAllocations).catch(console.error)
  }, [myStaffId])

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
  //const daysLeft = getDaysLeftInAvailabilityWindow()

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
            <span>Next Availability Deadline</span>
            {nearestDeadline ? (
              <>
                <h2>{Math.ceil((new Date(nearestDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left</h2>
                <p>Due {new Date(nearestDeadline).toLocaleDateString()}</p>
              </>
            ) : (
              <>
                <h2>No deadline set</h2>
                <p>Contact your coordinator</p>
              </>
            )}
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
            <div className={`staff-class-card ${a.status === 'REJECTED' ? 'pending' : 'allocated'}`} key={index}>
              <div>
                <h3>{a.session.title}</h3>
                <p>{new Date(a.session.startTime).toLocaleString()} · {a.session.location}</p>
              </div>
              <span>{a.status === 'PROPOSED' || a.status === 'CONFIRMED' ? 'ALLOCATED' : a.status}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}

export default StaffDashboard
