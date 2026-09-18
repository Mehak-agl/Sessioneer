export type NotifType =
  | 'availability'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'allocation_confirmed'
  | 'allocation_rejected'

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

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'availability',
    title: 'Availability Submitted',
    message: 'Shari submitted her availability for CAB302 – Software Architecture.',
    unit: 'CAB302',
    time: t(25 * MIN),
  },
  {
    id: '2',
    type: 'invitation_accepted',
    title: 'Invitation Accepted',
    message: 'Devika accepted your invitation to IFN501 – Data Science Fundamentals.',
    unit: 'IFN501',
    time: t(2 * HR),
  },
  {
    id: '3',
    type: 'allocation_confirmed',
    title: 'Allocation Confirmed',
    message: 'Anantha confirmed the Tuesday 9:00 am session for CAB302.',
    unit: 'CAB302',
    time: t(5 * HR),
  },
  {
    id: '4',
    type: 'allocation_rejected',
    title: 'Allocation Rejected',
    message: 'Test User rejected the Friday 2:00 pm session for IFN501.',
    unit: 'IFN501',
    time: t(22 * HR),
  },
  {
    id: '5',
    type: 'invitation_accepted',
    title: 'Invitation Accepted',
    message: 'appus accepted your invitation to CAB302 – Software Architecture.',
    unit: 'CAB302',
    time: t(28 * HR),
  },
  {
    id: '6',
    type: 'availability',
    title: 'Availability Submitted',
    message: 'Devika submitted her availability for IFN501 – Data Science Fundamentals.',
    unit: 'IFN501',
    time: t(47 * HR),
  },
  {
    id: '7',
    type: 'invitation_declined',
    title: 'Invitation Declined',
    message: 'Test User declined your invitation to CAB302 – Software Architecture.',
    unit: 'CAB302',
    time: t(72 * HR),
  },
  {
    id: '8',
    type: 'allocation_confirmed',
    title: 'Allocation Confirmed',
    message: 'Shari confirmed the Wednesday 11:00 am session for CAB302.',
    unit: 'CAB302',
    time: t(96 * HR),
  },
]

export const MOCK_TUTOR_NOTIFICATIONS: TutorNotification[] = [
  {
    id: 't1',
    type: 'allocation',
    title: 'Session Allocated',
    message: 'You have been allocated to the Tuesday 9:00 am tutorial for CAB302 – Software Architecture.',
    unit: 'CAB302',
    time: t(30 * MIN),
  },
  {
    id: 't2',
    type: 'invitation',
    title: 'Unit Invitation',
    message: 'Dr. Anantha has invited you to join IFN501 – Data Science Fundamentals as a sessional tutor.',
    unit: 'IFN501',
    time: t(3 * HR),
  },
  {
    id: 't3',
    type: 'deadline',
    title: 'Availability Deadline',
    message: 'Reminder: availability submission for CAB303 – Database Systems closes in 3 days. Please submit before the deadline.',
    unit: 'CAB303',
    time: t(6 * HR),
  },
  {
    id: 't4',
    type: 'allocation',
    title: 'Session Allocated',
    message: 'You have been allocated to the Thursday 2:00 pm lab for IFN501 – Data Science Fundamentals.',
    unit: 'IFN501',
    time: t(24 * HR),
  },
  {
    id: 't5',
    type: 'swap_approved',
    title: 'Swap Request Approved',
    message: 'Your request to swap the Friday 11:00 am session for CAB302 has been approved by the coordinator.',
    unit: 'CAB302',
    time: t(36 * HR),
  },
  {
    id: 't6',
    type: 'invitation',
    title: 'Unit Invitation',
    message: 'Dr. Priya has invited you to join CAB303 – Database Systems as a sessional tutor.',
    unit: 'CAB303',
    time: t(50 * HR),
  },
  {
    id: 't7',
    type: 'swap_declined',
    title: 'Swap Request Declined',
    message: 'Your request to swap the Wednesday 1:00 pm session for IFN501 was declined. Please contact your coordinator.',
    unit: 'IFN501',
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

