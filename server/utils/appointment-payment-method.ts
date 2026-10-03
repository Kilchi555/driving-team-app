import {
  normalizeTenantPaymentMethod,
  type TenantPaymentMethod,
} from '~/server/utils/tenant-default-payment-method'
import {
  onlineBookingAllowedMethods,
  resolveOnlineBookingPaymentMethod,
  type OnlineBookingCheckoutMethod,
  type OnlineBookingPaymentPolicy,
} from '~/server/utils/resolve-online-booking-payment-method'

/** Methods an event type may store. NULL is inherit, not a member of this list. */
export const EVENT_TYPE_PAYMENT_METHODS = ['wallee', 'cash', 'invoice'] as const
export type EventTypePaymentMethod = (typeof EVENT_TYPE_PAYMENT_METHODS)[number]

/** Methods staff may write onto a new or edited appointment payment. credit stays an action, not a default. */
export const STAFF_PAYMENT_METHODS = ['wallee', 'cash', 'invoice', 'credit'] as const
export type StaffPaymentMethod = (typeof STAFF_PAYMENT_METHODS)[number]

export class InvalidEventTypePaymentMethodError extends Error {
  readonly code = 'INVALID_EVENT_TYPE_PAYMENT_METHOD'
  constructor(readonly value: unknown) {
    super('Invalid event type payment method')
    this.name = 'InvalidEventTypePaymentMethodError'
  }
}

export class InvalidStaffPaymentMethodError extends Error {
  readonly code = 'INVALID_STAFF_PAYMENT_METHOD'
  constructor(readonly value: unknown) {
    super('Invalid staff payment method')
    this.name = 'InvalidStaffPaymentMethodError'
  }
}

const STAFF_METHOD_ALIASES: Record<string, StaffPaymentMethod> = {
  wallee: 'wallee',
  online: 'wallee',
  twint: 'wallee',
  card: 'wallee',
  'credit-card': 'wallee',
  cash: 'cash',
  bar: 'cash',
  invoice: 'invoice',
  rechnung: 'invoice',
  credit: 'credit',
}

/**
 * Event-type column parser.
 * null / '' = inherit. credit and any other value are rejected.
 */
export function parseEventTypePaymentMethod(value: unknown): EventTypePaymentMethod | null {
  if (value == null || value === '') return null
  if (value === 'wallee' || value === 'cash' || value === 'invoice') return value
  throw new InvalidEventTypePaymentMethodError(value)
}

/**
 * Tenant default, then event-type override.
 * Invalid tenant values keep the existing wallee fallback.
 * Invalid event-type values throw.
 */
export function resolveAppointmentPaymentMethod(
  tenantDefault: unknown,
  eventTypePaymentMethod: unknown
): TenantPaymentMethod {
  const override = parseEventTypePaymentMethod(eventTypePaymentMethod)
  if (override) return override
  return normalizeTenantPaymentMethod(tenantDefault)
}

export type StaffPaymentChoice =
  | { kind: 'inherit' }
  | { kind: 'omit' }
  | { kind: 'explicit'; method: StaffPaymentMethod }

/**
 * Empty on create = inherit the hierarchy.
 * Empty on edit = leave the stored snapshot alone.
 * Unknown values are invalid. They are not coerced to wallee.
 */
export function classifyStaffPaymentChoice(raw: unknown, mode: 'create' | 'edit'): StaffPaymentChoice {
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
    return mode === 'create' ? { kind: 'inherit' } : { kind: 'omit' }
  }
  const key = String(raw).trim().toLowerCase()
  const method = STAFF_METHOD_ALIASES[key]
  if (!method) {
    throw new InvalidStaffPaymentMethodError(raw)
  }
  return { kind: 'explicit', method }
}

export type EventTypePaymentRow = {
  tenant_id: string
  code: string
  payment_method: unknown
}

export async function loadEventTypePaymentMethod(
  supabase: { from: (table: string) => any },
  tenantId: string,
  eventTypeCode: string | null | undefined
): Promise<unknown> {
  if (!tenantId || !eventTypeCode) return null
  const { data, error } = await supabase
    .from('event_types')
    .select('tenant_id, code, payment_method')
    .eq('tenant_id', tenantId)
    .eq('code', eventTypeCode)
    .maybeSingle()
  if (error) throw error
  return eventTypePaymentMethodForTenant(data ? [data] : [], tenantId, eventTypeCode)
}

/** Only the caller's tenant row counts. A foreign tenant's code is not a match. */
export function eventTypePaymentMethodForTenant(
  rows: EventTypePaymentRow[],
  tenantId: string,
  eventTypeCode: string | null | undefined
): unknown {
  if (!tenantId || !eventTypeCode) return null
  const row = rows.find((candidate) => candidate.tenant_id === tenantId && candidate.code === eventTypeCode)
  return row ? row.payment_method : null
}

/**
 * Public booking: event-type override replaces the tenant default only when
 * that method is already allowed for customers. It never widens the allowlist.
 * A customer request still has to be in the allowlist.
 */
export function resolvePublicAppointmentPaymentMethod(opts: {
  tenantDefault: unknown
  eventTypePaymentMethod: unknown
  requested?: string | null
  policy: OnlineBookingPaymentPolicy
}): {
  method: OnlineBookingCheckoutMethod
  rejectedRequest: boolean
  allowed: OnlineBookingCheckoutMethod[]
} {
  const hierarchyMethod = resolveAppointmentPaymentMethod(opts.tenantDefault, opts.eventTypePaymentMethod)
  const allowed = onlineBookingAllowedMethods(opts.policy)
  const defaultMethod = allowed.includes(hierarchyMethod) ? hierarchyMethod : opts.policy.defaultMethod
  return resolveOnlineBookingPaymentMethod({
    requested: opts.requested,
    policy: { ...opts.policy, defaultMethod },
  })
}
