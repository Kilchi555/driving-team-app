import {
  getTerminologyDefaults,
  mergeTerminology,
  eventTypeLabelMap,
  resolveEventTypeLabel,
  type Terminology,
} from '~/composables/useTerminology'

export { eventTypeLabelMap, resolveEventTypeLabel }
export type { Terminology }

type SupabaseLike = {
  from: (table: string) => any
}

/**
 * Resolve terminology for a tenant: business_type + optional preset ui_labels.
 * Safe default is driving_school when tenant/preset is missing.
 */
export async function getTenantTerminology(
  supabase: SupabaseLike,
  tenantId: string | null | undefined,
): Promise<Terminology> {
  if (!tenantId) return getTerminologyDefaults('driving_school')

  try {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', tenantId)
      .maybeSingle()

    const businessType = tenant?.business_type || 'driving_school'
    let uiLabels: Record<string, string> | null = null

    const { data: preset } = await supabase
      .from('business_type_presets')
      .select('ui_labels')
      .eq('business_type_code', businessType)
      .maybeSingle()

    if (preset?.ui_labels && typeof preset.ui_labels === 'object') {
      uiLabels = preset.ui_labels as Record<string, string>
    }

    return mergeTerminology(businessType, uiLabels)
  } catch {
    return getTerminologyDefaults('driving_school')
  }
}

/**
 * Resolve terminology when business_type (and optional ui_labels) are already loaded.
 */
export function terminologyFromTenant(tenant: {
  business_type?: string | null
  ui_labels?: Record<string, string> | null
} | null | undefined): Terminology {
  return mergeTerminology(tenant?.business_type, tenant?.ui_labels)
}

/** e.g. "1 Beratung" / "3 Beratungen" — never throws. */
export function appointmentCountLabel(terms: Terminology | null | undefined, count: number): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  const singular = terms?.appointment || 'Fahrstunde'
  const plural = terms?.appointmentsPlural || 'Fahrstunden'
  return `${n} ${n === 1 ? singular : plural}`
}
