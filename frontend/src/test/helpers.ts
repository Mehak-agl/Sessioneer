import * as mockApi from '../services/mockApi'

export async function signInAs(email: string, password: string) {
  const res = await mockApi.login({ email, password })
  localStorage.setItem('sessioneer_token', res.token)
  return res
}

export const COORDINATOR = { email: 'coordinator@qut.edu.au', password: 'admin123' }
export const ALEX = { id: 2, email: 'staff@qut.edu.au', password: 'staff123' }
export const PRIYA = { id: 3, email: 'priya.sharma@gmail.com', password: 'staff123' }
export const JAMES = { id: 4, email: 'j.wilson@outlook.com', password: 'staff123' }
