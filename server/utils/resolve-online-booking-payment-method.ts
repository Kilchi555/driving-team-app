import {
  normalizeTenantPaymentMethod,
  parsePaymentSettings,
} from '~/server/utils/tenant-default-payment-method'

/**
 * Public online booking payment methods, driven by tenant settings:
 *   - wallee  when the tenant has Wallee enabled (default)
 *   - invoice when invoice_payments_enabled
 *   - cash    when cash is enabled AND visible to customers
 *
 * Customer *choice* is still gated (staff-only cash cannot be selected).
 * The implicit default always follows tenant_settings.default_payment_method,
 * so a school like Sara (Wallee off, default cash) does not get wallee.
 */
export type OnlineBookingCheckoutMethod = 'wallee' | 'invoice' | 'cash'

const METHOD_ORDER: OnlineBookingCheckoutMethod[] = ['wallee', 'invoice', 'cash']

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
    invoiceEnabled: settings.invoice_payments_enabled === true,
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
  return allowed
}

export function onlineBookingFallbackMethod(
  policy: OnlineBookingPaymentPolicy
): OnlineBookingCheckoutMethod {
  return policy.defaultMethod
}

export function resolveOnlineBookingPaymentMethod(opts: {
  requested?: string | null
  policy: OnlineBookingPaymentPolicy
}): {
  method: OnlineBookingCheckoutMethod
  rejectedRequest: boolean
  allowed: OnlineBookingCheckoutMethod[]
} {
  const allowed = onlineBookingAllowedMethods(opts.policy)
  const fallback = onlineBookingFallbackMethod(opts.policy)
  const requested = opts.requested
  if (
    requested === 'wallee'
    || requested === 'invoice'
    || requested === 'cash'
  ) {
    if (allowed.includes(requested) || requested === fallback) {
      return { method: requested, rejectedRequest: false, allowed }
    }
    return { method: fallback, rejectedRequest: true, allowed }
  }
  return { method: fallback, rejectedRequest: false, allowed }
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
