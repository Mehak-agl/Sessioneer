import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

type Role = 'coordinator' | 'staff'

const MOCK_USERS = {
  staff: { email: 'staff@qut.edu.au', password: 'staff123' },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('coordinator')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (role === 'coordinator') {
      try {
        const response = await fetch('http://localhost:8080/api/coordinators/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        })

        const data = await response.json()

        if (data.success) {
          localStorage.setItem('sessioneer_role', 'coordinator')
          localStorage.setItem('sessioneer_user', JSON.stringify(data.coordinator))
          navigate('/coordinator')
        } else {
          setError(data.message || 'Invalid email or password.')
        }
      } catch (err) {
        setError('Could not connect to backend. Make sure Spring Boot is running.')
      }

      return
    }

    const expected = MOCK_USERS.staff

    if (email === expected.email && password === expected.password) {
      localStorage.setItem('sessioneer_role', 'staff')
      navigate('/staff')
    } else {
      setError('Invalid email or password.')
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
                placeholder="Enter your email address"
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
                placeholder="Enter your password"
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
            <p>Coordinator: use account saved in PostgreSQL</p>
            <p>Staff: staff@qut.edu.au / staff123</p>
            <p className="login-hint-note">Coordinator login is connected to backend database.</p>
          </div>

          <p className="login-signup-link">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}