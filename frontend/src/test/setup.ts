import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { resetMockDb } from '../services/mockDb'

beforeEach(() => {
  localStorage.clear()
  resetMockDb()
})

afterEach(() => {
  cleanup()
})
