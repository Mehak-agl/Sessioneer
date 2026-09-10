import { useEffect, useRef, useState } from 'react'
import StaffSidebar from '../../components/TutorSidebar'
import { api } from '../../services/api'


type Theme = 'light' | 'dark'

const PHOTO_STORAGE_KEY = 'sessioneer_photo'
const THEME_STORAGE_KEY = 'sessioneer_theme'

function applyTheme(theme: Theme) {
  document.body.classList.toggle('dark-theme', theme === 'dark')
}

export default function TutorProfile() {
  const fullName = localStorage.getItem('sessioneer_name') || 'Tutor'
  const initials = fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase()

  const [photo, setPhoto] = useState<string | null>(() => localStorage.getItem(PHOTO_STORAGE_KEY))
  const [resumeName, setResumeName] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || 'light')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordMessageType, setPasswordMessageType] = useState<'success' | 'error'>('success')
  const [resumeData, setResumeData] = useState<string | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)

  const photoInputRef = useRef<HTMLInputElement>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getProfile().then((profile: any) => {
      if (profile.photo) {
        const dataUrl = `data:image/jpeg;base64,${profile.photo}`
        setPhoto(dataUrl)
        localStorage.setItem(PHOTO_STORAGE_KEY, dataUrl)
      }
      if (profile.resumeName) setResumeName(profile.resumeName)
      if (profile.resumeData) setResumeData(profile.resumeData)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      try {
        await api.updatePhoto(base64)
        setPhoto(dataUrl)
        localStorage.setItem(PHOTO_STORAGE_KEY, dataUrl)
      } catch (err) {
        console.error(err)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        await api.updateResume(file.name, base64, file.type)
        setResumeName(file.name)
      } catch (err) {
        console.error(err)
      }
    }
    reader.readAsDataURL(file)
  }

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(THEME_STORAGE_KEY, next)
      return next
    })
  }

  const handleChangePassword = async (e: React.FormEvent) => {
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

    try {
      await api.changePassword(currentPassword, newPassword)
      setPasswordMessage('Password changed successfully.')
      setPasswordMessageType('success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordMessage(err.message || 'Failed to change password.')
      setPasswordMessageType('error')
    }
  }

  return (
    <div className="staff-dashboard-page">
      <StaffSidebar />

      <main className="staff-main-content">
        <header className="staff-topbar">
          <div className="staff-page-title">
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
              <img 
                src={photo} 
                alt={fullName} 
                className="profile-photo-circle" 
                onClick={() => setShowPhotoModal(true)}
                style={{ cursor: 'pointer' }}
              />
            ) : (             
              <div className="profile-photo-circle profile-photo-placeholder">{initials}</div>
            )}

            {showPhotoModal && (
              <div 
                onClick={() => setShowPhotoModal(false)}
                style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1000, cursor: 'pointer'
                }}
              >
                <img 
                  src={photo!} 
                  alt={fullName}
                  style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '16px', objectFit: 'contain' }}
                />
              </div>
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
          <span className="profile-position-badge">Tutor</span>
        </section>

        <section className="detail-section">
          <div className="section-header">
            <div>
              <h2>Resume</h2>
              <p>Upload or update your resume</p>
            </div>
          </div>

          <div className="resume-row">
            {resumeName ? (
              <a 
                href={resumeData ? `data:application/pdf;base64,${resumeData}` : '#'}
                download={resumeName}
                className="resume-filename"
                style={{ color: '#0097b2', textDecoration: 'underline', cursor: 'pointer' }}
              >
                {resumeName}
              </a>
            ) : (
              <span className="resume-filename">No resume uploaded yet</span>
            )}
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