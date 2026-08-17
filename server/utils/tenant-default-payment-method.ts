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

export async function getTenantDefaultPaymentMethod(
  supabase: { from: (table: string) => any },
  tenantId: string
): Promise<TenantPaymentMethod> {
  const { data } = await supabase
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', tenantId)
    .eq('category', 'payment')
    .eq('setting_key', 'payment_settings')
    .maybeSingle()

  const settings = parsePaymentSettings(data?.setting_value)
  return normalizeTenantPaymentMethod(settings.default_payment_method)
}
