import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
//import { api } from "../../services/api";
import { coordinatorMockApi as api } from "../../services/coordinatorMockApi";
import MyUnitsView from "./CoordinatorMyUnitsView";
import UnitDetailView from "./CoordinatorUnitDetailView";
import CoordinatorSidebar from "../../components/CooordinatorSidebar";

interface Unit {
  id: number;
  name: string;
  code: string;
  semester: string;
}

type View = 'dashboard' | 'units' | 'unit-detail'

// Availability submission deadline for Semester 2, 2026
const AVAIL_DEADLINE = new Date('2026-09-20')

function getDaysRemaining(): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((AVAIL_DEADLINE.getTime() - today.getTime()) / 86400000)
}

function CoordinatorDashboard() {
  const navigate = useNavigate()
  const [units, setUnits] = useState<Unit[]>([])
  const initialView: View = new URLSearchParams(window.location.search).get('view') === 'units' ? 'units' : 'dashboard'
  const [view, setView] = useState<View>(initialView)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingByUnit, setPendingByUnit] = useState<{ unit: Unit; count: number }[]>([])
  const [showPendingBreakdown, setShowPendingBreakdown] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importRows, setImportRows] = useState<{ name: string; email: string }[]>([])
  const [importStatus, setImportStatus] = useState<{ email: string; result: string }[]>([])
  const [importing, setImporting] = useState(false)
  const [importWorkbook, setImportWorkbook] = useState<any>(null)
  const [exportMenuUnit, setExportMenuUnit] = useState<Unit | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(new Uint8Array(buffer), { type: "array" })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" })
    const parsed = rows
      .map(r => ({
        name: String(r["Name"] || r["name"] || r["Full Name"] || r["fullName"] || "").trim(),
        email: String(r["Email"] || r["email"] || "").trim(),
      }))
      .filter(r => r.email)
    setImportRows(parsed)
    setImportStatus([])
    setImportWorkbook(wb)
  }

  const handleImport = async () => {
    setImporting(true)
    const results: { email: string; result: string }[] = []
    const wb = importWorkbook

    const getSheet = (name: string) =>
      wb ? XLSX.utils.sheet_to_json(wb.Sheets[Object.keys(wb.Sheets).find(k => k.toLowerCase() === name.toLowerCase()) ?? ""] ?? {}, { defval: "" }) : []

    // 1. Tutors
    for (const row of importRows) {
      try {
        await api.signup({ fullName: row.name || row.email, email: row.email, password: "changeme123", role: "STAFF" })
        results.push({ email: row.email, result: "tutor created" })
      } catch {
        results.push({ email: row.email, result: "tutor already exists" })
      }
    }

    // 2. Units
    const unitRows: any[] = getSheet("units")
    for (const r of unitRows) {
      try {
        await api.createUnit({ code: String(r.Code || r.code || "").toUpperCase(), name: String(r.Name || r.name || ""), semester: String(r.Semester || r.semester || "Semester 2, 2026") })
        results.push({ email: `Unit: ${r.Code || r.code}`, result: "created" })
      } catch {
        results.push({ email: `Unit: ${r.Code || r.code}`, result: "already exists or failed" })
      }
    }

    // 3. Fetch current units + staff to resolve IDs
    const allUnits: any[] = await api.getUnits().catch(() => [])
    const allStaff: any[] = await api.getAllStaff().catch(() => [])
    const unitByCode = Object.fromEntries(allUnits.map((u: any) => [u.code.toUpperCase(), u]))
    const staffByEmail = Object.fromEntries(allStaff.map((s: any) => [s.email.toLowerCase(), s]))

    // 4. Sessions
    const sessionRows: any[] = getSheet("sessions")
    for (const r of sessionRows) {
      const unit = unitByCode[String(r.UnitCode || r.unitCode || r["Unit Code"] || "").toUpperCase()]
      if (!unit) { results.push({ email: `Session: ${r.Title || r.title}`, result: "unit not found" }); continue }
      try {
        await api.createSession(unit.id, {
          title: String(r.Title || r.title || ""),
          startTime: String(r.StartTime || r.startTime || r["Start Time"] || ""),
          location: String(r.Location || r.location || "Online"),
        })
        results.push({ email: `Session: ${r.Title || r.title}`, result: "created" })
      } catch {
        results.push({ email: `Session: ${r.Title || r.title}`, result: "failed" })
      }
    }

    // 5. Invitations
    const inviteRows: any[] = getSheet("invitations")
    for (const r of inviteRows) {
      const unit = unitByCode[String(r.UnitCode || r.unitCode || r["Unit Code"] || "").toUpperCase()]
      const staff = staffByEmail[String(r.Email || r.email || "").toLowerCase()]
      if (!unit || !staff) { results.push({ email: `Invite: ${r.Email || r.email}`, result: "unit or tutor not found" }); continue }
      try {
        await api.inviteStaff(unit.id, staff.id)
        results.push({ email: `Invite: ${r.Email || r.email} → ${unit.code}`, result: "invited" })
      } catch {
        results.push({ email: `Invite: ${r.Email || r.email}`, result: "already invited or failed" })
      }
    }

    // 6. Availability
    const availRows: any[] = getSheet("availability")
    for (const r of availRows) {
      const unit = unitByCode[String(r.UnitCode || r.unitCode || r["Unit Code"] || "").toUpperCase()]
      if (!unit) { results.push({ email: `Avail: ${r.Email || r.email}`, result: "unit not found" }); continue }
      try {
        await api.submitAvailability({
          unitId: unit.id,
          startTime: String(r.StartTime || r.startTime || r["Start Time"] || ""),
          endTime: String(r.EndTime || r.endTime || r["End Time"] || ""),
        })
        results.push({ email: `Availability: ${r.Email || r.email} → ${unit.code}`, result: "saved" })
      } catch {
        results.push({ email: `Availability: ${r.Email || r.email}`, result: "failed" })
      }
    }

    setImportStatus(results)
    setImporting(false)
    await loadUnits()
  }

  const handleCloseImport = () => {
    setShowImportModal(false)
    setImportRows([])
    setImportStatus([])
    setImportWorkbook(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const fetchExportData = async (unit: Unit) => {
    const [sessions, invitations, allocations] = await Promise.all([
      api.getSessions(unit.id).catch(() => []),
      api.getUnitInvitations(unit.id).catch(() => []),
      api.getUnitAllocations(unit.id).catch(() => []),
    ])
    return { sessions, invitations, allocations }
  }

  const handleExportExcel = async (unit: Unit) => {
    const { sessions, invitations, allocations } = await fetchExportData(unit)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sessions.map((s: any) => ({
      Title: s.title, 'Start Time': s.startTime, Location: s.location, Status: s.status,
    }))), "Sessions")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invitations.map((inv: any) => ({
      Name: inv.staff?.fullName, Email: inv.staff?.email, Status: inv.status,
    }))), "Tutors")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allocations.map((a: any) => ({
      Tutor: a.staff?.fullName, Email: a.staff?.email, Session: a.session?.title, Time: a.session?.startTime, Status: a.status,
    }))), "Allocations")
    XLSX.writeFile(wb, `${unit.code}_${unit.semester.replaceAll(/[^a-z0-9]/gi, "_")}.xlsx`)
    setExportMenuUnit(null)
  }

  const handleExportCsv = async (unit: Unit) => {
    const { sessions, invitations, allocations } = await fetchExportData(unit)
    const lines = [
      "=== SESSIONS ===",
      "Title,Start Time,Location,Status",
      ...sessions.map((s: any) => `${s.title},${s.startTime},${s.location},${s.status}`),
      "",
      "=== TUTORS ===",
      "Name,Email,Invitation Status",
      ...invitations.map((inv: any) => `${inv.staff?.fullName},${inv.staff?.email},${inv.status}`),
      "",
      "=== ALLOCATIONS ===",
      "Tutor,Email,Session,Time,Status",
      ...allocations.map((a: any) => `${a.staff?.fullName},${a.staff?.email},${a.session?.title},${a.session?.startTime},${a.status}`),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${unit.code}_${unit.semester.replaceAll(/[^a-z0-9]/gi, "_")}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportMenuUnit(null)
  }

  const handleExportPdf = async (unit: Unit) => {
    const { sessions, invitations, allocations } = await fetchExportData(unit)
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`${unit.code} — ${unit.name}`, 14, 16)
    doc.setFontSize(10)
    doc.text(`${unit.semester}`, 14, 23)

    doc.setFontSize(13)
    doc.text("Sessions", 14, 34)
    autoTable(doc, {
      startY: 38,
      head: [["Title", "Start Time", "Location", "Status"]],
      body: sessions.map((s: any) => [s.title, s.startTime, s.location, s.status]),
    })

    const y1 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.text("Invited Tutors", 14, y1)
    autoTable(doc, {
      startY: y1 + 4,
      head: [["Name", "Email", "Status"]],
      body: invitations.map((inv: any) => [inv.staff?.fullName, inv.staff?.email, inv.status]),
    })

    const y2 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.text("Allocations", 14, y2)
    autoTable(doc, {
      startY: y2 + 4,
      head: [["Tutor", "Session", "Time", "Status"]],
      body: allocations.map((a: any) => [a.staff?.fullName, a.session?.title, a.session?.startTime, a.status]),
    })

    doc.save(`${unit.code}_${unit.semester.replaceAll(/[^a-z0-9]/gi, "_")}.pdf`)
    setExportMenuUnit(null)
  }

  const loadUnits = async () => {
    const fetchedUnits = await api.getUnits().catch(() => [])
    setUnits(fetchedUnits)
    let pending = 0
    const byUnit: { unit: Unit; count: number }[] = []
    for (const unit of fetchedUnits) {
      const invitations = await api.getUnitInvitations(unit.id).catch(() => [])
      const count = invitations.filter((inv: any) => inv.status === 'PENDING').length
      pending += count
      if (count > 0) byUnit.push({ unit, count })
    }
    setPendingCount(pending)
    setPendingByUnit(byUnit)
  }

  useEffect(() => {
    loadUnits()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("sessioneer_token");
    localStorage.removeItem("sessioneer_role");
    localStorage.removeItem("sessioneer_name");
    navigate("/");
  };

  const handleSelectUnit = (unitId: number) => {
    const unit = units.find(u => u.id === unitId)
    if (unit) {
      setSelectedUnit(unit)
      setView('unit-detail')
    }
  }

  // There's no backend DELETE endpoint for units yet — this only removes
  // the unit from local state (what's currently shown). It's still in the
  // real database and will reappear next time loadUnits() runs (e.g. on
  // next visit to this page), until a real delete endpoint exists.
  const handleUnitDeleted = (unitId: number) => {
    setUnits(prev => prev.filter(u => u.id !== unitId))
  }

  return (
    <div className="dashboard-page">
      <CoordinatorSidebar />

      <main className="main-content">
        {view === 'dashboard' && (
          <>
            <header className="topbar">
              <div className="page-title">
                <img src="/icons.svg" alt="Page logo" />
                <div>
                  <h1>Coordinator Dashboard</h1>
                  <p>Manage tutors, units, schedules and allocations</p>
                </div>
              </div>
              <div style={{display:'flex', gap:'12px'}}>
                <button className="new-unit-btn" onClick={() => setShowImportModal(true)}>↑ Import Tutors</button>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
              </div>
            </header>

            <section className="stats-grid">
              <div className="stat-card">
                <span>Active Units</span>
                <h2>{units.length}</h2>
                <p>Currently running</p>
              </div>
              <div
                className={`stat-card stat-card--clickable${showPendingBreakdown ? ' active' : ''}`}
                onClick={() => setShowPendingBreakdown(p => !p)}
              >
                <span>Pending Responses</span>
                <h2>{pendingCount}</h2>
                <p>Awaiting tutor replies {pendingCount > 0 ? '— click to view' : ''}</p>
              </div>
              <div className={`stat-card${getDaysRemaining() <= 3 ? ' warning' : ''}`}>
                <span>Availability Deadline</span>
                <h2>
                  {getDaysRemaining() > 0
                    ? `${getDaysRemaining()}d`
                    : getDaysRemaining() === 0
                    ? 'Today'
                    : 'Closed'}
                </h2>
                <p>
                  {getDaysRemaining() > 0
                    ? 'Days left to submit'
                    : getDaysRemaining() === 0
                    ? 'Deadline is today'
                    : 'Submission closed'}
                </p>
              </div>
              <div className="stat-card success">
                <span>Finalised</span>
                <h2>0</h2>
                <p>Completed allocation</p>
              </div>
            </section>

            {showPendingBreakdown && (
              <section className="pending-breakdown">
                <div className="pending-breakdown-header">
                  <h3>Pending Responses by Unit</h3>
                  <span className="pending-breakdown-deadline">
                    {getDaysRemaining() > 0 ? `${getDaysRemaining()} days left` : getDaysRemaining() === 0 ? 'Due today' : 'Deadline passed'}
                  </span>
                </div>
                {pendingByUnit.length === 0 ? (
                  <p className="pending-breakdown-empty">No pending responses.</p>
                ) : (
                  pendingByUnit.map(({ unit, count }) => (
                    <div key={unit.id} className="pending-breakdown-row">
                      <div className="pending-breakdown-unit">
                        <span className="unit-code-badge">{unit.code}</span>
                        <span className="pending-breakdown-name">{unit.name}</span>
                      </div>
                      <div className="pending-breakdown-meta">
                        <span className="pending-breakdown-count">{count} pending</span>
                        <span className="pending-breakdown-days">
                          {getDaysRemaining() > 0 ? `${getDaysRemaining()}d remaining` : 'Overdue'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </section>
            )}

            <section className="units-panel">
              <div className="panel-heading">
                <div>
                  <h2>My Units</h2>
                  <p>Semester 2, 2026</p>
                </div>
                <span>{units.length} units</span>
              </div>

              {units.length === 0 && <p style={{padding:'1rem'}}>No units yet. Create one to get started.</p>}

              {units.map(unit => (
                <div className="unit-card" key={unit.id}>
                  <div>
                    <h3>{unit.code} — {unit.name}</h3>
                    <p>{unit.semester}</p>
                  </div>
                  <div className="unit-actions">
                    <button onClick={() => handleSelectUnit(unit.id)}>Manage</button>
                    <Link to="/calendar"><button>Schedule</button></Link>
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setExportMenuUnit(exportMenuUnit?.id === unit.id ? null : unit)}>↓ Export</button>
                      {exportMenuUnit?.id === unit.id && (
                        <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '140px' }}>
                          <button onClick={() => handleExportExcel(unit)} style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem' }}>Excel (.xlsx)</button>
                          <button onClick={() => handleExportCsv(unit)} style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem' }}>CSV (.csv)</button>
                          <button onClick={() => handleExportPdf(unit)} style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem' }}>PDF (.pdf)</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <Link to="/calendar">
              <button className="calendar-btn">Open Calendar</button>
            </Link>

            {showImportModal && (
              <div className="modal-overlay" onClick={handleCloseImport}>
                <div className="modal" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
                  <h2>Import Tutors</h2>
                  <p className="modal-sub">Upload an <strong>.xlsx</strong> or <strong>.csv</strong> file with <strong>Name</strong> and <strong>Email</strong> columns. Accounts are saved to the database automatically.</p>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} style={{ margin: '12px 0', display: 'block' }} />

                  {importRows.length > 0 && importStatus.length === 0 && (
                    <>
                      <p style={{ fontWeight: 600, marginBottom: '8px' }}>{importRows.length} tutor(s) found:</p>
                      <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '12px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                          <thead><tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Name</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Email</th>
                          </tr></thead>
                          <tbody>
                            {importRows.map((r, i) => (
                              <tr key={i} style={{ borderTop: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px 12px' }}>{r.name || '—'}</td>
                                <td style={{ padding: '8px 12px' }}>{r.email}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {importStatus.length > 0 && (
                    <>
                      <p style={{ fontWeight: 600, marginBottom: '8px' }}>Done:</p>
                      <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '12px' }}>
                        {importStatus.map((s, i) => (
                          <div key={i} style={{ padding: '4px 0', fontSize: '0.875rem', color: s.result === 'created' ? '#16a34a' : '#6b7280' }}>
                            {s.result === 'created' ? '✓' : '—'} {s.email} — {s.result}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="modal-actions">
                    <button className="cancel-btn" onClick={handleCloseImport}>{importStatus.length > 0 ? 'Close' : 'Cancel'}</button>
                    {importRows.length > 0 && importStatus.length === 0 && (
                      <button className="confirm-btn" onClick={handleImport} disabled={importing}>
                        {importing ? 'Saving to database...' : `Import ${importRows.length} Tutor(s)`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {view === 'units' && (
          <MyUnitsView
            units={units}
            onUnitCreated={loadUnits}
            onSelectUnit={handleSelectUnit}
            onUnitDeleted={handleUnitDeleted}
          />
        )}

        {view === 'unit-detail' && selectedUnit && (
          <UnitDetailView
            unit={selectedUnit}
            onBack={() => setView('units')}
          />
        )}
      </main>
    </div>
  )
}

export default CoordinatorDashboard
