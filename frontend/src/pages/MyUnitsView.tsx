import { useState } from 'react'
import type { Unit } from '../types'
import './MyUnitsView.css'

type Props = {
  units: Unit[]
  onCreateUnit: (unit: Unit) => void
  onSelectUnit: (unitId: string) => void
}

const SEMESTERS = [
  'Semester 1, 2026',
  'Semester 2, 2026',
  'Semester 1, 2027',
]

export default function MyUnitsView({ units, onCreateUnit, onSelectUnit }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [semester, setSemester] = useState(SEMESTERS[1])

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newUnit: Unit = {
      id: `u${Date.now()}`,
      code: code.toUpperCase(),
      name,
      semester,
      sessions: [],
      invitedTutors: [],
    }
    onCreateUnit(newUnit)
    setCode('')
    setName('')
    setSemester(SEMESTERS[1])
    setShowForm(false)
  }

  return (
    <div className="my-units">
      <div className="my-units-header">
        <div>
          <h1>My Units</h1>
          <p>{units.length} unit{units.length !== 1 ? 's' : ''} this semester</p>
        </div>
        <button className="create-btn" onClick={() => setShowForm(true)}>+ Create Unit</button>
      </div>

      {/* Create unit modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Unit</h2>
            <form onSubmit={handleCreate} className="unit-form">
              <div className="unit-form-row">
                <div className="form-field">
                  <label>Unit Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CAB302"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Semester</label>
                  <select value={semester} onChange={e => setSemester(e.target.value)}>
                    {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label>Unit Name</label>
                <input
                  type="text"
                  placeholder="e.g. Software Development"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="confirm-btn">Create Unit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Units list */}
      <div className="units-list">
        {units.length === 0 && (
          <div className="empty-state">
            <p>No units yet. Click <strong>Create Unit</strong> to get started.</p>
          </div>
        )}
        {units.map(unit => {
          const responded = unit.invitedTutors.filter(t => t.status === 'responded').length
          const pending = unit.invitedTutors.filter(t => t.status === 'pending').length
          const hasSetup = unit.sessions.length > 0

          return (
            <div key={unit.id} className="unit-row">
              <div className="unit-row-left">
                <div className="unit-code-badge">{unit.code}</div>
                <div className="unit-row-info">
                  <h3>{unit.name}</h3>
                  <span className="unit-meta">{unit.semester}</span>
                </div>
              </div>

              <div className="unit-row-stats">
                <div className="unit-stat">
                  <span className="stat-num">{unit.sessions.length}</span>
                  <span className="stat-label">Sessions</span>
                </div>
                <div className="unit-stat">
                  <span className="stat-num">{unit.invitedTutors.length}</span>
                  <span className="stat-label">Invited</span>
                </div>
                <div className="unit-stat">
                  <span className="stat-num responded">{responded}</span>
                  <span className="stat-label">Responded</span>
                </div>
                {pending > 0 && (
                  <div className="unit-stat">
                    <span className="stat-num pending">{pending}</span>
                    <span className="stat-label">Pending</span>
                  </div>
                )}
              </div>

              <div className="unit-row-actions">
                {!hasSetup && (
                  <span className="setup-badge">Setup needed</span>
                )}
                <button className="manage-btn" onClick={() => onSelectUnit(unit.id)}>
                  Manage →
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
