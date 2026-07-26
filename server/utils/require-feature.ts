import { createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * Returns whether the tenant has the given feature flag enabled.
 */
export async function isFeatureEnabled(tenantId: string, featureKey: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', tenantId)
    .eq('category', 'features')
    .eq('setting_key', featureKey)
    .single()

  if (!data) return false

  try {
    const parsed = JSON.parse(data.setting_value)
    return parsed.enabled === true
  } catch {
    return data.setting_value === 'true'
  }
}

/**
 * Throws 403 if the tenant does not have the given feature flag enabled.
 * Use in API handlers after getAuthenticatedUser().
 */
export async function requireFeature(tenantId: string, featureKey: string): Promise<void> {
  if (!(await isFeatureEnabled(tenantId, featureKey))) {
    throw createError({ statusCode: 403, statusMessage: `Feature '${featureKey}' not enabled` })
  }
}
