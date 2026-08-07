import { useEffect, useState } from 'react'
//import { api } from "../../services/api";
import { coordinatorMockApi as api } from "../../services/coordinatorMockApi";
import AddSessionForm from './AddSessionForm'

interface Session {
  id: number;
  title: string;
  startTime: string;
  location: string;
  status: string;
  // Client-side only — the backend Session entity has no "mode" field,
  // so this exists purely to drive the badge/edit UI here. It's inferred
  // from location when a session first loads, and can be changed by the
  // local-only edit below.
  mode?: 'on-campus' | 'online';
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

const MODES: Session['mode'][] = ['on-campus', 'online']

function inferMode(session: { location: string }): Session['mode'] {
  return session.location === 'Online' ? 'online' : 'on-campus'
}

function modeLabel(mode: Session['mode']) {
  if (mode === 'online') return '🌐 Online'
  return '🏫 On-campus'
}

export default function UnitDetailView({ unit, onBack }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [staffList, setStaffList] = useState<StaffUser[]>([])
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [invitedStaff, setInvitedStaff] = useState<StaffUser[]>([])

  // ── Invite Tutors: searchable multi-select, Invite All / Invite Selected ──
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [selectedInviteIds, setSelectedInviteIds] = useState<Set<number>>(new Set())
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')

  // ── Editable sessions (local only — see note above Session type) ──────
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editMode, setEditMode] = useState<Session['mode']>('on-campus')

  const loadSessions = async () => {
    const data: any[] = await api.getSessions(unit.id)
    setSessions(data.map(s => ({ ...s, mode: inferMode(s) })))
  }

  useEffect(() => {
    loadSessions().catch(console.error)
    api.getAllStaff().then(setStaffList).catch(console.error)
    api.getUnitInvitations(unit.id).then(invitations => {
      setInvitedStaff(invitations.map((inv: any) => inv.staff))
    }).catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.id])

