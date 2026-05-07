import { useState } from 'react'
import type { Unit, Session, TutorInvite, SessionMode } from '../types'
import { DUMMY_TUTORS } from '../data/dummyData'
import './UnitDetailView.css'

type Props = {
  unit: Unit
  onBack: () => void
  onUpdateUnit: (updated: Unit) => void
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const DURATIONS = ['1hr', '2hr', '3hr']

export default function UnitDetailView({ unit, onBack, onUpdateUnit }: Props) {
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)

  const [day, setDay] = useState('Monday')
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState('2hr')
  const [mode, setMode] = useState<SessionMode>('on-campus')
  const [location, setLocation] = useState('')

  const [selectedTutorId, setSelectedTutorId] = useState('')

  const uninvitedTutors = DUMMY_TUTORS.filter(
    dt => !unit.invitedTutors.find(t => t.id === dt.id)
  )

  const handleAddSession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newSession: Session = {
      id: `s${Date.now()}`,
      day, time, duration, mode,
      location: mode === 'online' ? '' : location,
    }
    onUpdateUnit({ ...unit, sessions: [...unit.sessions, newSession] })
    setDay('Monday'); setTime('09:00'); setDuration('2hr')
    setMode('on-campus'); setLocation('')
    setShowSessionForm(false)
  }

  const handleRemoveSession = (sessionId: string) => {
    onUpdateUnit({ ...unit, sessions: unit.sessions.filter(s => s.id !== sessionId) })
  }

  const handleInviteTutor = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const tutor = DUMMY_TUTORS.find(t => t.id === selectedTutorId)
    if (!tutor) return
    const invite: TutorInvite = {
      id: tutor.id,
      name: tutor.name,
      email: tutor.email,
      status: 'pending',
      availableSessions: [],
    }
    onUpdateUnit({ ...unit, invitedTutors: [...unit.invitedTutors, invite] })
    setSelectedTutorId('')
    setShowInviteForm(false)
  }

  const handleRemoveTutor = (tutorId: string) => {
    onUpdateUnit({ ...unit, invitedTutors: unit.invitedTutors.filter(t => t.id !== tutorId) })
  }

  return (
    <div className="unit-detail">

      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← Back to My Units</button>
        <div className="detail-title">
          <span className="detail-code">{unit.code}</span>
          <div>
            <h1>{unit.name}</h1>
            <p>{unit.semester}</p>
          </div>
        </div>
      </div>

      {/* Sessions section */}
      <div className="detail-section">
        <div className="section-header">
          <div>
            <h2>Sessions</h2>
            <p>{unit.sessions.length} session{unit.sessions.length !== 1 ? 's' : ''} defined</p>
          </div>
          <button className="add-btn" onClick={() => setShowSessionForm(true)}>+ Add Session</button>
        </div>

        {unit.sessions.length === 0 && (
          <div className="empty-info">No sessions yet. Add sessions so tutors know what to indicate availability for.</div>
        )}

        <div className="sessions-grid">
          {unit.sessions.map(session => (
            <div key={session.id} className="session-card">
              <div className="session-card-top">
                <span className={`mode-badge ${session.mode}`}>
                  {session.mode === 'online' ? '🌐 Online' : '🏫 On-campus'}
                </span>
                <button className="remove-btn" onClick={() => handleRemoveSession(session.id)}>✕</button>
              </div>
              <div className="session-day">{session.day}</div>
              <div className="session-time">{session.time} · {session.duration}</div>
              {session.location && <div className="session-location">{session.location}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Add session modal */}
      {showSessionForm && (
        <div className="modal-overlay" onClick={() => setShowSessionForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Session</h2>
            <form onSubmit={handleAddSession} className="detail-form">
              <div className="form-row-3">
                <div className="form-field">
                  <label>Day</label>
                  <select value={day} onChange={e => setDay(e.target.value)}>
                    {DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Time</label>
                  <select value={time} onChange={e => setTime(e.target.value)}>
                    {TIMES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Duration</label>
                  <select value={duration} onChange={e => setDuration(e.target.value)}>
                    {DURATIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-field">
                  <label>Mode</label>
                  <select value={mode} onChange={e => setMode(e.target.value as SessionMode)}>
                    <option value="on-campus">On-campus</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                {mode === 'on-campus' && (
                  <div className="form-field">
                    <label>Location</label>
                    <input
                      type="text"
                      placeholder="e.g. P Block P404"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowSessionForm(false)}>Cancel</button>
                <button type="submit" className="confirm-btn">Add Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tutors section */}
      <div className="detail-section">
        <div className="section-header">
          <div>
            <h2>Invited Tutors</h2>
            <p>
              {unit.invitedTutors.filter(t => t.status === 'responded').length} responded ·{' '}
              {unit.invitedTutors.filter(t => t.status === 'pending').length} pending
            </p>
          </div>
          {uninvitedTutors.length > 0 && (
            <button className="add-btn" onClick={() => setShowInviteForm(true)}>+ Invite Tutor</button>
          )}
        </div>

        {unit.invitedTutors.length === 0 && (
          <div className="empty-info">No tutors invited yet. Invite tutors to collect their availability.</div>
        )}

        <div className="tutors-list">
          {unit.invitedTutors.map(tutor => (
            <div key={tutor.id} className="tutor-row">
              <div className="tutor-avatar">{tutor.name.split(' ').map(n => n[0]).join('')}</div>
              <div className="tutor-info">
                <span className="tutor-name">{tutor.name}</span>
                <span className="tutor-email">{tutor.email}</span>
              </div>
              <div className="tutor-availability">
                {tutor.status === 'responded'
                  ? <span className="avail-sessions">Available for {tutor.availableSessions.length} session{tutor.availableSessions.length !== 1 ? 's' : ''}</span>
                  : null
                }
              </div>
              <span className={`status-badge ${tutor.status}`}>
                {tutor.status === 'responded' ? '✓ Responded' : '⏳ Pending'}
              </span>
              <button className="remove-tutor-btn" onClick={() => handleRemoveTutor(tutor.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      {/* Invite tutor modal */}
      {showInviteForm && (
        <div className="modal-overlay" onClick={() => setShowInviteForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Invite Tutor</h2>
            <p className="modal-sub">Select a tutor to invite them to submit their availability for this unit.</p>
            <form onSubmit={handleInviteTutor} className="detail-form">
              <div className="form-field">
                <label>Select Tutor</label>
                <select
                  value={selectedTutorId}
                  onChange={e => setSelectedTutorId(e.target.value)}
                  required
                >
                  <option value="">-- Choose a tutor --</option>
                  {uninvitedTutors.map(t => (
                    <option key={t.id} value={t.id}>{t.name} — {t.email}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowInviteForm(false)}>Cancel</button>
                <button type="submit" className="confirm-btn">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
