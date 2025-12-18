/**
 * GET /api/sari/sync-status
 * Get sync status and history for the current tenant
 */

import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Get Supabase client (will use auth from cookies)
    const supabase = getSupabase()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get user profile
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    if (!['admin', 'staff'].includes(userProfile.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only admins and staff can view sync status'
      })
    }

    // 3. Get latest sync status
    const { data: latestSync } = await supabase
      .from('sari_sync_logs')
      .select('*')
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 4. Get sync history (last 10 syncs)
    const { data: syncHistory } = await supabase
      .from('sari_sync_logs')
      .select('id, operation, status, result, error_message, created_at')
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: false })
      .limit(10)

    // 5. Get tenant SARI config
    const { data: tenant } = await supabase
      .from('tenants')
      .select('sari_enabled, sari_environment, sari_last_sync_at')
      .eq('id', userProfile.tenant_id)
      .single()

    return {
      success: true,
      latest_sync: latestSync || null,
      sync_history: syncHistory || [],
      config: {
        sari_enabled: tenant?.sari_enabled || false,
        sari_environment: tenant?.sari_environment || 'test',
        last_sync_at: tenant?.sari_last_sync_at || null
      }
    }
  } catch (error: any) {
    logger.error('Failed to fetch SARI sync status', { error: error.message })

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch sync status: ${error.message}`
    })
  }
})

