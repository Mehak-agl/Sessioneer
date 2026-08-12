import { useEffect, useState } from 'react'
import CoordinatorSidebar from '../../components/CooordinatorSidebar'
import { api } from '../../services/api'

interface StaffMember {
  id: number
  fullName: string
  email: string
}

export default function CoordinatorTutors() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAllStaff()
      .then((data: StaffMember[]) => setStaff(data))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = staff.filter(s =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="dashboard-page">
      <CoordinatorSidebar />
      <main className="main-content">
        <header className="topbar">
          <div className="page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Tutors</h1>
              <p>All sessional staff registered in the system</p>
            </div>
          </div>
        </header>

        <div className="detail-section">
          <div className="section-header">
            <div>
              <h2>Staff Directory</h2>
              <p>{staff.length} tutor{staff.length !== 1 ? 's' : ''} registered</p>
            </div>
            <input
              className="tutor-search-input"
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="tutors-loading">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="tutors-empty">
              {search ? 'No tutors match your search.' : 'No tutors registered yet.'}
            </p>
          ) : (
            <div className="tutors-table">
              <div className="tutors-table-header">
                <span>Name</span>
                <span>Email</span>
              </div>
              {filtered.map(s => (
                <div key={s.id} className="tutors-table-row">
                  <div className="tutors-avatar-name">
                    <div className="tutors-avatar">
                      {s.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <span className="tutors-name">{s.fullName}</span>
                  </div>
                  <span className="tutors-email">{s.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
