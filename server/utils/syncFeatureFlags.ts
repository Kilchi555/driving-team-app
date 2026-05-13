import { getSupabaseAdmin } from '~/utils/supabase'
import {
  resolveFeatureFlags,
  ALL_FEATURE_FLAGS,
  type SubscriptionPlan,
} from '~/utils/planFeatures'

export async function syncFeatureFlags(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  plan: SubscriptionPlan,
  addons: { courses?: boolean; affiliate?: boolean }
) {
  const enabledFlags = new Set(resolveFeatureFlags(plan, addons))

  const upserts = ALL_FEATURE_FLAGS.map(flag => ({
    tenant_id: tenantId,
    category: 'features',
    setting_key: flag,
    setting_value: JSON.stringify({ enabled: enabledFlags.has(flag) }),
  }))

  await supabase
    .from('tenant_settings')
    .upsert(upserts, { onConflict: 'tenant_id,setting_key' })
}
