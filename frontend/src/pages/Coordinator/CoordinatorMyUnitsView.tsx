import { useMemo, useState } from 'react'
import { api } from "../../services/api";
interface Unit {
  id: number;
  code: string;
  name: string;
  semester: string;
}

const SEMESTERS = [
  'Semester 1, 2026',
  'Semester 2, 2026',
  'Semester 1, 2027',
]

const SEMESTER_NUMBERS = ['1', '2']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2].map(String)

type Props = {
  units: Unit[]
  onUnitCreated: () => void
  onSelectUnit: (unitId: number) => void
  // There's no backend DELETE endpoint for units — this only removes the
  // unit from the list you're currently looking at. It's still sitting
  // in the real database, so it'll come back on a refresh or next visit
  // until a real delete endpoint exists.
  onUnitDeleted: (unitId: number) => void
}

// Pulls "1" and "2026" out of a stored "Semester 1, 2026" string, so the
// Edit Semester form can be pre-filled with the unit's current values.
function parseSemester(semester: string): { semNum: string; year: string } {
  const match = semester.match(/Semester\s*(\d+)\s*,\s*(\d{4})/i)
  if (match) return { semNum: match[1], year: match[2] }
  return { semNum: '2', year: String(CURRENT_YEAR) }
}

// Descending by year, then descending by semester number within that
// year, then alphabetically ascending by unit code within the same
// year+semester. e.g. 2027 Sem 2 → 2027 Sem 1 → 2026 Sem 2 → 2026 Sem 1,
// and within each group: CAB203, IAB201, IAB202...
function sortUnits(units: Unit[]): Unit[] {
  return [...units].sort((a, b) => {
    const pa = parseSemester(a.semester)
    const pb = parseSemester(b.semester)
    const yearDiff = Number(pb.year) - Number(pa.year)
    if (yearDiff !== 0) return yearDiff
    const semDiff = Number(pb.semNum) - Number(pa.semNum)
    if (semDiff !== 0) return semDiff
    return a.code.localeCompare(b.code)
  })
}

// Groups an already-sorted list into consecutive year buckets, so the
// list can be rendered with a heading per year. Relies on sortUnits()
// already having put same-year units next to each other.
function groupUnitsByYear(sorted: Unit[]): { year: string; units: Unit[] }[] {
  const groups: { year: string; units: Unit[] }[] = []
  for (const unit of sorted) {
    const { year } = parseSemester(unit.semester)
    const last = groups[groups.length - 1]
    if (last && last.year === year) {
      last.units.push(unit)
    } else {
      groups.push({ year, units: [unit] })
    }
  }
  return groups
}

