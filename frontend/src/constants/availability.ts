// Placeholder "O Week" availability deadline. The backend has no concept
// of a semester calendar or deadline yet, so this is hardcoded for now —
// swap this out once there's a real per-semester value coming from the API.
export const AVAILABILITY_DEADLINE = new Date('2026-08-03T23:59:59')

export function getDaysLeftInAvailabilityWindow(): number {
  const now = new Date()
  const diffMs = AVAILABILITY_DEADLINE.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}
