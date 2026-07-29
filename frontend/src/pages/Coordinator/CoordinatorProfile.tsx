import { useEffect, useRef, useState } from 'react'
import CoordinatorSidebar from '../../components/CoordinatorSidebar'



type Theme = 'light' | 'dark'

const PHOTO_STORAGE_KEY = 'sessioneer_photo'
const THEME_STORAGE_KEY = 'sessioneer_theme'

function applyTheme(theme: Theme) {
  document.body.classList.toggle('dark-theme', theme === 'dark')
}

export default function CoordinatorProfile() {
  const fullName = localStorage.getItem('sessioneer_name') || 'Coordinator'
  const initials = fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase()

  const [photo, setPhoto] = useState<string | null>(() => localStorage.getItem(PHOTO_STORAGE_KEY))
  const [resumeName, setResumeName] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || 'light')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordMessageType, setPasswordMessageType] = useState<'success' | 'error'>('success')

  const photoInputRef = useRef<HTMLInputElement>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPhoto(dataUrl)
      // Persisted to localStorage so it survives a refresh — this is safe
      // since it never leaves the browser, but note it's per-browser only
      // (won't follow the account to another device without a real
      // backend to store it against the user's profile).
      localStorage.setItem(PHOTO_STORAGE_KEY, dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Only the file name is kept — there's no backend endpoint to actually
    // upload/store the resume file yet, and browsers can't persist raw
    // file contents across a refresh without one. This resets on reload.
    setResumeName(file.name)
  }

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(THEME_STORAGE_KEY, next)
      return next
    })
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage('Fill in all three fields.')
      setPasswordMessageType('error')
      return
    }
    if (newPassword.length < 6) {
      setPasswordMessage('New password must be at least 6 characters.')
      setPasswordMessageType('error')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('New password and confirmation do not match.')
      setPasswordMessageType('error')
      return
    }

    // NOTE: there is no backend endpoint for changing a password yet
    // (AuthController only has /signup and /login). This is a fully
    // working form with real validation, but the submit below is a
    // placeholder — nothing is actually sent anywhere until that
    // endpoint exists.
    setPasswordMessage('Password change form is ready, but not yet connected to a backend endpoint.')
    setPasswordMessageType('error')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="dashboard-page">
      <CoordinatorSidebar />

      <main className="main-content">
        <header className="topbar">
          <div className="page-title">
            <img src="/logo.png" alt="Page logo" />
            <div>
              <h1>Profile</h1>
              <p>Manage your profile, resume, and account settings</p>
            </div>
          </div>
        </header>

        <section className="profile-card-section">
          <div className="profile-photo-wrapper">
            {photo ? (
              <img src={photo} alt={fullName} className="profile-photo-circle" />
            ) : (
              <div className="profile-photo-circle profile-photo-placeholder">{initials}</div>
            )}
            <button className="profile-photo-edit-btn" onClick={() => photoInputRef.current?.click()}>
              Change photo
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </div>

          <h2 className="profile-name">{fullName}</h2>
          <span className="profile-position-badge">Coordinator</span>
        </section>

        <section className="detail-section">
          <div className="section-header">
            <div>
              <h2>Resume</h2>
              <p>Upload or update your resume</p>
            </div>
          </div>

          <div className="resume-row">
            <span className="resume-filename">
              {resumeName ? resumeName : 'No resume uploaded yet'}
            </span>
            <button className="add-btn" onClick={() => resumeInputRef.current?.click()}>
              {resumeName ? 'Replace resume' : 'Upload resume'}
            </button>
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleResumeChange}
            />
          </div>
        </section>

        <section className="detail-section">
          <div className="section-header">
            <div>
              <h2>Settings</h2>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <h3 className="settings-row-title">Appearance</h3>
              <p className="settings-row-sub">Switch between light and dark theme.</p>
            </div>
            <button className="theme-toggle-btn" onClick={toggleTheme}>
              {theme === 'light' ? '🌙 Switch to Dark' : '☀️ Switch to Light'}
            </button>
          </div>

          <div className="settings-divider" />

          <div>
            <h3 className="settings-row-title">Change Password</h3>
            <p className="settings-row-sub">Update the password for your account.</p>
            <form className="detail-form password-form" onSubmit={handleChangePassword}>
              <div className="form-field">
                <label>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="form-row-2">
                <div className="form-field">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {passwordMessage && (
                <p className={passwordMessageType === 'success' ? 'avail-saved-message' : 'avail-error-message'}>
                  {passwordMessage}
                </p>
              )}

              <button type="submit" className="confirm-btn password-submit-btn">Update Password</button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
