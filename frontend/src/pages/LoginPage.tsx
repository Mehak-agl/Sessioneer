import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../services/api'
import PasswordInput from '../components/PasswordInput'


type Role = 'coordinator' | 'staff'

const MOCK_USERS = [
  { email: 'coordinator@qut.edu.au', password: 'admin123', role: 'COORDINATOR', fullName: 'Sarah Chen' },
  { email: 'staff@qut.edu.au',       password: 'staff123',  role: 'STAFF',       fullName: 'Alex Thompson' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('coordinator')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.login({ email, password })
      localStorage.setItem('sessioneer_token', res.token)
      localStorage.setItem('sessioneer_role', res.role.toLowerCase())
      localStorage.setItem('sessioneer_name', res.fullName)
      // Store user ID in localStorage for testing purposes (not secure for production)
      localStorage.setItem('sessioneer_user_id', String(res.userId))
      // The email the person just signed in with is the email registered
      // to their account — save it so the Profile pages can display it.
      localStorage.setItem('sessioneer_email', email)
      navigate(res.role === 'COORDINATOR' ? '/coordinator' : '/staff')
    } catch {
      // Fall back to mock auth when backend is not running
      const mock = MOCK_USERS.find(u => u.email === email && u.password === password)
      if (mock) {
        localStorage.setItem('sessioneer_token', 'mock-token')
        localStorage.setItem('sessioneer_role', mock.role.toLowerCase())
        localStorage.setItem('sessioneer_name', mock.fullName)
        localStorage.setItem('sessioneer_email', mock.email)
        navigate(mock.role === 'COORDINATOR' ? '/coordinator' : '/staff')
      } else {
        setError('Invalid email or password.')
      }
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-brand">
        <div className="brand-content">
          <img src="/sessioneer-logo.png" alt="Sessioneer" className="brand-logo" />
          <h1 className="brand-title">SESSION<span className="brand-title-accent">EER</span></h1>
          <p className="brand-tagline">Sessioneer - where tutors breathe easy and coordinators finally sleep</p>
          <ul className="brand-features">
            <li>Coordinate tutorial sessions effortlessly</li>
            <li>Staff indicate availability in minutes</li>
            <li>Fair, transparent allocations</li>
          </ul>
        </div>
        <div className="brand-footer">
          <img src="/qut-logo.jpg" alt="QUT" className="qut-logo" />
          <span>A QUT T4T Initiative</span>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-header">
            <h2>Welcome back</h2>
            <p>Sign in to your Sessioneer account</p>
          </div>

          <div className="role-selector">
            <button className={`role-btn ${role === 'coordinator' ? 'active' : ''}`}
              onClick={() => { setRole('coordinator'); setError('') }} type="button">
              Unit Coordinator
            </button>
            <button className={`role-btn ${role === 'staff' ? 'active' : ''}`}
              onClick={() => { setRole('staff'); setError('') }} type="button">
              Sessional Staff
            </button>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="Enter your email address"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn">Sign In</button>
          </form>

          <p className="login-signup-link">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}