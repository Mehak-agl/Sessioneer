export type SessionMode = 'online' | 'on-campus'

export type Session = {
  id: string
  day: string
  time: string
  duration: string
  mode: SessionMode
  location: string
}

export type TutorInvite = {
  id: string
  name: string
  email: string
  status: 'pending' | 'responded'
  availableSessions: string[]
}

export type Unit = {
  id: string
  code: string
  name: string
  semester: string
  sessions: Session[]
  invitedTutors: TutorInvite[]
}

export type DummyTutor = {
  id: string
  name: string
  email: string
}

// ── Tutor Report section (Coordinator view of all tutors) ─────────────────

export type TutorUnitAssignment = {
  unitId: number
  code: string
  name: string
  semester: string
  invitationStatus: 'PENDING' | 'RESPONDED'
  sessionsAllocated: number
}

/** Row shown in the "All Tutors" report list. */
export type TutorSummary = {
  id: number
  fullName: string
  email: string
  unitCount: number
  totalSessionsAllocated: number
  hasResume: boolean
}

/** Full report shown on an individual tutor's profile page. */
export type TutorReportProfile = {
  id: number
  fullName: string
  email: string
  units: TutorUnitAssignment[]
  totalSessionsAllocated: number
  pendingInvitations: number
  hasResume: boolean
  resumeFileName?: string
  resumeData?: string
}
