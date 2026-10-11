export type TenantPaymentMethod = 'wallee' | 'cash' | 'invoice'

/** Legacy tenant-wide public invoice opt-in (fallback only when a new key is absent). */
export const LEGACY_INVOICE_PAYMENTS_KEY = 'invoice_payments_enabled'

/** Public course enrollment invoice opt-in. */
export const COURSE_INVOICE_PAYMENTS_KEY = 'course_invoice_payments_enabled'

/** Public individual-appointment booking invoice opt-in. */
export const APPOINTMENT_INVOICE_PAYMENTS_KEY = 'individual_appointment_invoice_payments_enabled'

export function normalizeTenantPaymentMethod(value: unknown): TenantPaymentMethod {
  if (value === 'cash' || value === 'invoice' || value === 'wallee') return value
  if (value === 'twint' || value === 'online') return 'wallee'
  return 'wallee'
}

export function parsePaymentSettings(raw: unknown): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  if (typeof raw === 'object') return raw as Record<string, any>
  return {}
}

/**
 * True when `key` is explicitly present (including `false`).
 * Missing / null / undefined → not explicit → caller falls back to legacy.
 * Do not treat a missing new key as false.
 */
export function hasExplicitPaymentSetting(
  settings: Record<string, any> | null | undefined,
  key: string
): boolean {
  if (!settings || typeof settings !== 'object') return false
  if (!Object.prototype.hasOwnProperty.call(settings, key)) return false
  const value = settings[key]
  return value !== null && value !== undefined
}

function resolveScopedInvoicePaymentsEnabled(
  settings: Record<string, any> | null | undefined,
  scopedKey: string
): boolean {
  if (hasExplicitPaymentSetting(settings, scopedKey)) {
    return settings![scopedKey] === true
  }
  return settings?.[LEGACY_INVOICE_PAYMENTS_KEY] === true
}

/**
 * Public COURSE enrollment invoice option.
 * Explicit course key wins; otherwise legacy invoice_payments_enabled.
 */
export function resolveCourseInvoicePaymentsEnabled(
  settings: Record<string, any> | null | undefined
): boolean {
  return resolveScopedInvoicePaymentsEnabled(settings, COURSE_INVOICE_PAYMENTS_KEY)
}

/**
 * Public INDIVIDUAL APPOINTMENT booking invoice option.
 * Explicit appointment key wins; otherwise legacy invoice_payments_enabled.
 */
export function resolveIndividualAppointmentInvoicePaymentsEnabled(
  settings: Record<string, any> | null | undefined
): boolean {
  return resolveScopedInvoicePaymentsEnabled(settings, APPOINTMENT_INVOICE_PAYMENTS_KEY)
}

async function loadTenantPaymentSettings(
  supabase: { from: (table: string) => any },
  tenantId: string
): Promise<Record<string, any>> {
  const { data } = await supabase
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', tenantId)
    .eq('category', 'payment')
    .eq('setting_key', 'payment_settings')
    .maybeSingle()

  return parsePaymentSettings(data?.setting_value)
}

export async function getTenantDefaultPaymentMethod(
  supabase: { from: (table: string) => any },
  tenantId: string
): Promise<TenantPaymentMethod> {
  const settings = await loadTenantPaymentSettings(supabase, tenantId)
  return normalizeTenantPaymentMethod(settings.default_payment_method)
}

/** @deprecated Prefer resolveCourseInvoicePaymentsEnabled / resolveIndividualAppointmentInvoicePaymentsEnabled. Legacy raw flag only. */
export async function getTenantInvoicePaymentsEnabled(
  supabase: { from: (table: string) => any },
  tenantId: string
): Promise<boolean> {
  const settings = await loadTenantPaymentSettings(supabase, tenantId)
  return settings[LEGACY_INVOICE_PAYMENTS_KEY] === true
}

export async function getTenantCourseInvoicePaymentsEnabled(
  supabase: { from: (table: string) => any },
  tenantId: string
): Promise<boolean> {
  const settings = await loadTenantPaymentSettings(supabase, tenantId)
  return resolveCourseInvoicePaymentsEnabled(settings)
}

export async function getTenantAppointmentInvoicePaymentsEnabled(
  supabase: { from: (table: string) => any },
  tenantId: string
): Promise<boolean> {
  const settings = await loadTenantPaymentSettings(supabase, tenantId)
  return resolveIndividualAppointmentInvoicePaymentsEnabled(settings)
}
