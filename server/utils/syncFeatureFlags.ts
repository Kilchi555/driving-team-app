import { getSupabaseAdmin } from '~/utils/supabase'
import {
  resolveFeatureFlags,
  ALL_FEATURE_FLAGS,
  type SubscriptionPlan,
} from '~/utils/planFeatures'
import { FEATURE_CATALOG, NON_DRIVING_SCHOOL_DEFAULT_OFF } from '~/utils/featureCatalog'

function parseEnabled(settingValue: string | null | undefined): boolean | null {
  if (!settingValue) return null
  try {
    const parsed = JSON.parse(settingValue)
    if (typeof parsed.enabled === 'boolean') return parsed.enabled
  } catch {
    if (settingValue === 'true') return true
    if (settingValue === 'false') return false
  }
  return null
}

export async function syncFeatureFlags(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  plan: SubscriptionPlan,
  addons: { courses?: boolean; affiliate?: boolean; gbp?: boolean }
) {
  const enabledFlags = new Set(resolveFeatureFlags(plan, addons))

  const { data: tenant } = await supabase
    .from('tenants')
    .select('business_type')
    .eq('id', tenantId)
    .maybeSingle()

  const isDrivingSchool = (tenant?.business_type || 'driving_school') === 'driving_school'

  // Preserve manual opt-in for documentation/exams on non-driving tenants
  // (plan sync must not force-enable OR wipe these).
  const preserved = new Map<string, boolean>()
  if (!isDrivingSchool) {
    const { data: existingRows } = await supabase
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'features')
      .in('setting_key', [...NON_DRIVING_SCHOOL_DEFAULT_OFF])

    for (const row of existingRows || []) {
      const enabled = parseEnabled(row.setting_value)
      if (enabled !== null) preserved.set(row.setting_key, enabled)
    }
  }

  const upserts = ALL_FEATURE_FLAGS.map(flag => {
    let enabled = enabledFlags.has(flag)
    if (!isDrivingSchool && NON_DRIVING_SCHOOL_DEFAULT_OFF.has(flag)) {
      enabled = preserved.get(flag) ?? false
    }

    const catalog = FEATURE_CATALOG[flag]
    const setting_value = catalog
      ? JSON.stringify({
          enabled,
          displayName: catalog.displayName,
          description: catalog.description,
          icon: catalog.icon,
          sortOrder: catalog.sortOrder
        })
      : JSON.stringify({ enabled })

    return {
      tenant_id: tenantId,
      category: 'features',
      setting_key: flag,
      setting_value,
    }
  })

  await supabase
    .from('tenant_settings')
    .upsert(upserts, { onConflict: 'tenant_id,setting_key' })
}
