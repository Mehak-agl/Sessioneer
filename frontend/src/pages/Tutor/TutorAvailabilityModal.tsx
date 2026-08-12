import { useState } from 'react'
import { api } from '../../services/api'

interface UnitOption {
  id: number
  code: string
  name: string
}

interface Props {
  units: UnitOption[]
  initialUnitId?: number | null
  onClose: () => void
}

type ModePreference = 'on-campus' | 'online' | 'no-preference'
type CampusPreference = 'Gardens Point' | 'Kelvin Grove' | 'No preference'

interface UnitPreferences {
  modePreference: ModePreference
  campusPreference: CampusPreference
  maxSessions: number
  notes: string
}

const DEFAULT_PREFS: UnitPreferences = {
  modePreference: 'no-preference',
  campusPreference: 'No preference',
  maxSessions: 3,
  notes: '',
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const slotKey = (day: string, time: string) => `${day}-${time}`

// One dropdown, one unit's grid + preferences at a time. Both slots and
// preferences are kept per-unit in memory so switching the dropdown back
// and forth doesn't lose what you've entered for the other unit — each
// "Save" only submits the CURRENTLY selected unit.
//
// IMPORTANT — preferences are NOT sent to the backend. The
// AvailabilityRequest DTO only accepts unitId/startTime/endTime today, so
// there's nowhere for mode/campus/maxSessions/notes to go server-side yet.
// They're kept here in local state so the UI is complete and testable,
// but they're silently dropped on Save until the backend adds support.
// This mirrors the same limitation flagged in the old
// TutorAvailabilityView.tsx before it was removed.

export default function TutorAvailabilityModal({ units, initialUnitId, onClose }: Props) {
  const [activeUnitId, setActiveUnitId] = useState<number | null>(initialUnitId ?? units[0]?.id ?? null)
  const [slotsByUnit, setSlotsByUnit] = useState<Record<number, Set<string>>>({})
  const [prefsByUnit, setPrefsByUnit] = useState<Record<number, UnitPreferences>>({})
  const [dragging, setDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add')
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const activeSlots = activeUnitId != null ? (slotsByUnit[activeUnitId] ?? new Set<string>()) : new Set<string>()
  const activePrefs = activeUnitId != null ? (prefsByUnit[activeUnitId] ?? DEFAULT_PREFS) : DEFAULT_PREFS

  // Reset the confirm/message state whenever the selected unit changes,
  // computed during render (React's recommended alternative to an effect
  // for "adjust state when a prop changes") rather than as a post-commit effect.
  const [prevActiveUnitId, setPrevActiveUnitId] = useState(activeUnitId)
  if (activeUnitId !== prevActiveUnitId) {
    setPrevActiveUnitId(activeUnitId)
    setConfirmed(false)
    setMessage('')
  }

  const setActiveSlots = (updater: (prev: Set<string>) => Set<string>) => {
    if (activeUnitId == null) return
    setSlotsByUnit(prev => ({ ...prev, [activeUnitId]: updater(prev[activeUnitId] ?? new Set()) }))
  }

  const updatePrefs = (patch: Partial<UnitPreferences>) => {
    if (activeUnitId == null) return
    setPrefsByUnit(prev => ({
      ...prev,
      [activeUnitId]: { ...(prev[activeUnitId] ?? DEFAULT_PREFS), ...patch },
    }))
  }

  const toggle = (day: string, time: string, mode: 'add' | 'remove') => {
    setActiveSlots(prev => {
      const next = new Set(prev)
      const key = slotKey(day, time)
      if (mode === 'add') next.add(key)
      else next.delete(key)
      return next
    })
  }

  const toggleDay = (day: string) => {
    setActiveSlots(prev => {
      const next = new Set(prev)
      const allSelected = TIMES.every(t => next.has(slotKey(day, t)))
      TIMES.forEach(t => (allSelected ? next.delete(slotKey(day, t)) : next.add(slotKey(day, t))))
      return next
    })
  }

  const handleSave = async () => {
    if (activeUnitId == null || activeSlots.size === 0 || !confirmed) return
    setSaving(true)
    setMessage('')
    try {
      for (const slot of activeSlots) {
        const [day, time] = slot.split('-')
        const dayIndex = DAYS.indexOf(day) + 1
        // NOTE: same placeholder-date limitation flagged elsewhere in this
        // project — these dates aren't tied to the real semester calendar
        // yet, just a fixed dummy week. Fine for now, needs a real fix later.
        const startTime = `2026-06-0${dayIndex}T${time}:00`
        const endHour = String(parseInt(time.split(':')[0]) + 1).padStart(2, '0')
        const endTime = `2026-06-0${dayIndex}T${endHour}:00:00`
        // Preferences (activePrefs) are intentionally NOT included here —
        // see the note above the component. Only slot data is ever sent.
        await api.submitAvailability({ unitId: activeUnitId, startTime, endTime })
      }
      const unit = units.find(u => u.id === activeUnitId)
      setMessage(`Saved for ${unit?.code ?? 'this unit'} ✓`)
      setMessageType('success')
      setConfirmed(false)
    } catch (err) {
      console.error(err)
      setMessage('Something went wrong — try again.')
      setMessageType('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal avail-modal" onClick={e => e.stopPropagation()}>
        <div className="avail-modal-header">
          <h2>Submit Availability</h2>
          <button className="group-info-close" onClick={onClose}>×</button>
        </div>

        {units.length === 0 && (
          <p className="avail-no-units">You haven't been invited to any units yet.</p>
        )}

        {units.length > 0 && (
          <>
            <div className="form-field" style={{ marginBottom: '18px' }}>
              <label>Unit</label>
              <select value={activeUnitId ?? ''} onChange={e => setActiveUnitId(Number(e.target.value))}>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.code} — {u.name}</option>
                ))}
              </select>
            </div>

            <div className="avail-grid" onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)}>
              <div className="avail-grid-corner" />
              {DAYS.map(day => {
                const count = TIMES.filter(t => activeSlots.has(slotKey(day, t))).length
                const allSelected = count === TIMES.length
                return (
                  <button
                    key={day}
                    type="button"
                    className={`avail-day-header ${allSelected ? 'all-selected' : count > 0 ? 'partial' : ''}`}
                    onClick={() => toggleDay(day)}
                  >
                    <span className="avail-day-label">{day.slice(0, 3)}</span>
                    {count > 0 && <span className="avail-day-count">{count}h</span>}
                  </button>
                )
              })}

              {TIMES.map(time => (
                <div key={time} className="avail-row-fragment">
                  <div className="avail-time-label">{time}</div>
                  {DAYS.map(day => {
                    const key = slotKey(day, time)
                    const selected = activeSlots.has(key)
                    return (
                      <div
                        key={key}
                        className={`avail-cell ${selected ? 'selected' : ''}`}
                        onMouseDown={() => {
                          const mode = selected ? 'remove' : 'add'
                          setDragMode(mode)
                          setDragging(true)
                          toggle(day, time, mode)
                        }}
                        onMouseEnter={() => {
                          if (dragging) toggle(day, time, dragMode)
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            {/* ── Teaching Preferences ─────────────────────────────────
                Per-unit, kept in local state only. NOT sent to the
                backend yet — see the note above the component. */}
            <div className="avail-prefs-section avail-prefs-in-modal">
              <h2>Teaching Preferences for {units.find(u => u.id === activeUnitId)?.code}</h2>
              <p>These are specific to the unit selected above.</p>

              <div className="avail-pref-field">
                <label>Mode Preference</label>
                <div className="avail-pill-row">
                  {(['on-campus', 'online', 'no-preference'] as ModePreference[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`avail-pill ${activePrefs.modePreference === m ? 'selected' : ''}`}
                      onClick={() => updatePrefs({ modePreference: m })}
                    >
                      {m === 'on-campus' ? '🏫 On-campus' : m === 'online' ? '🌐 Online' : '⚖️ No preference'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="avail-pref-field">
                <label>Campus Preference</label>
                <div className="avail-pill-row">
                  {(['Gardens Point', 'Kelvin Grove', 'No preference'] as CampusPreference[]).map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`avail-pill ${activePrefs.campusPreference === c ? 'selected' : ''}`}
                      onClick={() => updatePrefs({ campusPreference: c })}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="avail-pref-field">
                <label>
                  Maximum sessions per week
                  <span className="avail-max-val">{activePrefs.maxSessions}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={activePrefs.maxSessions}
                  onChange={e => updatePrefs({ maxSessions: Number(e.target.value) })}
                  className="avail-slider"
                />
                <div className="avail-slider-labels">
                  <span>1 session</span>
                  <span>10 sessions</span>
                </div>
              </div>

              <div className="avail-pref-field">
                <label>Additional Notes <span className="avail-optional">(optional)</span></label>
                <textarea
                  className="avail-notes"
                  rows={3}
                  placeholder="e.g. I'm not available before 9am, prefer consistent weekly slots..."
                  value={activePrefs.notes}
                  onChange={e => updatePrefs({ notes: e.target.value })}
                />
              </div>
            </div>

            <label className="avail-confirm-row">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
              <span>I confirm this availability is accurate for the unit selected above.</span>
            </label>

            {message && (
              <p className={messageType === 'success' ? 'avail-saved-message' : 'avail-error-message'}>
                {message}
              </p>
            )}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={onClose}>Done</button>
              <button
                className="confirm-btn"
                disabled={activeSlots.size === 0 || !confirmed || saving}
                onClick={handleSave}
              >
                {saving ? 'Saving...' : 'Save Availability'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
