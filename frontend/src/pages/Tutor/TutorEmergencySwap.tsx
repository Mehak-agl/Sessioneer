import { useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api'
import StaffSidebar from '../../components/TutorSidebar'

// ── Types (mirror what mockApi.ts / the real backend send back) ─────────

interface StaffUser {
  id: number
  fullName: string
  email: string
}

interface UnitSummary {
  id: number
  code: string
  name: string
  semester: string
}

interface SessionInfo {
  id: number
  title: string
  startTime: string
  endTime?: string
  location: string
  unit?: { id: number }
}

interface AllocationInfo {
  id: number
  status: string
  session: SessionInfo
  staff: StaffUser
}

interface SwapRequestInfo {
  id: number
  unit: { id: number; code?: string; name?: string }
  scope: 'SESSION' | 'SERIES'
  sessions: SessionInfo[]
  requestingStaff: StaffUser
  targetStaff: StaffUser
  reason: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED'
  createdAt: string
  respondedAt?: string
}

// A "swap group" is one recurring class slot (same title/day/time/room),
// mirroring the grouping CoordinatorAllocations.tsx uses — "swap the whole
// session" means every remaining occurrence in this group.
interface SwapGroup {
  key: string
  unitId: number
  unitCode: string
  title: string
  location: string
  dayOfWeek: number
  minutesOfDay: number
  timeLabel: string
  sessions: SessionInfo[]
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function groupAllocations(allocations: AllocationInfo[], unitCode: (id: number) => string): SwapGroup[] {
  const now = Date.now()
  const map = new Map<string, SwapGroup>()
  for (const a of allocations) {
    // Any row returned here means this session is allocated to the
    // current tutor — the real backend's AllocationStatus (PROPOSED /
    // CONFIRMED) isn't the same thing as a session being allocated or
    // not, so there's nothing to filter out on a.status itself.
    const s = a.session
    if (!s || new Date(s.startTime).getTime() < now) continue // only upcoming classes can be swapped
    const unitId = s.unit?.id ?? 0
    const d = new Date(s.startTime)
    const minutesOfDay = d.getHours() * 60 + d.getMinutes()
    const key = [unitId, d.getDay(), minutesOfDay, s.location, s.title].join('|')
    let group = map.get(key)
    if (!group) {
      group = {
        key,
        unitId,
        unitCode: unitCode(unitId),
        title: s.title,
        location: s.location,
        dayOfWeek: d.getDay(),
        minutesOfDay,
        timeLabel: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        sessions: [],
      }
      map.set(key, group)
    }
    group.sessions.push(s)
  }
  const groups = Array.from(map.values())
  for (const g of groups) {
    g.sessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }
  groups.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.minutesOfDay - b.minutesOfDay)
  return groups
}

const STATUS_LABEL: Record<SwapRequestInfo['status'], string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
}

