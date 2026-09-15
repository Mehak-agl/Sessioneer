import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import CoordinatorSidebar from '../../components/CoordinatorSidebar'
import { api } from '../../services/api'
import type { TutorReportProfile } from '../../types'

function initialsOf(name: string): string {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function CoordinatorTutorProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [tutor, setTutor] = useState<TutorReportProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError('')
    api.getTutorProfile(Number(id))
      .then((data: TutorReportProfile) => {
        if (!cancelled) setTutor(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this tutor. They may no longer exist.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  const handleViewResume = () => {
    if (!tutor?.resumeData) return
    const win = window.open()
    if (win) {
      win.document.write(
        `<iframe src="${tutor.resumeData}" style="border:0;position:fixed;inset:0;width:100%;height:100%;" title="${tutor.resumeFileName ?? 'Resume'}"></iframe>`
      )
    }
  }

  return (
    <div className="dashboard-page">
      <CoordinatorSidebar />
      <main className="main-content">
        <header className="topbar">
          <div className="page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Tutor Profile</h1>
              <p>Full report for this tutor</p>
            </div>
          </div>
        </header>

        <button className="back-btn" onClick={() => navigate('/coordinator/reports')}>← Back to Reports</button>

        {loading ? (
          <p className="tutors-loading">Loading tutor…</p>
        ) : error || !tutor ? (
          <p className="avail-error-message">{error || 'Tutor not found.'}</p>
        ) : (
          <>
            <section className="profile-card-section">
              <div className="profile-photo-wrapper">
                <div className="profile-photo-circle profile-photo-placeholder">{initialsOf(tutor.fullName)}</div>
              </div>
              <h2 className="profile-name">{tutor.fullName}</h2>
              <span className="profile-position-badge">Tutor</span>
              <p className="tutor-report-email">{tutor.email}</p>
            </section>

            <section className="detail-section">
              <div className="section-header">
                <div>
                  <h2>Overview</h2>
                  <p>At-a-glance summary of this tutor's teaching load</p>
                </div>
              </div>
              <div className="tutor-report-stats">
                <div className="tutor-report-stat">
                  <span className="tutor-report-stat-value">{tutor.units.length}</span>
                  <span className="tutor-report-stat-label">Unit{tutor.units.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="tutor-report-stat">
                  <span className="tutor-report-stat-value">{tutor.totalSessionsAllocated}</span>
                  <span className="tutor-report-stat-label">Session{tutor.totalSessionsAllocated !== 1 ? 's' : ''} allocated</span>
                </div>
                <div className="tutor-report-stat">
                  <span className="tutor-report-stat-value">{tutor.pendingInvitations}</span>
                  <span className="tutor-report-stat-label">Pending invitation{tutor.pendingInvitations !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </section>

            <section className="detail-section">
              <div className="section-header">
                <div>
                  <h2>Units</h2>
                  <p>Units this tutor is currently teaching or assigned to</p>
                </div>
              </div>
              {tutor.units.length === 0 ? (
                <p className="tutors-empty">Not yet invited to, or teaching, any units.</p>
              ) : (
                <div className="tutors-table">
                  <div className="tutors-table-header tutors-table-header--4col">
                    <span>Unit</span>
                    <span>Semester</span>
                    <span>Status</span>
                  </div>
                  {tutor.units.map(u => (
                    <div key={u.unitId} className="tutors-table-row tutors-table-row--4col">
                      <div className="tutors-avatar-name">
                        <span className="tutors-name">{u.code} — {u.name}</span>
                      </div>
                      <span className="tutors-email">{u.semester}</span>
                      <span className={`status-badge ${u.invitationStatus === 'RESPONDED' ? 'responded' : 'pending'}`}>
                        {u.invitationStatus === 'RESPONDED' ? 'Teaching' : 'Invited'}
                        {u.sessionsAllocated > 0 ? ` · ${u.sessionsAllocated} session${u.sessionsAllocated !== 1 ? 's' : ''}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="detail-section">
              <div className="section-header">
                <div>
                  <h2>Resume</h2>
                  <p>Resume uploaded by the tutor from their Profile page</p>
                </div>
              </div>
              <div className="resume-row">
                <span className="resume-filename">
                  {tutor.hasResume && tutor.resumeFileName ? tutor.resumeFileName : 'No resume uploaded yet'}
                </span>
                {tutor.hasResume && tutor.resumeData && (
                  <button className="resume-view-btn" onClick={handleViewResume}>View</button>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
