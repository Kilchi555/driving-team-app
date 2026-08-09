/**
 * Tenant default VAT rate (%), e.g. 8.1 or 0.
 * Falls back to 0 when unset/invalid (CH driving schools are often exempt).
 */

/** CH: Ausbildungsleistungen (MWSTG) — typically exempt → default 0%. */
export const CH_VAT_EXEMPT_EDUCATION_BUSINESS_TYPES = [
  'driving_school',
  'tutoring',
  'music_school',
] as const

export type ChVatExemptEducationBusinessType =
  (typeof CH_VAT_EXEMPT_EDUCATION_BUSINESS_TYPES)[number]

export function isChVatExemptEducationBusinessType(
  businessType: string | null | undefined,
): boolean {
  return !!businessType && (CH_VAT_EXEMPT_EDUCATION_BUSINESS_TYPES as readonly string[]).includes(businessType)
}

/** Suggested default VAT % for a new tenant by business type (Switzerland). */
export function defaultVatRateForBusinessType(businessType: string | null | undefined): number {
  return isChVatExemptEducationBusinessType(businessType) ? 0 : 8.1
}

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
