// server/api/features/list.get.ts
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { tenantId } = query

    if (!tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'tenantId is required'
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get all feature flags for tenant
    const { data, error } = await supabaseAdmin
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'features')
      .order('created_at')

    if (error) {
      console.error('Error fetching feature flags:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch feature flags'
      })
    }

    // Parse feature flags
    const features: Record<string, boolean> = {}
    const definitions: any[] = []

    data?.forEach(row => {
      try {
        // Parse JSON metadata
        const metadata = JSON.parse(row.setting_value)
        const isEnabled = metadata.enabled || false
        
        features[row.setting_key] = isEnabled
        
        if (metadata.displayName && metadata.description) {
          definitions.push({
            key: row.setting_key,
            displayName: metadata.displayName,
            description: metadata.description,
            icon: metadata.icon || '⚙️',
            sortOrder: metadata.sortOrder || 0,
            isEnabled
          })
        }
      } catch (e) {
        // Fallback for boolean values
        const isEnabled = row.setting_value === 'true'
        features[row.setting_key] = isEnabled
      }
    })

    return {
      success: true,
      features,
      definitions: definitions.sort((a, b) => a.sortOrder - b.sortOrder),
      total: Object.keys(features).length
    }

  } catch (error: any) {
    console.error('Feature list failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Feature list failed'
    })
  }
})
