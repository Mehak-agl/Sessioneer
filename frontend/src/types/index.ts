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
