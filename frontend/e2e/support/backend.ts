import { expect, type Page } from '@playwright/test'

export const API = 'http://localhost:8080/api'

// Unique per test so parallel tests and repeated runs never collide.
// Everything created is tagged "e2e" so it's easy to spot in the database.
export function uid(prefix = '') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export interface Account {
  id: number
  token: string
  email: string
  password: string
  fullName: string
  role: 'COORDINATOR' | 'STAFF'
}

async function call<T = any>(method: string, path: string, token?: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`)
  return (text ? JSON.parse(text) : undefined) as T
}

export const backend = {
  call,

  async login(email: string, password: string) {
    return call<{ userId: number; token: string; role: string; fullName: string }>('POST', '/auth/login', undefined, { email, password })
  },

  async coordinator(name = 'E2E Coordinator'): Promise<Account> {
    const email = `${uid('e2e-coord-')}@example.com`
    const password = 'Coord123!'
    const res = await call('POST', '/auth/signup', undefined, { fullName: name, email, password, role: 'coordinator' })
    return { id: res.userId, token: res.token, email, password, fullName: name, role: 'COORDINATOR' }
  },

  // Uses the real coordinator "Create Account" endpoint (welcome email
  // fails quietly because the backend runs with mail disabled).
  async tutor(coordinator: Account, name: string): Promise<Account> {
    const email = `${uid('e2e-tutor-')}@example.com`
    const password = 'Tutor123!'
    await call('POST', '/users/create-tutor', coordinator.token, { fullName: name, email, temporaryPassword: password })
    const res = await backend.login(email, password)
    return { id: res.userId, token: res.token, email, password, fullName: name, role: 'STAFF' }
  },

  async unit(coordinator: Account, name = 'E2E Testing Unit') {
    const code = uid('E2E').toUpperCase().slice(0, 10)
    return call<{ id: number; code: string; name: string }>('POST', '/units', coordinator.token, {
      code, name, semester: 'Semester 2, 2026',
    })
  },

  async session(coordinator: Account, unitId: number, start: Date, title = 'Tutorial', location = 'Online') {
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    return call<{ id: number; title: string; startTime: string }>('POST', `/units/${unitId}/sessions`, coordinator.token, {
      title, startTime: isoLocal(start), endTime: isoLocal(end), location,
    })
  },

  // A weekly class: `count` sessions, 7 days apart, starting `weeksAhead` weeks from now.
  async weeklySessions(coordinator: Account, unitId: number, opts: { title?: string; weekday?: number; hour?: number; count?: number; weeksAhead?: number; location?: string } = {}) {
    const { title = 'Tutorial', weekday = 2, hour = 10, count = 3, weeksAhead = 1, location = 'Online' } = opts
    const first = nextWeekday(weekday, hour, weeksAhead)
    const sessions = []
    for (let i = 0; i < count; i++) {
      sessions.push(await backend.session(coordinator, unitId, new Date(first.getTime() + i * 7 * 86400000), title, location))
    }
    return sessions
  },

  async invite(coordinator: Account, unitId: number, tutor: Account) {
    return call('POST', `/units/${unitId}/invite/${tutor.id}`, coordinator.token)
  },

  async accept(tutor: Account, unitId: number) {
    return call('POST', `/units/${unitId}/invite/${tutor.id}/respond`, tutor.token, {})
  },

  async availability(tutor: Account, unitId: number, start: Date) {
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    return call('POST', '/availability', tutor.token, { unitId, startTime: isoLocal(start), endTime: isoLocal(end) })
  },

  async allocate(coordinator: Account, sessionId: number, tutor: Account) {
    return call('POST', '/allocations', coordinator.token, { sessionId, staffId: tutor.id })
  },

  async unitAllocations(coordinator: Account, unitId: number) {
    return call<any[]>('GET', `/allocations/unit/${unitId}`, coordinator.token)
  },

  async invitations(coordinator: Account, unitId: number) {
    return call<any[]>('GET', `/units/${unitId}/invitations`, coordinator.token)
  },

  async notifications(user: Account) {
    return call<{ id: number; type: string; title: string; message: string; unitCode: string | null; read: boolean }[]>('GET', '/notifications/me', user.token)
  },

  async swaps(user: Account) {
    return call<{ outgoing: any[]; incoming: any[] }>('GET', '/swap-requests/me', user.token)
  },
}

export function isoLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}

// weekday: 0=Sun..6=Sat
export function nextWeekday(weekday: number, hour: number, weeksAhead = 1) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setDate(d.getDate() + weeksAhead * 7)
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1)
  return d
}

// Signs the browser in by writing the same localStorage keys the login page
// sets, so tests that aren't about login don't pay for the login UI each time.
export async function signIn(page: Page, user: Account, path?: string) {
  await page.goto('/')
  await page.evaluate(u => {
    localStorage.clear()
    localStorage.setItem('sessioneer_token', u.token)
    localStorage.setItem('sessioneer_role', u.role.toLowerCase())
    localStorage.setItem('sessioneer_name', u.fullName)
    localStorage.setItem('sessioneer_user_id', String(u.id))
    localStorage.setItem('sessioneer_email', u.email)
  }, user)
  await page.goto(path ?? (user.role === 'COORDINATOR' ? '/coordinator' : '/staff'))
}

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByPlaceholder('Enter your password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).not.toHaveURL(/\/$/)
}

export function sidebarLink(page: Page, name: string | RegExp) {
  return page.locator('aside.coord-sidebar nav, aside.staff-sidebar nav').getByRole('link', { name })
}

export function logoutButton(page: Page) {
  return page.locator('aside.coord-sidebar, aside.staff-sidebar').getByRole('button', { name: /Logout/ })
}

export function field(page: Page, label: string) {
  return page.locator('.form-field, .form-group', { has: page.locator('label', { hasText: label }) }).locator('input, select, textarea').first()
}
