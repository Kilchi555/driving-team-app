/**
 * Customer link for appointments.
 *
 * Andere Terminart stores the chosen customer on appointments.user_id.
 * When no customer is chosen, user_id is the staff placeholder (user_id === staff_id)
 * because the column is NOT NULL. Reopening must show a customer only for a real
 * linked id, and must never substitute a different person when that record
 * cannot be loaded.
 */

export interface AppointmentCustomerIdentity {
  id?: string | null
  tenant_id?: string | null
}

export function persistedAppointmentUserId(input: {
  selectedCustomerId?: string | null
  staffId?: string | null
  fallbackUserId?: string | null
}): string {
  const selected = String(input.selectedCustomerId || '').trim()
  if (selected) return selected
  const staff = String(input.staffId || '').trim()
  if (staff) return staff
  return String(input.fallbackUserId || '').trim()
}

/**
 * Id to load into the customer selector.
 * Lesson appointments keep the historical rule: any stored user_id is restored.
 * Other terminarten skip the staff placeholder (no customer was selected).
 */
export function customerIdToRestore(input: {
  userId?: string | null
  staffId?: string | null
  eventType?: string | null
}): string | null {
  const userId = String(input.userId || '').trim()
  if (!userId) return null
  const eventType = String(input.eventType || '').trim().toLowerCase()
  const staffId = String(input.staffId || '').trim()
  if (eventType === 'lesson' || !staffId || userId !== staffId) return userId
  return null
}

/**
 * Selector value for a fetch result.
 * Returns the loaded record only when it is exactly the requested customer
 * and, when both tenant ids are present, the caller's tenant.
 * Missing, deleted, or cross-tenant records yield null — never a different customer.
 */
export function selectorValueForLoadedCustomer<T extends AppointmentCustomerIdentity>(
  requestedCustomerId: string | null | undefined,
  loaded: T | null | undefined,
  options?: { callerTenantId?: string | null }
): T | null {
  const requested = String(requestedCustomerId || '').trim()
  if (!requested || !loaded?.id || loaded.id !== requested) return null
  const callerTenantId = String(options?.callerTenantId || '').trim()
  const loadedTenantId = String(loaded.tenant_id || '').trim()
  if (callerTenantId && loadedTenantId && loadedTenantId !== callerTenantId) return null
  return loaded
}

/** Sticky auto-discount stays on chargeable lesson types. Other terminarten do not gain one on reopen. */
export function shouldApplyLinkedCustomerAutoDiscount(
  isLesson: boolean,
  discount: number | null | undefined
): boolean {
  if (!isLesson) return false
  return !discount
}
