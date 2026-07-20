import { useState } from 'react'
interface Unit {
  id: number;
  code: string;
  name: string;
  semester: string;
}
import { api } from "../../services/api";


type Props = {
  units: Unit[]
  onBack: () => void
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

type ModePreference = 'on-campus' | 'online' | 'no-preference'
type CampusPreference = 'Gardens Point' | 'Kelvin Grove' | 'No preference'

const slotKey = (day: string, time: string) => `${day}-${time}`

export default function TutorAvailabilityView({ units, onBack }: Props) {
  const [activeUnitId, setActiveUnitId] = useState<number>(units[0]?.id ?? 0)
  const [slotsByUnit, setSlotsByUnit] = useState<Record<string, Set<string>>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add')

  const [modePreference, setModePreference] = useState<ModePreference>('no-preference')
  const [campusPreference, setCampusPreference] = useState<CampusPreference>('No preference')
  const [maxSessions, setMaxSessions] = useState(3)
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const activeSlots = slotsByUnit[activeUnitId] ?? new Set<string>()

  const setActiveSlots = (updater: (prev: Set<string>) => Set<string>) => {
    setSlotsByUnit(prev => ({
      ...prev,
      [activeUnitId]: updater(prev[activeUnitId] ?? new Set()),
    }))
  }

  const handleCellMouseDown = (day: string, time: string) => {
    const key = slotKey(day, time)
    const isSelected = activeSlots.has(key)
    setDragMode(isSelected ? 'remove' : 'add')
    setIsDragging(true)
    setActiveSlots(prev => {
      const next = new Set(prev)
      if (isSelected) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleCellMouseEnter = (day: string, time: string) => {
    if (!isDragging) return
    const key = slotKey(day, time)
    setActiveSlots(prev => {
      const next = new Set(prev)
      if (dragMode === 'add') next.add(key)
      else next.delete(key)
      return next
    })
  }

  const stopDrag = () => setIsDragging(false)

  const selectDay = (day: string) => {
    setActiveSlots(prev => {
      const next = new Set(prev)
      TIMES.forEach(t => next.add(slotKey(day, t)))
      return next
    })
  }

  const clearDay = (day: string) => {
    setActiveSlots(prev => {
      const next = new Set(prev)
      TIMES.forEach(t => next.delete(slotKey(day, t)))
      return next
    })
  }

  const unitsWithSlots = units.filter(u => (slotsByUnit[u.id]?.size ?? 0) > 0)
  const totalSlots = unitsWithSlots.reduce((sum, u) => sum + (slotsByUnit[u.id]?.size ?? 0), 0)
  const canSubmit = unitsWithSlots.length > 0 && confirmed

  const handleSubmit = async () => {
    if (!canSubmit) return
    try {
      for (const unit of unitsWithSlots) {
        const slots = [...(slotsByUnit[unit.id] ?? [])]
        for (const slot of slots) {
          const [day, time] = slot.split('-')
          const dayIndex = ['Monday','Tuesday','Wednesday','Thursday','Friday'].indexOf(day) + 1
          const startTime = `2026-06-0${dayIndex}T${time}:00`
          const endTimeHour = String(parseInt(time.split(':')[0]) + 1).padStart(2, '0')
          const endTime = `2026-06-0${dayIndex}T${endTimeHour}:00:00`
          await api.submitAvailability({
            unitId: Number(unit.id),
            startTime,
            endTime
          })
        }
      }
      setSubmitted(true)
    } catch (err) {
      console.error(err)
    }
  }

  if (submitted) {
    return (
      <div className="avail-success">
        <div className="avail-success-icon">✓</div>
        <h2>Availability Submitted!</h2>
        <p>Your coordinators have been notified. Here's a summary of what was submitted:</p>
        <div className="avail-success-breakdown">
          {unitsWithSlots.map(u => (
            <div key={u.id} className="avail-success-unit-row">
              <span className="avail-success-unit-code">{u.code}</span>
              <span className="avail-success-unit-name">{u.name}</span>
              <span className="avail-success-unit-slots">{slotsByUnit[u.id]?.size ?? 0} slot{(slotsByUnit[u.id]?.size ?? 0) !== 1 ? 's' : ''}</span>
            </div>
          ))}
          <div className="avail-success-total">
            {totalSlots} total time slot{totalSlots !== 1 ? 's' : ''} across {unitsWithSlots.length} unit{unitsWithSlots.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="avail-back-action-btn" onClick={onBack}>← Back to Dashboard</button>
      </div>
    )
  }

  const activeUnit = units.find(u => u.id === activeUnitId)

  return (
    <div className="tutor-availability" onMouseUp={stopDrag} onMouseLeave={stopDrag}>
      <button className="avail-back-link" onClick={onBack}>← Back to Dashboard</button>

      <div className="avail-header">
        <div>
          <h1>Submit Your Availability</h1>
          <p>Select a unit below, then mark when you're free each week. Your coordinator will use this to schedule sessions.</p>
        </div>
        <div className="avail-deadline-badge">
          <span className="avail-deadline-icon">⏰</span>
          <div>
            <strong>14 days left</strong>
            <span>Deadline to submit</span>
          </div>
        </div>
      </div>

      {/* Unit selector */}
      <div className="avail-units-panel">
        <h2>Units You've Been Invited To</h2>
        <p>Select a unit to fill in your availability for it. You can switch between units and set different schedules for each.</p>
        <div className="avail-unit-tabs">
          {units.length === 0 && (
            <p className="avail-no-units">You haven't been invited to any units yet. Check back later.</p>
          )}
          {units.map(unit => {
            const unitSlotCount = slotsByUnit[unit.id]?.size ?? 0
            const isActive = unit.id === activeUnitId
            return (
              <button
                key={unit.id}
                type="button"
                className={`avail-unit-tab ${isActive ? 'active' : ''} ${unitSlotCount > 0 ? 'has-slots' : ''}`}
                onClick={() => setActiveUnitId(unit.id)}

              >
                <span className="avail-tab-code">{unit.code}</span>
                <span className="avail-tab-name">{unit.name}</span>
                <span className="avail-tab-sem">{unit.semester}</span>
                {unitSlotCount > 0 && (
                  <span className="avail-tab-badge">{unitSlotCount} slot{unitSlotCount !== 1 ? 's' : ''}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Weekly grid */}
      {activeUnit && (
        <div className="avail-grid-section">
          <div className="avail-grid-heading">
            <div>
              <h2>
                Weekly Availability
                <span className="avail-grid-unit-label"> — {activeUnit.code}</span>
              </h2>
              <p>Click or drag to mark hours you're free. Click a day header to select or clear the whole day.</p>
            </div>
            <span className={`avail-slot-count ${activeSlots.size > 0 ? 'has-slots' : ''}`}>
              {activeSlots.size} slot{activeSlots.size !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="avail-grid" style={{ userSelect: 'none' }}>
            <div className="avail-grid-corner" />

            {DAYS.map(day => {
              const dayCount = TIMES.filter(t => activeSlots.has(slotKey(day, t))).length
              const allSelected = dayCount === TIMES.length
              return (
                <button
                  key={day}
                  type="button"
                  className={`avail-day-header ${allSelected ? 'all-selected' : dayCount > 0 ? 'partial' : ''}`}
                  onClick={() => allSelected ? clearDay(day) : selectDay(day)}
                >
                  <span className="avail-day-label">{day.slice(0, 3)}</span>
                  {dayCount > 0 && <span className="avail-day-count">{dayCount}h</span>}
                </button>
              )
            })}

            {TIMES.map(time => (
              <div key={time} className="avail-row-fragment">
                <div className="avail-time-label">{time}</div>
                {DAYS.map(day => {
                  const key = slotKey(day, time)
                  const isSelected = activeSlots.has(key)
                  return (
                    <div
                      key={key}
                      className={`avail-cell ${isSelected ? 'selected' : ''}`}
                      onMouseDown={() => handleCellMouseDown(day, time)}
                      onMouseEnter={() => handleCellMouseEnter(day, time)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preferences */}
      <div className="avail-prefs-section">
        <h2>Teaching Preferences</h2>
        <p>These apply across all units. Help your coordinator place you in the most suitable sessions.</p>

        <div className="avail-pref-field">
          <label>Mode Preference</label>
          <div className="avail-pill-row">
            {(['on-campus', 'online', 'no-preference'] as ModePreference[]).map(m => (
              <button key={m} type="button"
                className={`avail-pill ${modePreference === m ? 'selected' : ''}`}
                onClick={() => setModePreference(m)}>
                {m === 'on-campus' ? '🏫 On-campus' : m === 'online' ? '🌐 Online' : '⚖️ No preference'}
              </button>
            ))}
          </div>
        </div>

        <div className="avail-pref-field">
          <label>Campus Preference</label>
          <div className="avail-pill-row">
            {(['Gardens Point', 'Kelvin Grove', 'No preference'] as CampusPreference[]).map(c => (
              <button key={c} type="button"
                className={`avail-pill ${campusPreference === c ? 'selected' : ''}`}
                onClick={() => setCampusPreference(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="avail-pref-field">
          <label>
            Maximum sessions per week
            <span className="avail-max-val">{maxSessions}</span>
          </label>
          <input type="range" min={1} max={10} value={maxSessions}
            onChange={e => setMaxSessions(Number(e.target.value))}
            className="avail-slider" />
          <div className="avail-slider-labels">
            <span>1 session</span>
            <span>10 sessions</span>
          </div>
        </div>

        <div className="avail-pref-field">
          <label>Additional Notes <span className="avail-optional">(optional)</span></label>
          <textarea className="avail-notes" rows={3}
            placeholder="e.g. I'm not available before 9am, I prefer consistent weekly slots, comfortable with any topic..."
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Submit */}
      <div className="avail-submit-section">
        <div className="avail-summary">
          {unitsWithSlots.length === 0 ? (
            <p className="avail-summary-empty">Select a unit above and mark at least one time slot to continue.</p>
          ) : (
            <div className="avail-summary-breakdown">
              {unitsWithSlots.map(u => (
                <div key={u.id} className="avail-summary-row">
                  <span className="avail-summary-code">{u.code}</span>
                  <span className="avail-summary-name">{u.name}</span>
                  <span className="avail-summary-slots">{slotsByUnit[u.id]?.size ?? 0} slot{(slotsByUnit[u.id]?.size ?? 0) !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="avail-confirm-row">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          <span>I confirm this availability is accurate and I am genuinely available during all selected time slots for the entire semester.</span>
        </label>

        <button className="avail-submit-btn" onClick={handleSubmit} disabled={!canSubmit}>
          Submit Availability →
        </button>
      </div>
    </div>
  )
}
