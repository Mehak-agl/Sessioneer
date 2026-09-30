import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CoordinatorSidebar from '../../components/CoordinatorSidebar'
import { api } from '../../services/api'
import type { TutorSummary } from '../../types'

function initialsOf(name: string): string {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function CoordinatorReports() {
  const navigate = useNavigate()

  const [tutors, setTutors] = useState<TutorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api.getAllTutors()
      .then((data: TutorSummary[]) => {
        if (!cancelled) setTutors(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load tutors right now. Please try again shortly.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const filtered = tutors.filter(t =>
    t.fullName.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  )

  const openTutor = (id: number) => navigate(`/coordinator/reports/${id}`)

  return (
    <div className="dashboard-page">
      <CoordinatorSidebar />
      <main className="main-content">
        <header className="topbar">
          <div className="page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Tutor's Resume</h1>
              <p>A centralised view of every tutor and their teaching load</p>
            </div>
          </div>
        </header>

        <div className="detail-section">
          <div className="section-header">
            <div>
              <h2>All Tutors</h2>
              <p>{tutors.length} tutor{tutors.length !== 1 ? 's' : ''} in the system</p>
            </div>
            {tutors.length > 0 && (
              <input
                className="tutor-search-input"
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            )}
          </div>

          {loading ? (
            <p className="tutors-loading">Loading tutors…</p>
          ) : error ? (
            <p className="avail-error-message">{error}</p>
          ) : tutors.length === 0 ? (
            <div className="tutors-empty-state">
              <p className="tutors-empty-icon">📋</p>
              <h3>No tutors yet</h3>
              <p>Once tutors are added to the system, their reports will appear here.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="tutors-empty">No tutors match your search.</p>
          ) : (
            <div className="tutors-table">
              <div className="tutors-table-header tutors-table-header--5col">
                <span>Name</span>
                <span>Email</span>
                <span>Units</span>
                <span>Sessions Allocated</span>
                <span>Resume</span>
              </div>
              {filtered.map(t => (
                <div
                  key={t.id}
                  className="tutors-table-row tutors-table-row--5col tutors-table-row-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => openTutor(t.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openTutor(t.id)
                    }
                  }}
                >
                  <div className="tutors-avatar-name">
                    <div className="tutors-avatar">{initialsOf(t.fullName)}</div>
                    <span className="tutors-name">{t.fullName}</span>
                  </div>
                  <span className="tutors-email">{t.email}</span>
                  <span className="tutors-date">{t.unitCount}</span>
                  <span className="tutors-date">{t.totalSessionsAllocated}</span>
                  <span className={`status-badge ${t.hasResume ? 'responded' : 'pending'}`}>
                    {t.hasResume ? 'Uploaded' : 'None'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
