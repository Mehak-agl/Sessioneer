import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LoginPage from './LoginPage'
import { setMockMode } from '../services/api'

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/coordinator" element={<h1>Coordinator home</h1>} />
        <Route path="/staff" element={<h1>Tutor home</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function signIn(email: string, password: string) {
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByPlaceholderText('Enter your password'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
}

describe('LoginPage (mock mode)', () => {
  beforeEach(() => setMockMode(true))

  it('sends a coordinator to the coordinator dashboard and stores the session', async () => {
    renderLogin()
    await signIn('coordinator@qut.edu.au', 'admin123')

    expect(await screen.findByRole('heading', { name: 'Coordinator home' })).toBeInTheDocument()
    expect(localStorage.getItem('sessioneer_token')).toBe('mock-user:1')
    expect(localStorage.getItem('sessioneer_role')).toBe('coordinator')
    expect(localStorage.getItem('sessioneer_name')).toBe('Sarah Chen')
    expect(localStorage.getItem('sessioneer_email')).toBe('coordinator@qut.edu.au')
  })

  it('sends a tutor to the tutor dashboard', async () => {
    renderLogin()
    await signIn('staff@qut.edu.au', 'staff123')
    expect(await screen.findByRole('heading', { name: 'Tutor home' })).toBeInTheDocument()
    expect(localStorage.getItem('sessioneer_role')).toBe('staff')
  })

  it('shows an error and stays on the page for a wrong password', async () => {
    renderLogin()
    await signIn('coordinator@qut.edu.au', 'wrong')
    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument()
    expect(localStorage.getItem('sessioneer_token')).toBeNull()
  })
})

describe('LoginPage (real backend down)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('suggests Mock Mode when the backend cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderLogin()
    await signIn('coordinator@qut.edu.au', 'admin123')
    expect(await screen.findByText(/backend is not running/)).toBeInTheDocument()
  })
})
