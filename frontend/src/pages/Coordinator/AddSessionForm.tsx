import { useState } from 'react'
import { api } from '../../services/api'
import TimeWheelPicker, {
 type WheelTime,
  wheelTimeTo24h,
  wheelTimeDurationMinutes,
  formatDurationMinutes,
} from '../../components/TimeWheelPicker'

interface Props {
  unitId: number
  unitLabel?: string
  onClose: () => void
  onSessionsCreated: () => void
}

type LocationType = 'on-campus' | 'online'
type Campus = 'Gardens Point' | 'Kelvin Grove'
type ClassType = 'Consultation' | 'Workshop' | 'Practical' | 'Tutorial' | 'Lecture'
type ScheduleType = 'entire-semester' | 'mid-semester' | 'specific-dates'
type WeekPattern = 'every' | 'odd' | 'even'

const CLASS_TYPES: ClassType[] = ['Consultation', 'Workshop', 'Practical', 'Tutorial', 'Lecture']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const WEEKDAY_INDEX: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 }

const DEFAULT_START: WheelTime = { hour: '9', minute: '00', period: 'AM' }
const DEFAULT_END: WheelTime = { hour: '10', minute: '00', period: 'AM' }

interface SessionDraft {
  localId: string
  startTime: WheelTime
  endTime: WheelTime
  locationType: LocationType
  campus: Campus
  block: string
  room: string
  classType: ClassType
  scheduleType: ScheduleType
  startDate: string
  endDate: string
  dayOfWeek: string
  specificDates: string[]
  specificDateInput: string
  weekPattern: WeekPattern
}

function makeBlankDraft(): SessionDraft {
  return {
    localId: crypto.randomUUID(),
    startTime: { ...DEFAULT_START },
    endTime: { ...DEFAULT_END },
    locationType: 'on-campus',
    campus: 'Gardens Point',
    block: '',
    room: '',
    classType: 'Tutorial',
    scheduleType: 'entire-semester',
    startDate: '',
    endDate: '',
    dayOfWeek: 'Monday',
    specificDates: [],
    specificDateInput: '',
    weekPattern: 'every',
  }
}

function parseLocalDate(yyyyMmDd: string): Date | null {
  if (!yyyyMmDd) return null
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function formatDateTime(date: Date, wheelTime: WheelTime) {
  const { hour24, minute } = wheelTimeTo24h(wheelTime)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(hour24).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return `${y}-${m}-${d}T${hh}:${mm}:00`
}

// Every real calendar date between start/end (inclusive) that falls on
// the given weekday, filtered by odd/even/every week-of-range pattern.
// Same approach used for the tutor availability date-range generator.
function generateOccurrenceDates(startDate: Date, endDate: Date, weekdayIndex: number, pattern: WeekPattern): Date[] {
  const dates: Date[] = []
  const cursor = new Date(startDate)
  while (cursor.getDay() !== weekdayIndex && cursor <= endDate) {
    cursor.setDate(cursor.getDate() + 1)
  }
  let weekNumber = 1
  while (cursor <= endDate) {
    const keep = pattern === 'every' || (pattern === 'odd' && weekNumber % 2 === 1) || (pattern === 'even' && weekNumber % 2 === 0)
    if (keep) dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 7)
    weekNumber += 1
  }
  return dates
}

function buildLocationString(draft: SessionDraft): string {
  if (draft.locationType === 'online') return 'Online'
  const blockPart = draft.block ? `Block ${draft.block}` : ''
  const roomPart = draft.room ? `Room ${draft.room}` : ''
  const detail = [blockPart, roomPart].filter(Boolean).join(', ')
  return detail ? `${draft.campus} - ${detail}` : draft.campus
}

const MAX_TOTAL_SESSIONS = 150

