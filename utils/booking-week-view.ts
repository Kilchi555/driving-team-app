/**
 * Public booking page decisions that must stay in the client UI.
 *
 * last-booking-prefs stays server-gated to role `client`.
 * Week emptiness uses the existing `week_number` bucket (1–4). Slot labels
 * already format in Europe/Zurich; this module does not recalculate dates.
 */

export const EMPTY_BOOKING_WEEK_MESSAGE =
  'In dieser Woche sind keine buchbaren Termine vorhanden.'

export const EMPTY_BOOKING_WEEK_HINT = 'Bitte wählen Sie eine andere Woche.'

/** Only a customer (`users.role === 'client'`) may request saved booking prefs. */
export function shouldFetchLastBookingPrefs(role: string | null | undefined): boolean {
  return role === 'client'
}

export interface BookingSlotWeekRef {
  week_number?: number | null
}

export type BookingWeekView = 'loading' | 'error' | 'slots' | 'empty' | 'proposal'

/**
 * What the slot step should render for the selected week.
 * `proposal` is the existing full-response empty path (no slots in any week).
 * `empty` is a selected week with zero slots while other weeks still have some.
 */
export function resolveBookingWeekView(input: {
  loading: boolean
  error: string | null | undefined
  slots: readonly BookingSlotWeekRef[]
  week: number
}): BookingWeekView {
  if (input.loading) return 'loading'
  if (input.error) return 'error'
  if (!input.slots.length) return 'proposal'
  if (input.slots.some((slot) => slot.week_number === input.week)) return 'slots'
  return 'empty'
}
