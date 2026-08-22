import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { isFeatureEnabled } from '~/server/utils/require-feature'

/**
 * Affiliate is active only when the paid feature is on AND the tenant
 * has not paused it in Admin → Affiliate (setting `enabled` !== 'false').
 * Missing `enabled` row defaults to on, matching /api/affiliate/admin-settings.
 */
export async function isTenantAffiliateProgramActive(tenantId: string): Promise<boolean> {
  if (!tenantId) return false

  const [featureOn, settingRes] = await Promise.all([
    isFeatureEnabled(tenantId, 'affiliate_enabled'),
    getSupabaseAdmin()
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'affiliate')
      .eq('setting_key', 'enabled')
      .maybeSingle(),
  ])

  if (!featureOn) return false
  return settingRes.data?.setting_value !== 'false'
}
