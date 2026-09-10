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

export const NOTIF_READ_KEY = 'sessioneer_read_notifs'
export const NOTIF_EVENT = 'sessioneer_notif_updated'

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
