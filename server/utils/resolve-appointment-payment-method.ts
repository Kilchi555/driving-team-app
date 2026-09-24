import { normalizeTenantPaymentMethod, type TenantPaymentMethod } from '~/server/utils/tenant-default-payment-method'

export type EventTypePaymentMethod = TenantPaymentMethod

export class InvalidEventTypePaymentMethodError extends Error {
  constructor(value: unknown) {
    super(`Invalid event type payment method: ${String(value)}`)
    this.name = 'InvalidEventTypePaymentMethodError'
  }
}

/**
 * Event-type defaults are wallee | cash | invoice.
 * NULL / empty inherits. credit is a payment snapshot, not a default.
 * Invalid stored values are rejected, not mapped to wallee.
 */
export function parseEventTypePaymentMethod(value: unknown): EventTypePaymentMethod | null {
  if (value == null || value === '') return null
  if (value === 'wallee' || value === 'cash' || value === 'invoice') return value
  throw new InvalidEventTypePaymentMethodError(value)
}

/**
 * effective = event type override ?? tenant default.
 * Missing tenant settings stay on the existing wallee fallback.
 */
export function resolveAppointmentPaymentMethod(input: {
  tenantDefaultPaymentMethod?: unknown
  eventTypePaymentMethod?: unknown
}): TenantPaymentMethod {
  const eventType = parseEventTypePaymentMethod(input.eventTypePaymentMethod)
  if (eventType) return eventType
  return normalizeTenantPaymentMethod(input.tenantDefaultPaymentMethod)
}

/**
 * Admin booking prefill. This does not rewrite an existing payment row.
 *
 * 1. Existing payment snapshot, including credit.
 * 2. Customer preferred_payment_method when set (personal prefill; it already
 *    outranked the tenant default and still does).
 * 3. Event type override, else tenant default.
 *
 * An explicit dropdown change is the booking-time choice and is whatever the
 * admin leaves in the form. It is not recomputed from the event type on save.
 */
export function resolveAdminPaymentPrefill(input: {
  existingPaymentMethod?: string | null
  preferredPaymentMethod?: string | null
  eventTypePaymentMethod?: unknown
  tenantDefaultPaymentMethod?: unknown
}): string {
  const existing = input.existingPaymentMethod?.trim()
  if (existing) return existing

  const preferred = input.preferredPaymentMethod?.trim()
  if (preferred) return normalizeTenantPaymentMethod(preferred)

  return resolveAppointmentPaymentMethod({
    tenantDefaultPaymentMethod: input.tenantDefaultPaymentMethod,
    eventTypePaymentMethod: input.eventTypePaymentMethod,
  })
}

export async function loadEventTypePaymentMethod(
  supabase: { from: (table: string) => any },
  tenantId: string,
  eventTypeCode: string | null | undefined
): Promise<string | null> {
  const code = eventTypeCode?.trim()
  if (!tenantId || !code) return null
  const { data, error } = await supabase
    .from('event_types')
    .select('payment_method')
    .eq('tenant_id', tenantId)
    .eq('code', code)
    .maybeSingle()
  if (error) throw new InvalidEventTypePaymentMethodError(error.message)
  return parseEventTypePaymentMethod(data?.payment_method ?? null)
}

/** Copy a resolved method onto a new payment. Later setting changes do not read back. */
export function snapshotPaymentMethod(method: string): { payment_method: string } {
  return { payment_method: method }
}