export default function TutorEmergencySwap() {
  const [myStaffId, setMyStaffId] = useState<number | null>(null)
  const [units, setUnits] = useState<UnitSummary[]>([])
  const [allocations, setAllocations] = useState<AllocationInfo[]>([])
  const [outgoing, setOutgoing] = useState<SwapRequestInfo[]>([])
  const [incoming, setIncoming] = useState<SwapRequestInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [respondingId, setRespondingId] = useState<number | null>(null)

  const [formGroup, setFormGroup] = useState<SwapGroup | null>(null)
  const [formScope, setFormScope] = useState<'SESSION' | 'SERIES'>('SESSION')
  const [formSessionId, setFormSessionId] = useState<number | null>(null)
  const [formTargetId, setFormTargetId] = useState<number | ''>('')
  const [formReason, setFormReason] = useState('')
  const [formTutors, setFormTutors] = useState<StaffUser[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.getUnits().then(setUnits).catch(console.error)
    api.getMyInvitations().then((invitations: any[]) => {
      setMyStaffId(invitations[0]?.staff?.id ?? null)
    }).catch(console.error)
  }, [])

  const refreshRequests = () => {
    api.getMySwapRequests()
      .then((r: any) => {
        setOutgoing(r.outgoing ?? [])
        setIncoming(r.incoming ?? [])
      })
      .catch(console.error)
  }

  useEffect(refreshRequests, [])

  useEffect(() => {
    if (myStaffId == null) return
    setLoading(true)
    api.getMyAllocations(myStaffId)
      .then(setAllocations)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [myStaffId])

  useEffect(() => {
    if (!formGroup) { setFormTutors([]); return }
    api.getUnitTutors(formGroup.unitId).then(setFormTutors).catch(console.error)
  }, [formGroup])

  const unitCode = useMemo(() => {
    const map = new Map(units.map(u => [u.id, u.code]))
    return (id: number) => map.get(id) ?? 'Unit'
  }, [units])

  const groups = useMemo(() => groupAllocations(allocations, unitCode), [allocations, unitCode])

  const pendingIncoming = incoming.filter(r => r.status === 'PENDING')
  const respondedIncoming = incoming.filter(r => r.status !== 'PENDING')

  function openForm(group: SwapGroup, scope: 'SESSION' | 'SERIES', session?: SessionInfo) {
    setFormGroup(group)
    setFormScope(scope)
    setFormSessionId(session ? session.id : null)
    setFormTargetId('')
    setFormReason('')
    setError('')
  }

  function closeForm() {
    setFormGroup(null)
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    if (!formGroup || formTargetId === '') return
    setSubmitting(true)
    setError('')
    try {
      const sessionIds =
        formScope === 'SERIES'
          ? formGroup.sessions.map(s => s.id)
          : formSessionId != null
            ? [formSessionId]
            : []
      await api.createSwapRequest({
        unitId: formGroup.unitId,
        scope: formScope,
        sessionIds,
        targetStaffId: Number(formTargetId),
        reason: formReason.trim(),
      })
      setSuccess("Swap request sent — you'll see it here once they respond.")
      setFormGroup(null)
      refreshRequests()
    } catch (err: any) {
      setError(err?.message || 'Could not send swap request.')
    } finally {
      setSubmitting(false)
    }
  }

    async function respond(requestId: number, accept: boolean) {
    if (respondingId != null) return // already submitting one — ignore extra clicks
    setRespondingId(requestId)
    setError('')
    setSuccess('')
    try {
      await api.respondToSwapRequest(requestId, accept)
      setSuccess(accept ? 'Class accepted — it now belongs to you.' : 'Swap request declined.')
      refreshRequests()
      if (myStaffId != null) api.getMyAllocations(myStaffId).then(setAllocations).catch(console.error)
    } catch (err: any) {
      setError(err?.message || 'Could not respond to swap request.')
    } finally {
      setRespondingId(null)
    }
  }

  return (
    <div className="staff-dashboard-page">
      <StaffSidebar />
      <main className="staff-main-content">
        <header className="staff-topbar">
          <div className="staff-page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Emergency Class Swap</h1>
              <p>Hand off a class you can't make to another tutor — no coordinator approval needed</p>
            </div>
          </div>
        </header>

        {error && <div className="form-error-banner">{error}</div>}
        {success && <div className="form-success-banner">{success}</div>}

        {/* Incoming requests — other tutors asking me to cover for them */}
        <section className="staff-panel">
          <div className="staff-panel-heading">
            <div>
              <h2>Incoming Requests</h2>
              <p>Other tutors asking you to take over a class or session</p>
            </div>
          </div>

          {pendingIncoming.length === 0 && (
            <div className="empty-state-warning">No incoming swap requests right now.</div>
          )}

          {pendingIncoming.map(r => (
            <div key={r.id} className="swap-request-card">
              <div className="swap-request-info">
                <div className="unit-code-badge">{r.unit.code}</div>
                <div>
                  <h3>{r.scope === 'SERIES' ? `${r.sessions[0]?.title ?? 'Session'} — whole session` : r.sessions[0]?.title}</h3>
                  <p>
                    From <strong>{r.requestingStaff.fullName}</strong> ·{' '}
                    {r.scope === 'SERIES'
                      ? `${r.sessions.length} remaining class${r.sessions.length === 1 ? '' : 'es'}`
                      : formatDate(r.sessions[0]?.startTime ?? r.createdAt)}
                  </p>
                  {r.reason && <p className="swap-reason">"{r.reason}"</p>}
                </div>
              </div>
              <div className="swap-request-actions">
                <button type="button" className="btn-swap-accept" disabled={respondingId === r.id} onClick={() => respond(r.id, true)}>
                  {respondingId === r.id ? 'Accepting…' : 'Accept'}
                </button>
                <button type="button" className="btn-swap-decline" disabled={respondingId === r.id} onClick={() => respond(r.id, false)}>
                  Decline
                </button>
              </div>
            </div>
          ))}

          {respondedIncoming.length > 0 && (
            <>
              <div className="swap-subheading">Previously responded to</div>
              {respondedIncoming.map(r => (
                <div key={r.id} className="swap-request-card responded">
                  <div className="swap-request-info">
                    <div className="unit-code-badge">{r.unit.code}</div>
                    <div>
                      <h3>{r.scope === 'SERIES' ? `${r.sessions[0]?.title ?? 'Session'} — whole session` : r.sessions[0]?.title}</h3>
                      <p>From <strong>{r.requestingStaff.fullName}</strong></p>
                    </div>
                  </div>
                  <span className={`status-badge ${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status]}</span>
                </div>
              ))}
            </>
          )}
        </section>

        {/* My classes — request a swap or hand-off */}
        <section className="staff-panel">
          <div className="staff-panel-heading">
            <div>
              <h2>My Classes</h2>
              <p>Request a swap for one class, or hand off the whole session</p>
            </div>
          </div>

          {loading && <p>Loading...</p>}
          {!loading && groups.length === 0 && (
            <div className="empty-state-warning">No upcoming allocated classes to swap.</div>
          )}

          {groups.map(group => (
            <div key={group.key} className="swap-session-group">
              <div className="swap-session-group-header">
                <div className="unit-code-badge">{group.unitCode}</div>
                <div className="swap-session-group-info">
                  <h3>{group.title}</h3>
                  <p>{DAY_NAMES[group.dayOfWeek]}s, {group.timeLabel} · {group.location}</p>
                </div>
                <button type="button" className="session-edit-btn" onClick={() => openForm(group, 'SERIES')}>
                  Swap whole session
                </button>
              </div>
              <div className="swap-session-dates">
                {group.sessions.map(s => (
                  <div key={s.id} className="swap-session-date-row">
                    <span>{formatDate(s.startTime)}</span>
                    <button type="button" className="session-edit-btn" onClick={() => openForm(group, 'SESSION', s)}>
                      Request swap
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Inline request form */}
        {formGroup && (
          <div className="swap-form-overlay" onClick={closeForm}>
            <form className="swap-form-panel" onClick={e => e.stopPropagation()} onSubmit={submitForm}>
              <h3>
                {formScope === 'SERIES'
                  ? `Swap whole session: ${formGroup.title}`
                  : `Request swap: ${formGroup.title}`}
              </h3>
              <p className="swap-form-sub">
                {formScope === 'SERIES'
                  ? `All ${formGroup.sessions.length} remaining ${DAY_NAMES[formGroup.dayOfWeek]} classes, ${formGroup.timeLabel}`
                  : formSessionId != null
                    ? formatDate(formGroup.sessions.find(s => s.id === formSessionId)?.startTime ?? '')
                    : ''}
              </p>

              <label className="swap-form-label">
                Hand off to
                <select
                  value={formTargetId}
                  onChange={e => setFormTargetId(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                >
                  <option value="">Select a tutor…</option>
                  {formTutors.map(t => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
              </label>
              {formTutors.length === 0 && (
                <p className="swap-form-hint">No other tutors are currently active on this unit yet.</p>
              )}

              <label className="swap-form-label">
                Reason (optional)
                <textarea
                  value={formReason}
                  onChange={e => setFormReason(e.target.value)}
                  placeholder="e.g. Family emergency, sick, unavailable that day…"
                  rows={3}
                />
              </label>

              <div className="swap-form-actions">
                <button type="button" className="session-edit-btn" onClick={closeForm}>Cancel</button>
                <button type="submit" className="btn-swap-accept" disabled={submitting || formTargetId === ''}>
                  {submitting ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* My sent requests */}
        <section className="staff-panel">
          <div className="staff-panel-heading">
            <div>
              <h2>My Requests</h2>
              <p>Swaps you've asked another tutor to take on</p>
            </div>
          </div>

          {outgoing.length === 0 && (
            <div className="empty-state-warning">You haven't requested any swaps yet.</div>
          )}

          {outgoing.map(r => (
            <div key={r.id} className="swap-request-card responded">
              <div className="swap-request-info">
                <div className="unit-code-badge">{r.unit.code}</div>
                <div>
                  <h3>{r.scope === 'SERIES' ? `${r.sessions[0]?.title ?? 'Session'} — whole session` : r.sessions[0]?.title}</h3>
                  <p>
                    To <strong>{r.targetStaff.fullName}</strong> ·{' '}
                    {r.scope === 'SERIES'
                      ? `${r.sessions.length} remaining class${r.sessions.length === 1 ? '' : 'es'}`
                      : formatDate(r.sessions[0]?.startTime ?? r.createdAt)}
                  </p>
                </div>
              </div>
              <span className={`status-badge ${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status]}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
