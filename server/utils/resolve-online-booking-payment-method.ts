import {
  normalizeTenantPaymentMethod,
  parsePaymentSettings,
  resolveIndividualAppointmentInvoicePaymentsEnabled,
} from '~/server/utils/tenant-default-payment-method'
import { resolveAppointmentPaymentMethod } from '~/server/utils/resolve-appointment-payment-method'

/**
 * Public online booking payment methods, driven by tenant settings:
 *   - wallee  when the tenant has Wallee enabled (default)
 *   - invoice when individual_appointment_invoice_payments_enabled
 *     (falls back to legacy invoice_payments_enabled when the new key is absent)
 *   - cash    when cash is enabled AND visible to customers
 *
 * Staff-only cash must never land on a public booking just because the
 * client sent payment_method=cash.
 *
 * Explicit payment_method=invoice must fail closed when appointment invoices
 * are disabled — never silently rewrite to wallee/cash.
 */
export type OnlineBookingCheckoutMethod = 'wallee' | 'invoice' | 'cash'

const METHOD_ORDER: OnlineBookingCheckoutMethod[] = ['wallee', 'invoice', 'cash']

export const APPOINTMENT_INVOICE_PAYMENT_DISABLED_MESSAGE =
  'Rechnungszahlung ist für Einzeltermine derzeit nicht freigeschaltet. Bitte wähle eine andere Zahlungsart oder kontaktiere das Unternehmen.'

export type OnlineBookingPaymentPolicy = {
  walleeEnabled: boolean
  invoiceEnabled: boolean
  cashEnabledForCustomers: boolean
  defaultMethod: OnlineBookingCheckoutMethod
}

export function paymentPolicyFromTenantSettings(opts: {
  settings: Record<string, any>
  walleeEnabled?: boolean | null
}): OnlineBookingPaymentPolicy {
  const settings = opts.settings || {}
  return {
    walleeEnabled: opts.walleeEnabled !== false,
    invoiceEnabled: resolveIndividualAppointmentInvoicePaymentsEnabled(settings),
    cashEnabledForCustomers:
      settings.cash_payments_enabled !== false
      && settings.cash_payment_visibility === 'customers_and_staff',
    defaultMethod: normalizeTenantPaymentMethod(settings.default_payment_method),
  }
}

export function onlineBookingAllowedMethods(
  policy: OnlineBookingPaymentPolicy
): OnlineBookingCheckoutMethod[] {
  const allowed = METHOD_ORDER.filter((method) => {
    if (method === 'wallee') return policy.walleeEnabled
    if (method === 'invoice') return policy.invoiceEnabled
    return policy.cashEnabledForCustomers
  })
  return allowed.length > 0 ? allowed : ['wallee']
}

export function onlineBookingFallbackMethod(
  policy: OnlineBookingPaymentPolicy
): OnlineBookingCheckoutMethod {
  const allowed = onlineBookingAllowedMethods(policy)
  return allowed.includes(policy.defaultMethod) ? policy.defaultMethod : allowed[0]
}

/**
 * Default shown when the customer has not chosen a method.
 * Event-type override applies only when that method is already allowed
 * by the tenant public-booking policy. It never unlocks a disabled method.
 */
export function onlineBookingDefaultFromEventType(
  policy: OnlineBookingPaymentPolicy,
  eventTypePaymentMethod?: string | null
): OnlineBookingCheckoutMethod {
  const allowed = onlineBookingAllowedMethods(policy)
  const tenantFallback = onlineBookingFallbackMethod(policy)
  if (eventTypePaymentMethod == null || eventTypePaymentMethod === '') return tenantFallback
  try {
    const resolved = resolveAppointmentPaymentMethod({
      tenantDefaultPaymentMethod: policy.defaultMethod,
      eventTypePaymentMethod,
    })
    return allowed.includes(resolved) ? resolved : tenantFallback
  } catch {
    return tenantFallback
  }
}

export function resolveOnlineBookingPaymentMethod(opts: {
  requested?: string | null
  policy: OnlineBookingPaymentPolicy
  eventTypePaymentMethod?: string | null
}): {
  method: OnlineBookingCheckoutMethod
  rejectedRequest: boolean
  /** True when the client explicitly asked for invoice and it is not allowed. */
  invoiceRequestRejected: boolean
  allowed: OnlineBookingCheckoutMethod[]
} {
  const allowed = onlineBookingAllowedMethods(opts.policy)
  const fallback = onlineBookingDefaultFromEventType(opts.policy, opts.eventTypePaymentMethod)
  const requested = opts.requested
  if (
    requested === 'wallee'
    || requested === 'invoice'
    || requested === 'cash'
  ) {
    if (allowed.includes(requested)) {
      return {
        method: requested,
        rejectedRequest: false,
        invoiceRequestRejected: false,
        allowed,
      }
    }
    // Invoice-specific fail-closed: never silently substitute another method.
    if (requested === 'invoice') {
      return {
        method: fallback,
        rejectedRequest: true,
        invoiceRequestRejected: true,
        allowed,
      }
    }
    return {
      method: fallback,
      rejectedRequest: true,
      invoiceRequestRejected: false,
      allowed,
    }
  }
  return {
    method: fallback,
    rejectedRequest: false,
    invoiceRequestRejected: false,
    allowed,
  }
}

export function onlineBookingPaymentProvider(
  method: OnlineBookingCheckoutMethod
): 'wallee' | null {
  return method === 'wallee' ? 'wallee' : null
}

export async function loadOnlineBookingPaymentPolicy(
  supabase: { from: (table: string) => any },
  tenantId: string,
  walleeEnabled?: boolean | null
): Promise<OnlineBookingPaymentPolicy> {
  const { data } = await supabase
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', tenantId)
    .eq('category', 'payment')
    .eq('setting_key', 'payment_settings')
    .maybeSingle()

  return paymentPolicyFromTenantSettings({
    settings: parsePaymentSettings(data?.setting_value),
    walleeEnabled,
  })
}
