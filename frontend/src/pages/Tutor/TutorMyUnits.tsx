import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import StaffSidebar from '../../components/TutorSidebar'

// ── Types ───────────────────────────────────────────────────────────────
// These match what the backend actually sends back today. Some fields
// (description, teachingWeeks, campus, mode) do NOT exist in the backend
// yet — they're typed as optional and rendered as placeholders below.

interface UnitSummary {
  id: number
  code: string
  name: string
  semester: string
  coordinator?: { fullName: string }
}

interface StaffUser {
  id: number
  fullName: string
  email: string
}

interface Invitation {
  id: number
  unit: UnitSummary
  staff: StaffUser
  status: 'PENDING' | 'RESPONDED'
}

interface SessionInfo {
  id: number
  title: string
  startTime: string
  location: string
  status: string
  unit?: { id: number }
}

interface AllocationInfo {
  id: number
  status: string
  session: SessionInfo
}

interface AvailabilityRecord {
  id: number
  unit: { id: number }
}

// MOCK DATA — there is no Announcement entity/endpoint in the backend yet.
// This is hardcoded so the section has something to show. Swap this out
// once a real endpoint exists.
const MOCK_ANNOUNCEMENTS = [
  { title: 'Room change for Week 3', body: 'Tuesday lab moves to B Block B204 due to a booking clash.', date: '2026-07-14' },
  { title: 'Marking guide uploaded', body: 'Check the shared drive for the updated marking rubric.', date: '2026-07-10' },
]

