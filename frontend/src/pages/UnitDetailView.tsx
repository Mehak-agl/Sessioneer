import { useEffect, useState } from 'react'
import { api } from '../services/api'
import './UnitDetailView.css'

interface Session {
  id: number;
  title: string;
  startTime: string;
  location: string;
  status: string;
}

interface Unit {
  id: number;
  code: string;
  name: string;
  semester: string;
}

interface StaffUser {
  id: number;
  fullName: string;
  email: string;
}

type Props = {
  unit: Unit
  onBack: () => void
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const DURATIONS = ['1hr', '2hr', '3hr']
const MODES = ['on-campus', 'online']

export default function UnitDetailView({ unit, onBack }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [staffList, setStaffList] = useState<StaffUser[]>([])
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [invitedStaff, setInvitedStaff] = useState<StaffUser[]>([])

  const [day, setDay] = useState('Monday')
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState('2hr')
  const [mode, setMode] = useState('on-campus')
  const [location, setLocation] = useState('')

  useEffect(() => {
    api.getSessions(unit.id).then(setSessions).catch(console.error)
    api.getAllStaff().then(setStaffList).catch(console.error)
  }, [unit.id])

  const handleAddSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const dayIndex = DAYS.indexOf(day) + 1
      const startTime = `2026-06-0${dayIndex}T${time}:00`
      await api.createSession(unit.id, {
        title: `${unit.code} ${duration} ${mode}`,
        startTime,
        location: mode === 'online' ? 'Online' : location,
      })
      const updated = await api.getSessions(unit.id)
      setSessions(updated)
      setShowSessionForm(false)
      setLocation('')
    } catch (err) {
      console.error(err)
    }
  }

  const handleInvite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const staff = staffList.find(s => String(s.id) === selectedStaffId)
    if (!staff) return
    if (!invitedStaff.find(s => s.id === staff.id)) {
      setInvitedStaff([...invitedStaff, staff])
    }
    setSelectedStaffId('')
    setShowInviteForm(false)
  }

  const handleRemoveStaff = (id: number) => {
    setInvitedStaff(invitedStaff.filter(s => s.id !== id))
  }

  const uninvited = staffList.filter(s => !invitedStaff.find(i => i.id === s.id))

  return (
    <div className="unit-detail">
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

      {/* Sessions */}
      <div className="detail-section">
        <div className="section-header">
          <div>
            <h2>Sessions</h2>
            <p>{sessions.length} session{sessions.length !== 1 ? 's' : ''} defined</p>
          </div>
          <button className="add-btn" onClick={() => setShowSessionForm(true)}>+ Add Session</button>
        </div>

        {sessions.length === 0 && (
          <div className="empty-info">No sessions yet. Add sessions so tutors know what to indicate availability for.</div>
        )}

        <div className="sessions-grid">
          {sessions.map(session => (
            <div key={session.id} className="session-card">
              <div className="session-card-top">
                <span className={`mode-badge ${session.location === 'Online' ? 'online' : 'on-campus'}`}>
                  {session.location === 'Online' ? '🌐 Online' : '🏫 On-campus'}
                </span>
              </div>
              <div className="session-day">{session.title}</div>
              <div className="session-time">{new Date(session.startTime).toLocaleString()}</div>
              {session.location && <div className="session-location">{session.location}</div>}
              <div className="session-time">{session.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Session Modal */}
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
                  <select value={mode} onChange={e => setMode(e.target.value)}>
                    {MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                {mode === 'on-campus' && (
                  <div className="form-field">
                    <label>Location</label>
                    <input type="text" placeholder="e.g. P Block P404"
                      value={location} onChange={e => setLocation(e.target.value)} />
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

      {/* Tutors */}
      <div className="detail-section">
        <div className="section-header">
          <div>
            <h2>Invited Tutors</h2>
            <p>{invitedStaff.length} invited</p>
          </div>
          {uninvited.length > 0 && (
            <button className="add-btn" onClick={() => setShowInviteForm(true)}>+ Invite Tutor</button>
          )}
        </div>

        {invitedStaff.length === 0 && (
          <div className="empty-info">No tutors invited yet. Invite tutors to collect their availability.</div>
        )}

        <div className="tutors-list">
          {invitedStaff.map(staff => (
            <div key={staff.id} className="tutor-row">
              <div className="tutor-avatar">{staff.fullName.split(' ').map(n => n[0]).join('')}</div>
              <div className="tutor-info">
                <span className="tutor-name">{staff.fullName}</span>
                <span className="tutor-email">{staff.email}</span>
              </div>
              <span className="status-badge pending">⏳ Pending</span>
              <button className="remove-tutor-btn" onClick={() => handleRemoveStaff(staff.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteForm && (
        <div className="modal-overlay" onClick={() => setShowInviteForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Invite Tutor</h2>
            <p className="modal-sub">Select a tutor to invite them to submit their availability.</p>
            <form onSubmit={handleInvite} className="detail-form">
              <div className="form-field">
                <label>Select Tutor</label>
                <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} required>
                  <option value="">-- Choose a tutor --</option>
                  {uninvited.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName} — {s.email}</option>
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