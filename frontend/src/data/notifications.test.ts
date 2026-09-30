import { describe, expect, it } from 'vitest'
import { getCoordinatorNotifications, MOCK_NOTIFICATIONS, MOCK_TUTOR_NOTIFICATIONS } from './notifications'
import { setMockMode } from '../services/api'
import { getDb, saveDb } from '../services/mockDb'

describe('coordinator notifications', () => {
  it('returns the static list when using the real backend', () => {
    expect(getCoordinatorNotifications()).toBe(MOCK_NOTIFICATIONS)
  })

  it('puts live swap notices first in mock mode', () => {
    setMockMode(true)
    getDb().coordinatorNotices.push({
      id: 'swap-1', unit: 'CAB302', title: 'Emergency Swap Completed', message: 'FYI', time: new Date().toISOString(),
    })
    saveDb()

    const list = getCoordinatorNotifications()

    expect(list[0]).toMatchObject({ id: 'swap-1', type: 'swap_completed', unit: 'CAB302' })
    expect(list).toHaveLength(MOCK_NOTIFICATIONS.length + 1)
  })
})

describe('mock notification data', () => {
  it('has unique ids across coordinator and tutor lists', () => {
    const ids = [...MOCK_NOTIFICATIONS, ...MOCK_TUTOR_NOTIFICATIONS].map(n => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only uses unit codes that exist in the mock database', () => {
    const codes = new Set(getDb().units.map(u => u.code))
    for (const n of [...MOCK_NOTIFICATIONS, ...MOCK_TUTOR_NOTIFICATIONS]) {
      expect(codes).toContain(n.unit)
    }
  })
})
