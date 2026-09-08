/**
 * Schedule occupancy rules for availability / conflict calculations.
 *
 * Cancelled appointments must NEVER occupy slots, even when deleted_at is NULL.
 * Soft-delete remains an independent concept.
 */

export type ScheduleOccupancyInput = {
  status?: string | null
  deleted_at?: string | null
}

export function isCancelledAppointmentStatus(status: string | null | undefined): boolean {
  return status === 'cancelled' || status === 'canceled'
}

/** True when an appointment row blocks calendar / availability slots. */
export function occupiesScheduleSlot(appointment: ScheduleOccupancyInput): boolean {
  if (appointment.deleted_at) return false
  const status = appointment.status
  if (!status) return false
  if (status === 'deleted') return false
  if (isCancelledAppointmentStatus(status)) return false
  // pending, scheduled, confirmed, pending_confirmation, completed, etc. occupy
  return true
}

export function filterOccupyingAppointments<T extends ScheduleOccupancyInput>(
  appointments: T[]
): T[] {
  return appointments.filter((appointment) => occupiesScheduleSlot(appointment))
}

/**
 * Customer conflict checks: only non-cancelled, non-deleted rows may block rebooking.
 * Alias of occupiesScheduleSlot for clearer call sites.
 */
export function participatesInCustomerConflict(
  appointment: ScheduleOccupancyInput
): boolean {
  return occupiesScheduleSlot(appointment)
}
