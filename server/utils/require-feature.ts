import { H3Event, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * Throws 403 if the tenant does not have the given feature flag enabled.
 * Use in API handlers after getAuthenticatedUser().
 */
export async function requireFeature(tenantId: string, featureKey: string): Promise<void> {
  const { data } = await getSupabaseAdmin()
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', tenantId)
    .eq('category', 'features')
    .eq('setting_key', featureKey)
    .single()

  if (!data) throw createError({ statusCode: 403, statusMessage: `Feature '${featureKey}' not enabled` })

  try {
    const parsed = JSON.parse(data.setting_value)
    if (!parsed.enabled) throw createError({ statusCode: 403, statusMessage: `Feature '${featureKey}' not enabled` })
  } catch (e: any) {
    if (e.statusCode === 403) throw e
    if (data.setting_value !== 'true') throw createError({ statusCode: 403, statusMessage: `Feature '${featureKey}' not enabled` })
  }
}