export default function AddSessionForm({ unitId, unitLabel, onClose, onSessionsCreated }: Props) {
  const [drafts, setDrafts] = useState<SessionDraft[]>([makeBlankDraft()])
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')

  const updateDraft = (localId: string, patch: Partial<SessionDraft>) => {
    setDrafts(prev => prev.map(d => (d.localId === localId ? { ...d, ...patch } : d)))
  }

  const addAnotherSession = () => {
    setDrafts(prev => [...prev, makeBlankDraft()])
  }

  const removeSession = (localId: string) => {
    setDrafts(prev => (prev.length > 1 ? prev.filter(d => d.localId !== localId) : prev))
  }

  const addSpecificDate = (localId: string) => {
    setDrafts(prev => prev.map(d => {
      if (d.localId !== localId || !d.specificDateInput) return d
      if (d.specificDates.includes(d.specificDateInput)) return d
      return { ...d, specificDates: [...d.specificDates, d.specificDateInput].sort(), specificDateInput: '' }
    }))
  }

  const removeSpecificDate = (localId: string, date: string) => {
    setDrafts(prev => prev.map(d => (d.localId === localId ? { ...d, specificDates: d.specificDates.filter(x => x !== date) } : d)))
  }

  // Works out how many real occurrences a single draft will generate,
  // for the live count shown before submitting.
  const countOccurrences = (draft: SessionDraft): number => {
    if (draft.scheduleType === 'specific-dates') return draft.specificDates.length
    const start = parseLocalDate(draft.startDate)
    const end = parseLocalDate(draft.endDate)
    if (!start || !end || end < start) return 0
    return generateOccurrenceDates(start, end, WEEKDAY_INDEX[draft.dayOfWeek], draft.weekPattern).length
  }

  const totalOccurrences = drafts.reduce((sum, d) => sum + countOccurrences(d), 0)

  const handleSubmit = async () => {
    setError('')
    if (totalOccurrences === 0) {
      setError('At least one session needs a valid date range (or specific dates) to create.')
      return
    }
    if (totalOccurrences > MAX_TOTAL_SESSIONS) {
      setError(`That would create ${totalOccurrences} sessions at once — narrow the date range or split into fewer sessions.`)
      return
    }

    setSubmitting(true)
    setProgress({ done: 0, total: totalOccurrences })
    let done = 0

    try {
      for (const draft of drafts) {
        const title = draft.classType
        const location = buildLocationString(draft)

        let occurrenceDates: Date[] = []
        if (draft.scheduleType === 'specific-dates') {
          occurrenceDates = draft.specificDates.map(d => parseLocalDate(d)).filter((d): d is Date => d !== null)
        } else {
          const start = parseLocalDate(draft.startDate)
          const end = parseLocalDate(draft.endDate)
          if (start && end && end >= start) {
            occurrenceDates = generateOccurrenceDates(start, end, WEEKDAY_INDEX[draft.dayOfWeek], draft.weekPattern)
          }
        }

        for (const date of occurrenceDates) {
          const startTime = formatDateTime(date, draft.startTime)
          await api.createSession(unitId, { title, startTime, location })
          done += 1
          setProgress({ done, total: totalOccurrences })
        }
      }

      onSessionsCreated()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Something went wrong creating one of the sessions.')
    } finally {
      setSubmitting(false)
      setProgress(null)
    }
  }

  return (
    <div className="add-session-page">
      <div className="detail-header">
        <button className="back-btn" onClick={() => !submitting && onClose()}>← Back to Manage</button>
        <div className="detail-title">
          <div>
            <h1>Add Session</h1>
            <p>{unitLabel ? `Creating session(s) for ${unitLabel}` : 'Create one or more sessions for this unit'}</p>
          </div>
        </div>
      </div>

      <p className="avail-range-hint add-session-disclosure">
        Note: only the class type, calculated start time, and location are saved per session created —
        end time, duration, and schedule pattern are shown here for planning but aren't stored by the
        backend yet, so they won't be visible again after you refresh.
      </p>

      {drafts.map((draft, index) => {
        const durationMins = wheelTimeDurationMinutes(draft.startTime, draft.endTime)
        const occurrences = countOccurrences(draft)

        return (
          <div key={draft.localId} className="session-draft-block">
            <div className="session-draft-header">
              <h3><span className="session-number-badge">{index + 1}</span>Session {index + 1}</h3>
              {drafts.length > 1 && (
                <button type="button" className="session-edit-btn" onClick={() => removeSession(draft.localId)}>
                  Remove
                </button>
              )}
            </div>

            {/* Time & class type */}
            <div className="form-subsection">
              <div className="form-subsection-title">Time &amp; Type</div>
              <div className="time-wheel-row">
                <TimeWheelPicker
                  label="Start Time"
                  value={draft.startTime}
                  onChange={startTime => updateDraft(draft.localId, { startTime })}
                />
                <TimeWheelPicker
                  label="End Time"
                  value={draft.endTime}
                  onChange={endTime => updateDraft(draft.localId, { endTime })}
                />
                <div className="form-field duration-display">
                  <label>Duration</label>
                  <input type="text" value={formatDurationMinutes(durationMins)} readOnly disabled />
                </div>
              </div>
              <div className="form-field">
                <label>Class Type</label>
                <select
                  value={draft.classType}
                  onChange={e => updateDraft(draft.localId, { classType: e.target.value as ClassType })}
                >
                  {CLASS_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Location */}
            <div className="form-subsection">
              <div className="form-subsection-title">Location</div>
              <div className="form-field">
                <label>Mode</label>
                <select
                  value={draft.locationType}
                  onChange={e => updateDraft(draft.localId, { locationType: e.target.value as LocationType })}
                >
                  <option value="on-campus">🏫 On Campus</option>
                  <option value="online">🌐 Online</option>
                </select>
              </div>

              {draft.locationType === 'on-campus' && (
                <>
                  <div className="form-field" style={{ marginTop: 14 }}>
                    <label>Campus</label>
                    <div className="segmented-row">
                      <button
                        type="button"
                        className={`segmented-btn ${draft.campus === 'Gardens Point' ? 'selected' : ''}`}
                        onClick={() => updateDraft(draft.localId, { campus: 'Gardens Point' })}
                      >
                        Gardens Point
                      </button>
                      <button
                        type="button"
                        className={`segmented-btn ${draft.campus === 'Kelvin Grove' ? 'selected' : ''}`}
                        onClick={() => updateDraft(draft.localId, { campus: 'Kelvin Grove' })}
                      >
                        Kelvin Grove
                      </button>
                    </div>
                  </div>
                  <div className="form-row-2" style={{ marginTop: 14 }}>
                    <div className="form-field">
                      <label>Block</label>
                      <input type="text" placeholder="e.g. P"
                        value={draft.block} onChange={e => updateDraft(draft.localId, { block: e.target.value })} />
                    </div>
                    <div className="form-field">
                      <label>Room</label>
                      <input type="text" placeholder="e.g. P404"
                        value={draft.room} onChange={e => updateDraft(draft.localId, { room: e.target.value })} />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Schedule */}
            <div className="form-subsection">
              <div className="form-subsection-title">Session Schedule</div>
              <div className="schedule-box">
                <div className="segmented-row">
                  <button
                    type="button"
                    className={`segmented-btn ${draft.scheduleType === 'entire-semester' ? 'selected' : ''}`}
                    onClick={() => updateDraft(draft.localId, { scheduleType: 'entire-semester' })}
                  >
                    Entire Semester
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${draft.scheduleType === 'mid-semester' ? 'selected' : ''}`}
                    onClick={() => updateDraft(draft.localId, { scheduleType: 'mid-semester' })}
                  >
                    Mid-Semester Start
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${draft.scheduleType === 'specific-dates' ? 'selected' : ''}`}
                    onClick={() => updateDraft(draft.localId, { scheduleType: 'specific-dates' })}
                  >
                    Specific Date(s)
                  </button>
                </div>

                {(draft.scheduleType === 'entire-semester' || draft.scheduleType === 'mid-semester') && (
                  <>
                    <div className="form-row-3" style={{ marginTop: 16 }}>
                      <div className="form-field">
                        <label>Start Date</label>
                        <input type="date" value={draft.startDate}
                          onChange={e => updateDraft(draft.localId, { startDate: e.target.value })} />
                      </div>
                      <div className="form-field">
                        <label>End Date</label>
                        <input type="date" value={draft.endDate}
                          onChange={e => updateDraft(draft.localId, { endDate: e.target.value })} />
                      </div>
                      <div className="form-field">
                        <label>Day of Week</label>
                        <select value={draft.dayOfWeek} onChange={e => updateDraft(draft.localId, { dayOfWeek: e.target.value })}>
                          {DAYS.map(d => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="form-field" style={{ marginTop: 16 }}>
                      <label>Week Pattern</label>
                      <div className="segmented-row">
                        <button type="button" className={`segmented-btn ${draft.weekPattern === 'every' ? 'selected' : ''}`}
                          onClick={() => updateDraft(draft.localId, { weekPattern: 'every' })}>Every Week</button>
                        <button type="button" className={`segmented-btn ${draft.weekPattern === 'odd' ? 'selected' : ''}`}
                          onClick={() => updateDraft(draft.localId, { weekPattern: 'odd' })}>Odd Weeks</button>
                        <button type="button" className={`segmented-btn ${draft.weekPattern === 'even' ? 'selected' : ''}`}
                          onClick={() => updateDraft(draft.localId, { weekPattern: 'even' })}>Even Weeks</button>
                      </div>
                    </div>
                  </>
                )}

                {draft.scheduleType === 'specific-dates' && (
                  <div className="form-field" style={{ marginTop: 16 }}>
                    <label>Dates</label>
                    <div className="specific-dates-row">
                      <input type="date" value={draft.specificDateInput}
                        onChange={e => updateDraft(draft.localId, { specificDateInput: e.target.value })} />
                      <button type="button" className="cancel-btn" onClick={() => addSpecificDate(draft.localId)}>
                        Add Date
                      </button>
                    </div>
                    {draft.specificDates.length > 0 && (
                      <div className="specific-dates-chips">
                        {draft.specificDates.map(d => (
                          <span key={d} className="specific-date-chip">
                            {d}
                            <button type="button" onClick={() => removeSpecificDate(draft.localId, d)}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="avail-range-hint schedule-occurrence-hint">
                  {occurrences > 0
                    ? `This will create ${occurrences} session${occurrences !== 1 ? 's' : ''}`
                    : 'Select a valid date range or at least one specific date'}
                </p>
              </div>
            </div>
          </div>
        )
      })}

      <button type="button" className="add-btn add-another-session-btn" onClick={addAnotherSession}>
        + Add Another Session
      </button>

      <div className="add-session-footer">
        <p className="avail-range-hint add-session-total">
          Total across all sessions above: <strong>{totalOccurrences}</strong> entr{totalOccurrences !== 1 ? 'ies' : 'y'}
        </p>

        {progress && (
          <p className="avail-range-hint">Creating {progress.done} of {progress.total}...</p>
        )}
        {error && <p className="avail-error-message">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="cancel-btn" disabled={submitting} onClick={onClose}>Cancel</button>
          <button type="button" className="confirm-btn" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Creating...' : 'Create Session(s)'}
          </button>
        </div>
      </div>
    </div>
  )
}