  const handleRemoveStaff = async (id: number) => {
    try {
      await api.removeInvitation(unit.id, id)
      setInvitedStaff(invitedStaff.filter(s => s.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const uninvited = staffList.filter(s => !invitedStaff.find(i => i.id === s.id))

  const filteredUninvited = uninvited.filter(s => {
    const q = inviteSearch.trim().toLowerCase()
    if (!q) return true
    return s.fullName?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
  })

  const openInviteForm = () => {
    setShowInviteForm(true)
    setInviteSearch('')
    setSelectedInviteIds(new Set())
    setInviteMessage('')
  }

  const toggleInviteSelection = (id: number) => {
    setSelectedInviteIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Shared by both "Invite Selected" and "Invite All" — invites each id
  // one at a time against the existing single-invite endpoint, since
  // there's no bulk-invite endpoint on the backend.
  const inviteMany = async (ids: number[]) => {
    if (ids.length === 0) return
    setInviting(true)
    setInviteMessage('')
    let successCount = 0
    for (const id of ids) {
      try {
        await api.inviteStaff(unit.id, id)
        successCount++
      } catch (err) {
        console.error(err)
      }
    }
    const invitations = await api.getUnitInvitations(unit.id).catch(() => [])
    setInvitedStaff(invitations.map((inv: any) => inv.staff))
    setSelectedInviteIds(new Set())
    setInviting(false)
    if (successCount < ids.length) {
      setInviteMessage(`Invited ${successCount} of ${ids.length} — some may have already been invited or failed.`)
    } else {
      setShowInviteForm(false)
      setInviteSearch('')
    }
  }

  const handleInviteSelected = () => inviteMany([...selectedInviteIds])

  const handleInviteAll = () => {
    if (uninvited.length === 0) return
    const ok = window.confirm(`Invite all ${uninvited.length} tutor(s) not yet on this unit?`)
    if (!ok) return
    inviteMany(uninvited.map(s => s.id))
  }

  // ── Session editing (local only) ──────────────────────────────────────
  const openEditSession = (session: Session) => {
    setEditingSession(session)
    setEditTitle(session.title)
    setEditLocation(session.location === 'Online' ? '' : session.location)
    setEditMode(session.mode ?? inferMode(session))
  }

  const handleSaveSessionEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingSession) return
    // NOTE: there is no backend endpoint to update a session (only
    // create/read exist), so this only changes what you see here right
    // now — it will reset if you refresh the page or come back later. A
    // real PUT/PATCH endpoint would be needed to make this persist.
    setSessions(prev => prev.map(s => s.id === editingSession.id
      ? {
          ...s,
          title: editTitle,
          location: editMode === 'online' ? 'Online' : editLocation,
          mode: editMode,
        }
      : s
    ))
    setEditingSession(null)
  }

  // Add Session takes over the full main-content area (same as this
  // detail view does relative to the units list), rather than opening
  // as an overlay modal — so it opens full width beside the sidebar
  // just like this Manage page does.
  if (showSessionForm) {
    return (
      <AddSessionForm
        unitId={unit.id}
        unitLabel={`${unit.code} — ${unit.name}`}
        onClose={() => setShowSessionForm(false)}
        onSessionsCreated={loadSessions}
      />
    )
  }

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

        {sessions.length > 0 && (
          <p className="avail-range-hint" style={{ marginBottom: '12px' }}>
            Editing a session updates it here only — there's no backend endpoint yet to save
            session edits permanently, so changes reset on refresh.
          </p>
        )}

        {sessions.length === 0 && (
          <div className="empty-info">No sessions yet. Add sessions so tutors know what to indicate availability for.</div>
        )}

        <div className="sessions-grid">
          {sessions.map(session => (
            <div key={session.id} className="session-card">
              <div className="session-card-top">
                <span className={`mode-badge ${session.mode ?? inferMode(session)}`}>
                  {modeLabel(session.mode ?? inferMode(session))}
                </span>
                <button type="button" className="session-edit-btn" onClick={() => openEditSession(session)}>Edit</button>
              </div>
              <div className="session-day">{session.title}</div>
              <div className="session-time">{new Date(session.startTime).toLocaleString()}</div>
              {session.location && <div className="session-location">{session.location}</div>}
              <div className="session-time">{session.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Session Modal (local only) */}
      {editingSession && (
        <div className="modal-overlay" onClick={() => setEditingSession(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Session</h2>
            <p className="avail-range-hint" style={{ marginBottom: '12px' }}>
              This updates the session here only — there's no backend endpoint yet to save it
              permanently, so it resets if you refresh.
            </p>
            <form onSubmit={handleSaveSessionEdit} className="detail-form">
              <div className="form-field">
                <label>Session Type / Title</label>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
              </div>
              <div className="form-row-2">
                <div className="form-field">
                  <label>Mode</label>
                  <select value={editMode} onChange={e => setEditMode(e.target.value as Session['mode'])}>
                    {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {editMode !== 'online' && (
                  <div className="form-field">
                    <label>Location</label>
                    <input type="text" placeholder="e.g. P Block P404"
                      value={editLocation} onChange={e => setEditLocation(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setEditingSession(null)}>Cancel</button>
                <button type="submit" className="confirm-btn">Save Changes</button>
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
            <button className="add-btn" onClick={openInviteForm}>+ Invite Tutors</button>
          )}
        </div>

        {invitedStaff.length === 0 && (
          <div className="empty-info">No tutors invited yet. Invite tutors to collect their availability.</div>
        )}

        <div className="tutors-list">
          {invitedStaff.map(staff => {
            const name = staff.fullName || staff.email
            const initials = staff.fullName
              ? staff.fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase()
              : staff.email[0].toUpperCase()
            return (
              <div key={staff.id} className="tutor-row">
                <div className="tutor-avatar">{initials}</div>
                <div className="tutor-info">
                  <span className="tutor-name">{name}</span>
                  <span className="tutor-email">{staff.email}</span>
                </div>
                <span className="status-badge pending">⏳ Pending</span>
                <button className="remove-tutor-btn" onClick={() => handleRemoveStaff(staff.id)}>Remove</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Invite Tutors Modal — searchable multi-select */}
      {showInviteForm && (
        <div className="modal-overlay" onClick={() => !inviting && setShowInviteForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Invite Tutors</h2>
            <p className="modal-sub">Search and select tutors to invite, or invite everyone not yet on this unit.</p>

            <div className="chat-search-box" style={{ marginBottom: '14px' }}>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={inviteSearch}
                onChange={e => setInviteSearch(e.target.value)}
              />
            </div>

            <div className="chat-member-checklist">
              {filteredUninvited.length === 0 && (
                <div className="chat-empty-hint">
                  {uninvited.length === 0 ? 'Everyone is already invited.' : 'No tutors match your search.'}
                </div>
              )}
              {filteredUninvited.map(s => {
                const checked = selectedInviteIds.has(s.id)
                return (
                  <label key={s.id} className={`chat-member-row ${checked ? 'checked' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleInviteSelection(s.id)} />
                    <div className="tutor-avatar chat-avatar-sm">{(s.fullName || s.email)[0].toUpperCase()}</div>
                    <div className="chat-list-item-info">
                      <span className="chat-list-item-name">{s.fullName}</span>
                      <span className="chat-list-item-sub">{s.email}</span>
                    </div>
                  </label>
                )
              })}
            </div>

            {inviteMessage && <p className="avail-error-message">{inviteMessage}</p>}

            <div className="modal-actions">
              <button type="button" className="cancel-btn" disabled={inviting} onClick={() => setShowInviteForm(false)}>
                Cancel
              </button>
              <button type="button" className="cancel-btn" disabled={inviting || uninvited.length === 0} onClick={handleInviteAll}>
                Invite All ({uninvited.length})
              </button>
              <button type="button" className="confirm-btn" disabled={inviting || selectedInviteIds.size === 0} onClick={handleInviteSelected}>
                {inviting ? 'Inviting...' : `Invite Selected (${selectedInviteIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
