/**
 * Tenant default VAT rate (%), e.g. 8.1 or 0.
 * Falls back to 0 when unset/invalid (CH driving schools are often exempt).
 */
export async function getTenantDefaultVatRate(
  supabase: { from: (table: string) => any },
  tenantId: string
): Promise<number> {
  const { data } = await supabase
    .from('tenants')
    .select('default_vat_rate')
    .eq('id', tenantId)
    .maybeSingle()

  const raw = Number((data as any)?.default_vat_rate)
  if (!Number.isFinite(raw) || raw < 0) return 0
  return raw
}

/** VAT amount in rappen from a net amount and percent rate (e.g. 8.1). */
export function computeVatAmountRappen(netRappen: number, vatRatePercent: number): number {
  const rate = Number(vatRatePercent)
  if (!Number.isFinite(rate) || rate <= 0) return 0
  const net = Number(netRappen) || 0
  return Math.round(net * rate / 100)
}
