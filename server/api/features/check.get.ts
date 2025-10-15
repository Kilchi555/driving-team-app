// server/api/features/check.get.ts
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { tenantId, featureKey } = query

    if (!tenantId || !featureKey) {
      throw createError({
        statusCode: 400,
        statusMessage: 'tenantId and featureKey are required'
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Check feature flag from database
    const { data, error } = await supabaseAdmin
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'features')
      .eq('setting_key', featureKey)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking feature flag:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to check feature flag'
      })
    }

    // If no data found, feature is disabled
    if (!data) {
      return {
        enabled: false,
        message: `Feature ${featureKey} not found or disabled`
      }
    }

    try {
      // Parse JSON metadata
      const metadata = JSON.parse(data.setting_value)
      const isEnabled = metadata.enabled || false

      return {
        enabled: isEnabled,
        metadata: metadata,
        message: isEnabled ? `Feature ${featureKey} is enabled` : `Feature ${featureKey} is disabled`
      }
    } catch (parseError) {
      // Fallback for boolean values
      const isEnabled = data.setting_value === 'true'
      
      return {
        enabled: isEnabled,
        metadata: { enabled: isEnabled },
        message: isEnabled ? `Feature ${featureKey} is enabled` : `Feature ${featureKey} is disabled`
      }
    }

  } catch (error: any) {
    console.error('Feature check failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Feature check failed'
    })
  }
})
