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
