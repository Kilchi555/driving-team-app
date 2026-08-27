import { getSupabaseAdmin } from '~/utils/supabase'
import {
  resolveFeatureFlags,
  ALL_FEATURE_FLAGS,
  type SubscriptionPlan,
} from '~/utils/planFeatures'
import {
  FEATURE_CATALOG,
  NON_DRIVING_SCHOOL_DEFAULT_OFF,
  ADMIN_PRESERVED_FEATURE_FLAGS,
  resolveSyncedFeatureEnabled,
} from '~/utils/featureCatalog'

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

  const keysToPreserve = [
    ...ADMIN_PRESERVED_FEATURE_FLAGS,
    ...(!isDrivingSchool ? NON_DRIVING_SCHOOL_DEFAULT_OFF : []),
  ]

  const preserved = new Map<string, boolean>()
  if (keysToPreserve.length > 0) {
    const { data: existingRows } = await supabase
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'features')
      .in('setting_key', keysToPreserve)

    for (const row of existingRows || []) {
      const enabled = parseEnabled(row.setting_value)
      if (enabled !== null) preserved.set(row.setting_key, enabled)
    }
  }

  const upserts = ALL_FEATURE_FLAGS.map(flag => {
    const enabled = resolveSyncedFeatureEnabled({
      flag,
      planEnables: enabledFlags.has(flag),
      isDrivingSchool,
      existing: preserved.has(flag) ? preserved.get(flag) : undefined,
    })

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