export default function MyUnitsView({ units, onUnitCreated, onSelectUnit, onUnitDeleted }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [semester, setSemester] = useState(SEMESTERS[1])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [openMenuUnitId, setOpenMenuUnitId] = useState<number | null>(null)

  // ── Filters: subject (unit code), year, semester ─────────────────────
  // 'all' means "don't filter on this field". Options are derived from
  // whatever units are actually in the list, so there's never a filter
  // choice that would show zero results.
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterYear, setFilterYear] = useState('all')
  const [filterSemester, setFilterSemester] = useState('all')

  const filterOptions = useMemo(() => {
    const subjects = new Set<string>()
    const years = new Set<string>()
    const semesters = new Set<string>()
    for (const unit of units) {
      subjects.add(unit.code)
      const { semNum, year } = parseSemester(unit.semester)
      years.add(year)
      semesters.add(semNum)
    }
    return {
      subjects: Array.from(subjects).sort(),
      years: Array.from(years).sort((a, b) => Number(b) - Number(a)),
      semesters: Array.from(semesters).sort(),
    }
  }, [units])

  const filteredUnits = useMemo(() => {
    return units.filter(unit => {
      if (filterSubject !== 'all' && unit.code !== filterSubject) return false
      const { semNum, year } = parseSemester(unit.semester)
      if (filterYear !== 'all' && year !== filterYear) return false
      if (filterSemester !== 'all' && semNum !== filterSemester) return false
      return true
    })
  }, [units, filterSubject, filterYear, filterSemester])

  const filtersActive = filterSubject !== 'all' || filterYear !== 'all' || filterSemester !== 'all'

  const clearFilters = () => {
    setFilterSubject('all')
    setFilterYear('all')
    setFilterSemester('all')
  }

  // ── Edit Semester / Year → clones into a NEW unit ────────────────────
  // Per the brief: changing semester or year must never modify or delete
  // the original unit. This creates a brand new unit (same code + name)
  // for the new semester/year, then copies across the original's invited
  // tutors and sessions using the existing invite/create-session
  // endpoints one at a time. The original unit is never touched.
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [editSemNum, setEditSemNum] = useState('2')
  const [editYear, setEditYear] = useState(String(CURRENT_YEAR))
  const [cloning, setCloning] = useState(false)
  const [cloneError, setCloneError] = useState('')
  const [cloneStatus, setCloneStatus] = useState('')

  const openEditSemester = (unit: Unit) => {
    const { semNum, year } = parseSemester(unit.semester)
    setEditingUnit(unit)
    setEditSemNum(semNum)
    setEditYear(year)
    setCloneError('')
    setCloneStatus('')
    setOpenMenuUnitId(null)
  }

  const handleDeleteUnit = (unit: Unit) => {
    const ok = window.confirm(
      `Delete ${unit.code} — ${unit.name}?\n\n` +
      `There's no backend delete endpoint yet, so this only removes it from this screen — ` +
      `it's still in the database and will come back if you refresh or navigate away and back.`
    )
    setOpenMenuUnitId(null)
    if (!ok) return
    onUnitDeleted(unit.id)
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.createUnit({ code: code.toUpperCase(), name, semester })
      setCode('')
      setName('')
      setSemester(SEMESTERS[1])
      setShowForm(false)
      onUnitCreated()
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Something went wrong creating the unit. Check that you are logged in and the backend is running.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloneForNewSemester = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingUnit) return
    setCloneError('')

    const newSemesterString = `Semester ${editSemNum}, ${editYear}`
    const { semNum: origSemNum, year: origYear } = parseSemester(editingUnit.semester)

    if (editSemNum === origSemNum && editYear === origYear) {
      setCloneError("That's the same semester and year this unit already has — change one of them to create a new unit.")
      return
    }

    setCloning(true)
    try {
      setCloneStatus('Creating new unit...')
      const newUnit = await api.createUnit({
        code: editingUnit.code,
        name: editingUnit.name,
        semester: newSemesterString,
      })

      setCloneStatus('Copying invited tutors...')
      const oldInvitations = await api.getUnitInvitations(editingUnit.id).catch(() => [])
      for (const inv of oldInvitations) {
        if (!inv?.staff?.id) continue
        await api.inviteStaff(newUnit.id, inv.staff.id).catch(() => {})
      }

      setCloneStatus('Copying sessions...')
      const oldSessions = await api.getSessions(editingUnit.id).catch(() => [])
      for (const session of oldSessions) {
        await api.createSession(newUnit.id, {
          title: session.title,
          startTime: session.startTime,
          location: session.location,
        }).catch(() => {})
      }

      onUnitCreated()
      setEditingUnit(null)
      setCloneStatus('')
    } catch (err: any) {
      console.error(err)
      setCloneError(err?.message || 'Something went wrong creating the new unit.')
      setCloneStatus('')
    } finally {
      setCloning(false)
    }
  }

  return (
    <div className="my-units">
      <div className="my-units-header">
        <div>
          <h1>My Units</h1>
          <p>
            {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''}
            {filtersActive ? ` of ${units.length}` : ' this semester'}
          </p>
        </div>
        <button className="create-btn" onClick={() => setShowForm(true)}>+ Create Unit</button>
      </div>

      <div className="units-filter-bar">
        <div className="form-field">
          <label>Subject</label>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
            <option value="all">All subjects</option>
            {filterOptions.subjects.map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Year</label>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="all">All years</option>
            {filterOptions.years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Semester</label>
          <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
            <option value="all">All semesters</option>
            {filterOptions.semesters.map(sem => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>
        {filtersActive && (
          <button type="button" className="clear-filters-btn" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Unit</h2>
            <form onSubmit={handleCreate} className="unit-form">
              <div className="unit-form-row">
                <div className="form-field">
                  <label>Unit Code</label>
                  <input type="text" placeholder="e.g. CAB302"
                    value={code} onChange={e => setCode(e.target.value)} required />
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
                <input type="text" placeholder="e.g. Software Development"
                  value={name} onChange={e => setName(e.target.value)} required />
              </div>

              {error && <p className="avail-error-message">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="confirm-btn" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Semester / Year — creates a new unit, copies tutors + sessions */}
      {editingUnit && (
        <div className="modal-overlay" onClick={() => !cloning && setEditingUnit(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Semester & Year</h2>
            <p className="modal-sub">
              Changing the semester or year for <strong>{editingUnit.code}</strong> creates a new unit for
              that semester — the original ({editingUnit.semester}) stays exactly as it is. Invited tutors
              and sessions are copied across automatically.
            </p>
            <form onSubmit={handleCloneForNewSemester} className="unit-form">
              <div className="unit-form-row">
                <div className="form-field">
                  <label>Semester</label>
                  <select value={editSemNum} onChange={e => setEditSemNum(e.target.value)}>
                    {SEMESTER_NUMBERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Year</label>
                  <select value={editYear} onChange={e => setEditYear(e.target.value)}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {cloneStatus && <p className="avail-range-hint">{cloneStatus}</p>}
              {cloneError && <p className="avail-error-message">{cloneError}</p>}

              <div className="modal-actions">
                <button type="button" className="cancel-btn" disabled={cloning} onClick={() => setEditingUnit(null)}>Cancel</button>
                <button type="submit" className="confirm-btn" disabled={cloning}>
                  {cloning ? 'Creating new unit...' : 'Create New Unit for This Semester'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="units-list">
        {units.length === 0 && (
          <div className="empty-state">
            <p>No units yet. Click <strong>Create Unit</strong> to get started.</p>
          </div>
        )}

        {units.length > 0 && filteredUnits.length === 0 && (
          <div className="empty-state">
            <p>No units match your filters. <button type="button" className="link-btn" onClick={clearFilters}>Clear filters</button> to see everything.</p>
          </div>
        )}

        {groupUnitsByYear(sortUnits(units)).map(group => (
          <div key={group.year} className="year-group-section">
            <h2 className="year-group-heading">{group.year}</h2>
            {group.units.map(unit => (
              <div key={unit.id} className="unit-row">
                <div className="unit-row-left">
                  <div className="unit-code-badge">{unit.code}</div>
                  <div className="unit-row-info">
                    <h3>{unit.name}</h3>
                    <span className="unit-meta">{unit.semester}</span>
                  </div>
                </div>
                <div className="unit-row-actions">
                  <button className="manage-btn" onClick={() => onSelectUnit(unit.id)}>Manage →</button>
                  <div className="unit-menu-wrapper">
                    <button
                      className="unit-menu-btn"
                      onClick={() => setOpenMenuUnitId(openMenuUnitId === unit.id ? null : unit.id)}
                      title="More options"
                    >
                      ⋮
                    </button>
                    {openMenuUnitId === unit.id && (
                      <div className="unit-menu-dropdown">
                        <button onClick={() => openEditSemester(unit)}>Edit Semester</button>
                        <button className="unit-menu-danger" onClick={() => handleDeleteUnit(unit)}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
