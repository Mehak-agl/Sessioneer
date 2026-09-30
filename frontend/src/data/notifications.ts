import { getDb } from '../services/mockDb'
import { isMockMode } from '../services/api'

export type NotifType =
  | 'availability'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'allocation_confirmed'
  | 'allocation_rejected'
  | 'swap_completed'

export interface Notification {
  id: string
  type: NotifType
  title: string
  message: string
  unit: string
  time: string
}

export type TutorNotifType =
  | 'invitation'
  | 'allocation'
  | 'deadline'
  | 'swap_approved'
  | 'swap_declined'

export interface TutorNotification {
  id: string
  type: TutorNotifType
  title: string
  message: string
  unit: string
  time: string
}

export const NOTIF_READ_KEY = 'sessioneer_read_notifs'
export const NOTIF_EVENT = 'sessioneer_notif_updated'
export const TUTOR_NOTIF_READ_KEY = 'sessioneer_tutor_read_notifs'
export const TUTOR_NOTIF_EVENT = 'sessioneer_tutor_notif_updated'

const t = (offsetMs: number) => new Date(Date.now() - offsetMs).toISOString()
const MIN = 60000
const HR = 3600000

// Names, unit codes and unit titles below match the seed data in
// services/mockDb.ts (CAB302 – Software Development, IFN660 – Advanced
// Topics in IT, CAB301 – Algorithms and Complexity) so the notifications
// feel like they belong to the same demo instead of referencing units or
// people that don't otherwise exist in the mock data.

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'availability',
    title: 'Availability Submitted',
    message: 'Emily Chen submitted her availability for CAB302 – Software Development.',
    unit: 'CAB302',
    time: t(25 * MIN),
  },
  {
    id: '2',
    type: 'invitation_accepted',
    title: 'Invitation Accepted',
    message: 'Sarah Kim accepted your invitation to IFN660 – Advanced Topics in IT.',
    unit: 'IFN660',
    time: t(2 * HR),
  },
  {
    id: '3',
    type: 'allocation_confirmed',
    title: 'Allocation Confirmed',
    message: 'Alex Thompson confirmed the Monday 9:00 am tutorial for CAB302.',
    unit: 'CAB302',
    time: t(5 * HR),
  },
  {
    id: '4',
    type: 'allocation_rejected',
    title: 'Allocation Rejected',
    message: 'Michael Brown rejected the Thursday 12:00 pm session for IFN660.',
    unit: 'IFN660',
    time: t(22 * HR),
  },
  {
    id: '5',
    type: 'invitation_accepted',
    title: 'Invitation Accepted',
    message: 'Priya Sharma accepted your invitation to CAB302 – Software Development.',
    unit: 'CAB302',
    time: t(28 * HR),
  },
  {
    id: '6',
    type: 'availability',
    title: 'Availability Submitted',
    message: 'Sarah Kim submitted her availability for IFN660 – Advanced Topics in IT.',
    unit: 'IFN660',
    time: t(47 * HR),
  },
  {
    id: '7',
    type: 'invitation_declined',
    title: 'Invitation Declined',
    message: 'James Wilson declined your invitation to CAB302 – Software Development.',
    unit: 'CAB302',
    time: t(72 * HR),
  },
  {
    id: '8',
    type: 'allocation_confirmed',
    title: 'Allocation Confirmed',
    message: 'Priya Sharma confirmed the Wednesday 2:00 pm workshop for CAB302.',
    unit: 'CAB302',
    time: t(96 * HR),
  },
]

export const MOCK_TUTOR_NOTIFICATIONS: TutorNotification[] = [  {
    id: 't1',
    type: 'allocation',
    title: 'Session Allocated',
    message: 'You have been allocated to the Monday 9:00 am tutorial for CAB302 – Software Development.',
    unit: 'CAB302',
    time: t(30 * MIN),
  },
  {
    id: 't2',
    type: 'invitation',
    title: 'Unit Invitation',
    message: 'Sarah Chen has invited you to join IFN660 – Advanced Topics in IT as a sessional tutor.',
    unit: 'IFN660',
    time: t(3 * HR),
  },
  {
    id: 't3',
    type: 'deadline',
    title: 'Availability Deadline',
    message: 'Reminder: availability submission for CAB301 – Algorithms and Complexity closes in 3 days. Please submit before the deadline.',
    unit: 'CAB301',
    time: t(6 * HR),
  },
  {
    id: 't4',
    type: 'allocation',
    title: 'Session Allocated',
    message: 'You have been allocated to the Wednesday 2:00 pm workshop for CAB302 – Software Development.',
    unit: 'CAB302',
    time: t(24 * HR),
  },
  {
    id: 't5',
    type: 'swap_approved',
    title: 'Swap Request Approved',
    message: 'Your request to swap the Friday 10:00 am lecture for CAB302 has been approved by the coordinator.',
    unit: 'CAB302',
    time: t(36 * HR),
  },
  {
    id: 't6',
    type: 'invitation',
    title: 'Unit Invitation',
    message: 'Sarah Chen has invited you to join CAB301 – Algorithms and Complexity as a sessional tutor.',
    unit: 'CAB301',
    time: t(50 * HR),
  },
  {
    id: 't7',
    type: 'swap_declined',
    title: 'Swap Request Declined',
    message: 'Your request to swap the Tuesday 1:00 pm tutorial for IFN660 was declined. Please contact your coordinator.',
    unit: 'IFN660',
    time: t(72 * HR),
  },
  {
    id: 't8',
    type: 'deadline',
    title: 'Availability Deadline Passed',
    message: 'The availability submission window for CAB302 has now closed. Contact your coordinator if you missed it.',
    unit: 'CAB302',
    time: t(96 * HR),
  },
]

// ── Live coordinator notifications ─────────────────────────────────────
// MOCK_NOTIFICATIONS above is static demo content. On top of that, real
// in-session events — currently just completed Emergency Swaps (see
// services/mockApi.ts respondToSwapRequest) — get pushed into the mock
// DB and surfaced here too, newest first, whenever mock mode is on.
export function getCoordinatorNotifications(): Notification[] {
  if (!isMockMode()) return MOCK_NOTIFICATIONS
  try {
    const live: Notification[] = getDb().coordinatorNotices.map(n => ({
      id: n.id,
      type: 'swap_completed',
      title: n.title,
      message: n.message,
      unit: n.unit,
      time: n.time,
    }))
    return [...live, ...MOCK_NOTIFICATIONS]
  } catch {
    return MOCK_NOTIFICATIONS
  }
}
