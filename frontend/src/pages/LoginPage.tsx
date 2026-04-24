import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

type Role = 'coordinator' | 'staff'

const MOCK_USERS = {
  coordinator: { email: 'coordinator@qut.edu.au', password: 'admin123' },
  staff: { email: 'staff@qut.edu.au', password: 'staff123' },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('coordinator')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const expected = MOCK_USERS[role]
    if (email === expected.email && password === expected.password) {
      localStorage.setItem('sessioneer_role', role)
      navigate(role === 'coordinator' ? '/coordinator' : '/staff')
    } else {
      setError('Invalid email or password.')
    }
  }

  return (
    <div className="login-wrapper">

      {/* Left brand panel */}
      <div className="login-brand">
        <div className="brand-content">
          <img src="/sessioneer-logo.png" alt="Sessioneer" className="brand-logo" />
          <h1 className="brand-title">Sessioneer</h1>
          <p className="brand-tagline">
            Smarter scheduling for sessional teaching staff.
          </p>
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

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-header">
            <h2>Welcome back</h2>
            <p>Sign in to your Sessioneer account</p>
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

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder={MOCK_USERS[role].email}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn">Sign In</button>
          </form>

          <div className="login-hint">
            <strong>Demo credentials</strong>
            <p>Coordinator: coordinator@qut.edu.au / admin123</p>
            <p>Staff: staff@qut.edu.au / staff123</p>
          </div>
        </div>
      </div>

    </div>
  )
}