export default function TutorMyUnits() {
  const navigate = useNavigate()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [availability, setAvailability] = useState<AvailabilityRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null)
  const [acceptedUnitIds, setAcceptedUnitIds] = useState<Set<number>>(new Set())
  const [allocations, setAllocations] = useState<AllocationInfo[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    api.getMyInvitations().then(setInvitations).catch(console.error)
    api.getMyAvailability().then(setAvailability).catch(console.error)
  }, [])

  // the tutor's own staff id isn't stored anywhere on login today — but
  // every invitation object already includes it via `staff.id`, so we can
  // just read it off the first one instead of changing the login flow.
  const myStaffId = invitations[0]?.staff?.id

  const submittedUnitIds = useMemo(
    () => new Set(availability.map(a => a.unit.id)),
    [availability]
  )

  const filteredInvitations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return invitations
    return invitations.filter(
      inv => inv.unit.code.toLowerCase().includes(q) || inv.unit.name.toLowerCase().includes(q)
    )
  }, [invitations, searchQuery])

  const selectedInvitation = invitations.find(inv => inv.unit.id === selectedUnitId)
  const isAccepted = selectedUnitId != null &&
    (acceptedUnitIds.has(selectedUnitId) || selectedInvitation?.status === 'RESPONDED')
  const isSubmitted = selectedUnitId != null && submittedUnitIds.has(selectedUnitId)

  // whenever the selected unit changes, load this tutor's allocations for
  // it (real endpoint that already exists). Sessions for the unit aren't
  // needed here — My Sessions below only shows sessions actually
  // allocated to this tutor, which comes from allocations, not the raw
  // unit session list.
  useEffect(() => {
    if (!selectedUnitId) return
    async function loadAllocations() {
      setLoadingDetail(true)
      try {
        const result = myStaffId ? await api.getMyAllocations(myStaffId) : []
        setAllocations(result)
      } catch {
        setAllocations([])
      } finally {
        setLoadingDetail(false)
      }
    }
    loadAllocations()
  }, [selectedUnitId, myStaffId])

  const mySessionsForUnit = allocations.filter(a => a.session?.unit?.id === selectedUnitId)

  const handleAccept = (unitId: number) => {
    // there's no "accept" endpoint on the backend — accepting just unlocks
    // the rest of this page locally. The invitation officially flips to
    // RESPONDED server-side the moment the tutor submits availability
    // (which only happens on the Calendar page — see below).
    setAcceptedUnitIds(prev => new Set(prev).add(unitId))
  }

  const handleDecline = async (unitId: number) => {
    if (!myStaffId) return
    const confirmDecline = window.confirm('Decline this invitation? You will no longer see this unit.')
    if (!confirmDecline) return
    try {
      await api.removeInvitation(unitId, myStaffId)
      setInvitations(prev => prev.filter(inv => inv.unit.id !== unitId))
      if (selectedUnitId === unitId) setSelectedUnitId(null)
    } catch (err) {
      console.error(err)
    }
  }

  // Availability can ONLY be submitted or changed on the Calendar page.
  // This just navigates there and tells the calendar which unit to
  // preselect in its dropdown — it does not submit anything itself.
  const goToCalendarForAvailability = (unitId: number) => {
    navigate(`/staff-calendar?availability=1&unit=${unitId}`)
  }

  return (
    <div className="staff-dashboard-page">
      <StaffSidebar />

      <main className="staff-main-content">
        <header className="staff-topbar">
          <div className="staff-page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>My Units</h1>
              <p>Everything about your units, in one place</p>
            </div>
          </div>
        </header>

        <div className="myunits-workspace">
          {/* LEFT: unit list */}
          <aside className="myunits-list-panel">
            <div className="chat-search-box">
              <input
                type="text"
                placeholder="Search your units..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="chat-lists-scroll">
              {filteredInvitations.length === 0 && (
                <div className="chat-empty-hint">No units found.</div>
              )}
              {filteredInvitations.map(inv => {
                const accepted = acceptedUnitIds.has(inv.unit.id) || inv.status === 'RESPONDED'
                const statusLabel = accepted ? 'Accepted' : 'Pending'
                return (
                  <button
                    key={inv.id}
                    className={`myunits-unit-card ${selectedUnitId === inv.unit.id ? 'active' : ''}`}
                    onClick={() => setSelectedUnitId(inv.unit.id)}
                  >
                    <div className="myunits-unit-card-top">
                      <span className="unit-code-badge">{inv.unit.code}</span>
                      <span className={`myunits-status-pill ${accepted ? 'accepted' : 'pending'}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="myunits-unit-name">{inv.unit.name}</div>
                    <div className="myunits-unit-sem">{inv.unit.semester}</div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* RIGHT: selected unit's detail */}
          <section className="myunits-detail-panel">
            {!selectedInvitation && (
              <div className="chat-window-empty">
                <p>Select a unit on the left to see its details.</p>
              </div>
            )}

            {selectedInvitation && (
              <>
                {/* Unit Details — read only */}
                <div className="detail-section">
                  <div className="section-header">
                    <div>
                      <h2>{selectedInvitation.unit.code} — {selectedInvitation.unit.name}</h2>
                      <p>{selectedInvitation.unit.semester}</p>
                    </div>
                  </div>
                  <p><strong>Coordinator:</strong> {selectedInvitation.unit.coordinator?.fullName ?? '—'}</p>
                  {/* FAKE — teachingWeeks/description don't exist in the backend yet */}
                  <p><strong>Teaching weeks:</strong> Weeks 1–13 (placeholder)</p>
                  <p style={{ marginTop: '8px', color: '#657985' }}>
                    Placeholder description — this unit covers core concepts across the semester,
                    delivered through weekly tutorials and labs. (Not real data yet.)
                  </p>
                </div>

                {/* Invitation response */}
                {!isAccepted && (
                  <div className="detail-section">
                    <div className="section-header">
                      <div>
                        <h2>Invitation</h2>
                        <p>You've been invited to teach this unit.</p>
                      </div>
                    </div>
                    <div className="request-actions">
                      <button className="accept-btn" onClick={() => handleAccept(selectedInvitation.unit.id)}>
                        Accept
                      </button>
                      <button className="decline-btn" onClick={() => handleDecline(selectedInvitation.unit.id)}>
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {isAccepted && (
                  <div className="detail-section">
                    <div className="section-header">
                      <div>
                        <h2>Invitation</h2>
                      </div>
                      <span className="status-badge responded">✓ Accepted</span>
                    </div>
                  </div>
                )}

                {/* Availability — READ-ONLY status here. Actually submitting
                    or changing availability only happens on the Calendar
                    page, this just tells you the status and links there. */}
                {isAccepted && (
                  <div className="detail-section">
                    <div className="section-header">
                      <div>
                        <h2>Availability</h2>
                        <p>Submitted and updated on the Calendar page</p>
                      </div>
                      <span className={`myunits-status-pill ${isSubmitted ? 'accepted' : 'pending'}`}>
                        {isSubmitted ? 'Submitted' : 'Pending'}
                      </span>
                    </div>
                    <button
                      className="confirm-btn"
                      onClick={() => goToCalendarForAvailability(selectedInvitation.unit.id)}
                    >
                      {isSubmitted ? 'Update on Calendar →' : 'Submit on Calendar →'}
                    </button>
                  </div>
                )}

                {/* My Sessions — real allocations, filtered to this unit */}
                {isAccepted && (
                  <div className="detail-section">
                    <div className="section-header">
                      <div>
                        <h2>My Sessions</h2>
                        <p>Sessions allocated to you for this unit</p>
                      </div>
                    </div>
                    {loadingDetail && <p>Loading...</p>}
                    {!loadingDetail && mySessionsForUnit.length === 0 && (
                      <div className="empty-info">No sessions allocated to you yet for this unit.</div>
                    )}
                    <div className="sessions-grid">
                      {mySessionsForUnit.map(a => (
                        <div key={a.id} className="session-card">
                          <div className="session-day">{a.session.title}</div>
                          <div className="session-time">{new Date(a.session.startTime).toLocaleString()}</div>
                          <div className="session-location">{a.session.location}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Announcements — fully mock, no backend endpoint exists */}
                <div className="detail-section">
                  <div className="section-header">
                    <div>
                      <h2>Announcements</h2>
                      <p>Updates from your coordinator (placeholder data)</p>
                    </div>
                  </div>
                  {MOCK_ANNOUNCEMENTS.map((a, i) => (
                    <div key={i} className="announcement-card">
                      <div className="announcement-top">
                        <span className="announcement-title">{a.title}</span>
                        <span className="announcement-date">{new Date(a.date).toLocaleDateString()}</span>
                      </div>
                      <p>{a.body}</p>
                    </div>
                  ))}
                </div>

                {/* Unit Information — mostly fake fields for now */}
                <div className="detail-section">
                  <div className="section-header">
                    <div>
                      <h2>Unit Information</h2>
                    </div>
                  </div>
                  <p><strong>Campus:</strong> Gardens Point (placeholder)</p>
                  <p><strong>Teaching mode:</strong> Hybrid (placeholder)</p>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
