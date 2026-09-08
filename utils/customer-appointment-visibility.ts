/**
 * Customer appointment visibility rules.
 *
 * Soft-delete (`deleted_at`) and cancellation (`status = cancelled`) are
 * independent domain states. Active/upcoming customer surfaces must exclude
 * both — especially unpaid online holds which are cancelled with deleted_at NULL.
 */

export type CustomerAppointmentVisibilityInput = {
  status?: string | null
  deleted_at?: string | null
  start_time?: string | null
  user_id?: string | null
  tenant_id?: string | null
}

export function isCancelledAppointmentStatus(status: string | null | undefined): boolean {
  return status === 'cancelled' || status === 'canceled'
}

/** True when a row may appear in the customer's appointment list (history + upcoming). */
export function isVisibleCustomerAppointment(
  appointment: CustomerAppointmentVisibilityInput
): boolean {
  if (appointment.deleted_at) return false
  if (isCancelledAppointmentStatus(appointment.status)) return false
  return true
}

/** True when a row may appear as an upcoming / active booking for the customer. */
export function isUpcomingCustomerAppointment(
  appointment: CustomerAppointmentVisibilityInput,
  now: Date = new Date()
): boolean {
  if (!isVisibleCustomerAppointment(appointment)) return false
  if (!appointment.start_time) return false
  return new Date(appointment.start_time) > now
}

export function filterUpcomingCustomerAppointments<T extends CustomerAppointmentVisibilityInput>(
  appointments: T[],
  now: Date = new Date()
): T[] {
  return appointments.filter((appointment) => isUpcomingCustomerAppointment(appointment, now))
}

/**
 * Tenant/user isolation for in-memory lists (defense-in-depth for callers that
 * already scoped via API). Does not replace server-side filters.
 */
export function belongsToCustomerTenant(
  appointment: CustomerAppointmentVisibilityInput,
  opts: { userId: string; tenantId: string }
): boolean {
  if (appointment.user_id && appointment.user_id !== opts.userId) return false
  if (appointment.tenant_id && appointment.tenant_id !== opts.tenantId) return false
  return true
}
