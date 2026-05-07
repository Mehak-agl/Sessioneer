import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import type { Unit } from '../types'
import { INITIAL_UNITS } from '../data/dummyData'
import MyUnitsView from './MyUnitsView'
import UnitDetailView from './UnitDetailView'
import './CoordinatorDashboard.css'

type Tab = 'Dashboard' | 'My Units' | 'Schedule' | 'Tutors' | 'Allocations' | 'Contracts' | 'Reports' | 'Chat'

export default function CoordinatorDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard')
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)

  const fullName = localStorage.getItem('sessioneer_name') || 'Coordinator'
  const initials = fullName.split(' ').map((n: string) => n[0]).join('')

  useEffect(() => {
    api.getUnits()
      .then((data: Unit[]) => { if (data?.length) setUnits(data) })
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('sessioneer_token')
    localStorage.removeItem('sessioneer_role')
    localStorage.removeItem('sessioneer_name')
    navigate('/')
  }

  const handleCreateUnit = (unit: Unit) => {
    setUnits(prev => [...prev, unit])
  }

  const handleUpdateUnit = (updated: Unit) => {
    setUnits(prev => prev.map(u => u.id === updated.id ? updated : u))
  }

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnitId(unitId)
  }

  const handleBackToUnits = () => {
    setSelectedUnitId(null)
  }

  const selectedUnit = units.find(u => u.id === selectedUnitId)

  const renderContent = () => {
    if (activeTab === 'My Units') {
      if (selectedUnit) {
        return (
          <UnitDetailView
            unit={selectedUnit}
            onBack={handleBackToUnits}
            onUpdateUnit={handleUpdateUnit}
          />
        )
      }
      return (
        <MyUnitsView
          units={units}
          onCreateUnit={handleCreateUnit}
          onSelectUnit={handleSelectUnit}
        />
      )
    }

    return (
      <>
        <header className="topbar">
          <div className="page-title">
            <img src="/sessioneer-logo.png" alt="Page logo" />
            <div>
              <h1>Coordinator Dashboard</h1>
              <p>Manage tutors, units, schedules and allocations</p>
            </div>
          </div>
          <button className="new-unit-btn" onClick={() => setActiveTab('My Units')}>+ New Unit</button>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <span>Active Units</span>
            <h2>{units.filter(u => u.sessions.length > 0).length}</h2>
            <p>Currently running</p>
          </div>
          <div className="stat-card">
            <span>Pending Responses</span>
            <h2>{units.flatMap(u => u.invitedTutors).filter(t => t.status === 'pending').length}</h2>
            <p>Awaiting tutor replies</p>
          </div>
          <div className="stat-card warning">
            <span>Conflicts</span>
            <h2>0</h2>
            <p>Need attention</p>
          </div>
          <div className="stat-card success">
            <span>Finalised</span>
            <h2>0</h2>
            <p>Completed allocation</p>
          </div>
        </section>

        <section className="units-panel">
          <div className="panel-heading">
            <div>
              <h2>My Units</h2>
              <p>Semester 2, 2026</p>
            </div>
            <span>{units.length} units</span>
          </div>

          {units.length === 0 && <p>No units yet. Create one to get started.</p>}

          {units.map(unit => (
            <div key={unit.id} className="unit-card">
              <div>
                <h3>{unit.code} {unit.name}</h3>
                <p>
                  {unit.sessions.length} sessions · {unit.invitedTutors.length} tutors invited ·{' '}
                  {unit.invitedTutors.filter(t => t.status === 'responded').length}/{unit.invitedTutors.length} responded
                </p>
              </div>
              <div className="unit-actions">
                <button onClick={() => { setActiveTab('My Units'); handleSelectUnit(unit.id) }}>Schedule</button>
                <button onClick={() => { setActiveTab('My Units'); handleSelectUnit(unit.id) }}>Allocations</button>
                <button onClick={() => { setActiveTab('My Units'); handleSelectUnit(unit.id) }}>Export</button>
              </div>
            </div>
          ))}
        </section>
        <Link to="/calendar">
          <button className="calendar-btn">Open Calendar</button>
        </Link>
      </>
    )
  }

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/sessioneer-logo.png" alt="Sessioneer logo" />
          <div>
            <h2>SESSIONEER</h2>
            <p>Scheduling System</p>
          </div>
        </div>

        <div className="profile">
          <div className="profile-avatar">{initials}</div>
          <div>
            <h3>{fullName}</h3>
            <p>Coordinator</p>
          </div>
        </div>

        <nav className="menu">
          {(['Dashboard', 'My Units', 'Schedule', 'Tutors', 'Allocations', 'Contracts', 'Reports', 'Chat'] as Tab[]).map(tab => (
            <p
              key={tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => { setActiveTab(tab); setSelectedUnitId(null) }}
            >
              {tab}
            </p>
          ))}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  )
}
