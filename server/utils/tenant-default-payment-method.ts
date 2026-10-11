export type TenantPaymentMethod = 'wallee' | 'cash' | 'invoice'

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

/** Tenant opt-in for Rechnung as a course/booking payment method. Off by default. */
export async function getTenantInvoicePaymentsEnabled(
  supabase: { from: (table: string) => any },
  tenantId: string
): Promise<boolean> {
  const settings = await loadTenantPaymentSettings(supabase, tenantId)
  return settings.invoice_payments_enabled === true
}
