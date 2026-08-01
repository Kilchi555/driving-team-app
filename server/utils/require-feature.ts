import { createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/** User-facing German copy for locked plan features (API 403). */
const FEATURE_LOCKED_MESSAGES: Record<string, string> = {
  affiliate_enabled:
    'Das Affiliate-System ist für deinen Plan nicht aktiv. Aktiviere es unter Abonnement / Upgrade.',
  gbp_enabled:
    'Google Business Profile ist für deinen Plan nicht aktiv. Aktiviere das Add-on unter Abonnement / Upgrade.',
  courses_enabled:
    'Die Kursbuchungsseite ist für deinen Plan nicht aktiv. Aktiviere sie unter Abonnement / Upgrade.',
}

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
    const message =
      FEATURE_LOCKED_MESSAGES[featureKey]
      ?? 'Diese Funktion ist für deinen Plan nicht freigeschaltet. Bitte prüfe dein Abonnement.'
    throw createError({
      statusCode: 403,
      statusMessage: message,
      data: { code: 'feature_not_enabled', feature: featureKey },
    })
  }
}
