import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, isMockMode, setMockMode } from './api'

function stubFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('mock mode flag', () => {
  it('is off by default', () => {
    expect(isMockMode()).toBe(false)
  })

  it('persists when switched on and off', () => {
    setMockMode(true)
    expect(isMockMode()).toBe(true)
    setMockMode(false)
    expect(isMockMode()).toBe(false)
  })
})

describe('real backend mode', () => {
  it('sends requests to the Spring Boot API with the stored token', async () => {
    localStorage.setItem('sessioneer_token', 'abc123')
    const fetchMock = stubFetch([{ id: 1, code: 'CAB302' }])

    const units = await api.getUnits()

    expect(units).toEqual([{ id: 1, code: 'CAB302' }])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/units')
    expect(init.method).toBe('GET')
    expect(init.headers.Authorization).toBe('Bearer abc123')
  })

  it('posts JSON bodies for login', async () => {
    const fetchMock = stubFetch({ token: 't', role: 'STAFF', fullName: 'A' })
    await api.login({ email: 'a@b.com', password: 'x' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/auth/login')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'x' })
  })

  it('throws the server error text when the response is not ok', async () => {
    stubFetch('Bad credentials', false)
    await expect(api.login({ email: 'a', password: 'b' })).rejects.toThrow('Bad credentials')
  })

  it('explains that Emergency Swap needs mock mode', async () => {
    const fetchMock = stubFetch({})
    await expect(api.getMySwapRequests()).rejects.toThrow('only available in Mock Mode')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('mock mode', () => {
  it('routes calls to the mock API instead of the network', async () => {
    setMockMode(true)
    const fetchMock = stubFetch({})

    const res = await api.login({ email: 'coordinator@qut.edu.au', password: 'admin123' })

    expect(res.role).toBe('COORDINATOR')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('makes Emergency Swap work', async () => {
    setMockMode(true)
    const { token } = await api.login({ email: 'staff@qut.edu.au', password: 'staff123' })
    localStorage.setItem('sessioneer_token', token)

    await expect(api.getMySwapRequests()).resolves.toEqual({ outgoing: [], incoming: [] })
  })

  it('falls back to the real backend for calls with no mock version', async () => {
    setMockMode(true)
    const fetchMock = stubFetch([])
    await api.getConversations()
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8080/api/messages/conversations')
  })
})
