import { useEffect, useState } from 'react'
import { isMockMode, setMockMode } from '../services/api'
import { resetMockDb } from '../services/mockDb'

// Floating, always-on-top control that lets you flip between the mock
// (frontend-only) backend and the real backend, and reset the demo data.
// Doesn't touch any page — just sits in the corner of every screen.
export default function MockModeToggle() {
  const [mock, setMock] = useState(isMockMode())
  const [open, setOpen] = useState(false)
  const [justReset, setJustReset] = useState(false)

  useEffect(() => {
    if (justReset) {
      const t = setTimeout(() => setJustReset(false), 1500)
      return () => clearTimeout(t)
    }
  }, [justReset])

  const toggle = () => {
    const next = !mock
    setMockMode(next)
    setMock(next)
  }

  const handleReset = () => {
    resetMockDb()
    setJustReset(true)
  }

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, fontFamily: 'inherit' }}>
      {open && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            padding: '14px 16px',
            width: 260,
            marginBottom: 10,
            fontSize: 13,
            color: '#1f2937',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {mock ? '🧪 Mock mode is ON' : '🔌 Using real backend'}
          </div>
          <p style={{ margin: '0 0 10px', lineHeight: 1.4, color: '#4b5563' }}>
            {mock
              ? 'All data (units, tutors, sessions, invitations, availability, allocations) is fake and stored only in this browser — no backend required.'
              : 'Calls go to http://localhost:8080/api as normal.'}
          </p>
          {mock && (
            <>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Demo logins</div>
                <div>Coordinator: coordinator@qut.edu.au / admin123</div>
                <div>Staff: staff@qut.edu.au / staff123</div>
                <div style={{ color: '#6b7280', marginTop: 4 }}>Or sign up as a new account — it's saved to the mock data too.</div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: justReset ? '#dcfce7' : '#f8fafc',
                  cursor: 'pointer',
                  marginBottom: 10,
                  fontSize: 13,
                }}
              >
                {justReset ? '✓ Demo data reset' : 'Reset demo data'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={toggle}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: 'none',
              background: mock ? '#1f2937' : '#2563eb',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {mock ? 'Switch to real backend' : 'Switch to mock mode'}
          </button>
          {mock && (
            <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#9ca3af', lineHeight: 1.4 }}>
              Switching modes takes effect immediately — no reload needed. You may want to log out
              and back in afterwards so the right account/token is used.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Mock mode settings"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          borderRadius: 999,
          border: 'none',
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 12.5,
          color: '#fff',
          background: mock ? '#16a34a' : '#2563eb',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', opacity: 0.9 }} />
        {mock ? 'Mock Mode' : 'Live Backend'}
      </button>
    </div>
  )
}
