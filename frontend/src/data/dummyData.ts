import type { DummyTutor, Unit } from '../types'

export const DUMMY_TUTORS: DummyTutor[] = [
  { id: 't1', name: 'Alex Thompson',   email: 'alex.thompson@gmail.com' },
  { id: 't2', name: 'Priya Sharma',    email: 'priya.sharma@gmail.com' },
  { id: 't3', name: 'James Wilson',    email: 'j.wilson@outlook.com' },
  { id: 't4', name: 'Emily Chen',      email: 'emily.chen@gmail.com' },
  { id: 't5', name: 'Rohit Patel',     email: 'rohit.patel@gmail.com' },
  { id: 't6', name: 'Sarah Kim',       email: 'sarah.kim@email.com' },
  { id: 't7', name: 'Michael Brown',   email: 'm.brown@outlook.com' },
  { id: 't8', name: 'Jessica Lee',     email: 'jessica.lee@gmail.com' },
  { id: 't9', name: 'David Nguyen',    email: 'david.nguyen@gmail.com' },
  { id: 't10', name: 'Aisha Malik',    email: 'aisha.malik@email.com' },
]

export const INITIAL_UNITS: Unit[] = [
  {
    id: 'u1',
    code: 'CAB302',
    name: 'Software Development',
    semester: 'Semester 2, 2026',
    sessions: [
      { id: 's1', day: 'Monday',    time: '09:00', duration: '2hr', mode: 'on-campus', location: 'P Block P404' },
      { id: 's2', day: 'Monday',    time: '11:00', duration: '2hr', mode: 'on-campus', location: 'P Block P404' },
      { id: 's3', day: 'Wednesday', time: '14:00', duration: '2hr', mode: 'online',    location: '' },
      { id: 's4', day: 'Friday',    time: '10:00', duration: '2hr', mode: 'on-campus', location: 'GP South S517' },
    ],
    invitedTutors: [
      { id: 't1', name: 'Alex Thompson', email: 'alex.thompson@gmail.com', status: 'responded', availableSessions: ['s1', 's3'] },
      { id: 't2', name: 'Priya Sharma',  email: 'priya.sharma@gmail.com',  status: 'responded', availableSessions: ['s2', 's4'] },
      { id: 't3', name: 'James Wilson',  email: 'j.wilson@outlook.com',    status: 'pending',   availableSessions: [] },
      { id: 't4', name: 'Emily Chen',    email: 'emily.chen@gmail.com',    status: 'responded', availableSessions: ['s1', 's2', 's3'] },
      { id: 't5', name: 'Rohit Patel',   email: 'rohit.patel@gmail.com',   status: 'pending',   availableSessions: [] },
    ],
  },
  {
    id: 'u2',
    code: 'IFN660',
    name: 'Advanced Topics in IT',
    semester: 'Semester 2, 2026',
    sessions: [
      { id: 's5', day: 'Tuesday',   time: '13:00', duration: '1hr', mode: 'online',    location: '' },
      { id: 's6', day: 'Thursday',  time: '10:00', duration: '1hr', mode: 'on-campus', location: 'B Block B204' },
      { id: 's7', day: 'Thursday',  time: '12:00', duration: '1hr', mode: 'on-campus', location: 'B Block B204' },
    ],
    invitedTutors: [
      { id: 't6', name: 'Sarah Kim',    email: 'sarah.kim@email.com',  status: 'responded', availableSessions: ['s5', 's6'] },
      { id: 't7', name: 'Michael Brown', email: 'm.brown@outlook.com', status: 'pending',   availableSessions: [] },
    ],
  },
  {
    id: 'u3',
    code: 'CAB301',
    name: 'Algorithms and Complexity',
    semester: 'Semester 2, 2026',
    sessions: [],
    invitedTutors: [],
  },
]
