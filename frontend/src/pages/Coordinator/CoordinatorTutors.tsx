import { useState } from 'react'
import CoordinatorSidebar from '../../components/CooordinatorSidebar'
import { api } from '../../services/api'

interface CreatedTutor {
  id: number
  fullName: string
  email: string
  createdAt: string
}

interface CreatedCreds {
  name: string
  email: string
  password: string
}

const STORAGE_KEY = 'sessioneer_created_tutors'

function loadTutors(): CreatedTutor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTutors(tutors: CreatedTutor[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tutors))
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CoordinatorTutors() {
  const [tutors, setTutors] = useState<CreatedTutor[]>(loadTutors)
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [modalError, setModalError] = useState('')
  const [createdCreds, setCreatedCreds] = useState<CreatedCreds | null>(null)

  const openModal = () => {
    setNewName('')
    setNewEmail('')
    setModalError('')
    setCreatedCreds(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setCreatedCreds(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setCreating(true)
    const password = generatePassword()
    try {
      await api.signup({ fullName: newName, email: newEmail, password, role: 'staff' })
      const newTutor: CreatedTutor = {
        id: Date.now(),
        fullName: newName,
        email: newEmail,
        createdAt: new Date().toISOString(),
      }
      const updated = [...tutors, newTutor]
      setTutors(updated)
      saveTutors(updated)
      setCreatedCreds({ name: newName, email: newEmail, password })
    } catch {
      setModalError('Failed to create account. Email may already be registered.')
    } finally {
      setCreating(false)
    }
  }

  const filtered = tutors.filter(t =>
    t.fullName.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
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
              <p>Manage tutor accounts for your units</p>
            </div>
          </div>
        </header>

        <div className="detail-section">
          <div className="section-header">
            <div>
              <h2>Created Accounts</h2>
              <p>{tutors.length} tutor{tutors.length !== 1 ? 's' : ''} registered</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {tutors.length > 0 && (
                <input
                  className="tutor-search-input"
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              )}
              <button className="add-btn" onClick={openModal}>+ Create Account</button>
            </div>
          </div>

          {tutors.length === 0 ? (
            <div className="tutors-empty-state">
              <p className="tutors-empty-icon">👤</p>
              <h3>No tutor accounts yet</h3>
              <p>Click "Create Account" to generate credentials for a tutor and send them their login details.</p>
              <button className="add-btn" onClick={openModal}>+ Create Account</button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="tutors-empty">No tutors match your search.</p>
          ) : (
            <div className="tutors-table">
              <div className="tutors-table-header tutors-table-header--4col">
                <span>Name</span>
                <span>Email</span>
                <span>Account Created</span>
              </div>
              {filtered.map(t => (
                <div key={t.id} className="tutors-table-row tutors-table-row--4col">
                  <div className="tutors-avatar-name">
                    <div className="tutors-avatar">
                      {t.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <span className="tutors-name">{t.fullName}</span>
                  </div>
                  <span className="tutors-email">{t.email}</span>
                  <span className="tutors-date">{formatDate(t.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {createdCreds ? (
              <>
                <div className="create-tutor-success-icon">✓</div>
                <h2>Account Created</h2>
                <p className="create-tutor-success-msg">
                  Login credentials have been sent to <strong>{createdCreds.email}</strong> via Sessioneer.
                </p>
                <div className="create-tutor-creds">
                  <div className="create-tutor-cred-row">
                    <span className="create-tutor-cred-label">Name</span>
                    <span className="create-tutor-cred-value">{createdCreds.name}</span>
                  </div>
                  <div className="create-tutor-cred-row">
                    <span className="create-tutor-cred-label">Email</span>
                    <span className="create-tutor-cred-value">{createdCreds.email}</span>
                  </div>
                  <div className="create-tutor-cred-row">
                    <span className="create-tutor-cred-label">Password</span>
                    <span className="create-tutor-cred-value create-tutor-cred-password">{createdCreds.password}</span>
                  </div>
                </div>
                <p className="create-tutor-note">The tutor can change their password after first login.</p>
                <div className="modal-actions">
                  <button className="add-btn" onClick={openModal}>Create Another</button>
                  <button className="cancel-btn" onClick={closeModal}>Done</button>
                </div>
              </>
            ) : (
              <>
                <h2>Create Tutor Account</h2>
                <p className="modal-sub">Enter the tutor's details. A password will be auto-generated and emailed to them.</p>
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-field">
                    <label>Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Thompson"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>University Email</label>
                    <input
                      type="email"
                      placeholder="e.g. a.thompson@qut.edu.au"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      required
                    />
                  </div>
                  {modalError && <p className="signup-error">{modalError}</p>}
                  <div className="modal-actions">
                    <button type="button" className="cancel-btn" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="add-btn" disabled={creating}>
                      {creating ? 'Creating...' : 'Create & Send Email'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
