import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../services/api'


type Role = 'coordinator' | 'staff'

export default function SignupPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('coordinator')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    try {
      const res = await api.signup({
        fullName,
        email,
        password,
        role,
      })

      localStorage.setItem('sessioneer_token', res.token)
      localStorage.setItem('sessioneer_role', res.role.toLowerCase())
      localStorage.setItem('sessioneer_name', res.fullName)

      navigate(res.role === 'COORDINATOR' ? '/coordinator' : '/staff')
    } catch {
      setError('Signup failed. Email may already be registered.')
    }
  }

  return (
    <div className="signup-wrapper">
      <div className="signup-brand">
        <div className="brand-content">
          <img src="/sessioneer-logo.png" alt="Sessioneer" className="brand-logo" />
          <h1 className="brand-title">SESSION<span className="brand-title-accent">EER</span></h1>
          <p className="brand-tagline">Sessioneer - where tutors breathe easy and coordinators finally sleep</p>
          <ul className="brand-features">
            <li>Set up your unit in minutes</li>
            <li>Invite staff and collect availability</li>
            <li>Generate fair, transparent allocations</li>
          </ul>
        </div>
        <div className="brand-footer">
          <img src="/qut-logo.jpg" alt="QUT" className="qut-logo" />
          <span>A QUT T4T Initiative</span>
        </div>
      </div>

      <div className="signup-form-panel">
        <div className="signup-card">
          <div className="signup-header">
            <h2>Create an account</h2>
            <p>Sign up to get started with Sessioneer</p>
          </div>

          <div className="role-selector">
            <button
              className={`role-btn ${role === 'coordinator' ? 'active' : ''}`}
              onClick={() => { setRole('coordinator'); setError('') }}
              type="button"
            >
              Unit Coordinator
            </button>
            <button
              className={`role-btn ${role === 'staff' ? 'active' : ''}`}
              onClick={() => { setRole('staff'); setError('') }}
              type="button"
            >
              Sessional Staff
            </button>
          </div>

          <form className="signup-form" onSubmit={handleSignup}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <p className="signup-error">{error}</p>}

            <button type="submit" className="signup-btn">Create Account</button>
          </form>

          <p className="signup-login-link">
            Already have an account? <Link to="/">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}