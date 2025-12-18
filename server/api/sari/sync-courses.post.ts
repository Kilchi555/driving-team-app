/**
 * POST /api/sari/sync-courses
 * Trigger course sync for a specific course type (VKU or PGS)
 */

import { getSupabase } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient } from '~/utils/sariClient'
import { SARISyncEngine } from '~/server/utils/sari-sync-engine'
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

    // Get user profile and tenant
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
        statusMessage: 'Only admins and staff can trigger sync'
      })
    }

    // 3. Get request body
    const body = await readBody(event)
    const { courseType } = body

    if (!['VKU', 'PGS'].includes(courseType)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'courseType must be VKU or PGS'
      })
    }

    logger.debug('Starting SARI course sync', {
      tenant_id: userProfile.tenant_id,
      course_type: courseType,
      user_id: user.id
    })

    // 4. Get tenant SARI config
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select(
        'id, sari_enabled, sari_environment, sari_client_id, sari_client_secret, sari_username, sari_password'
      )
      .eq('id', userProfile.tenant_id)
      .single()

    if (!tenant) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant not found'
      })
    }

    if (!tenant.sari_enabled) {
      throw createError({
        statusCode: 400,
        statusMessage: 'SARI is not enabled for this tenant'
      })
    }

    if (
      !tenant.sari_client_id ||
      !tenant.sari_client_secret ||
      !tenant.sari_username ||
      !tenant.sari_password
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: 'SARI credentials not configured for this tenant'
      })
    }

    // 5. Create SARI client
    const sari = new SARIClient({
      environment: (tenant.sari_environment || 'test') as 'test' | 'production',
      clientId: tenant.sari_client_id,
      clientSecret: tenant.sari_client_secret,
      username: tenant.sari_username,
      password: tenant.sari_password
    })

    // 6. Create sync engine and sync courses
    const syncEngine = new SARISyncEngine(
      supabaseAdmin,
      sari,
      userProfile.tenant_id
    )

    const result = await syncEngine.syncAllCourses(
      courseType as 'VKU' | 'PGS'
    )

    // 8. Update tenant last sync time
    await supabaseAdmin
      .from('tenants')
      .update({ sari_last_sync_at: new Date().toISOString() })
      .eq('id', userProfile.tenant_id)

    logger.debug('✅ SARI course sync completed', {
      tenant_id: userProfile.tenant_id,
      result
    })

    return {
      success: result.success,
      message: `Synced ${result.synced_count} courses`,
      operation: result.operation,
      status: result.status,
      synced_count: result.synced_count,
      error_count: result.error_count,
      errors: result.errors,
      metadata: result.metadata
    }
  } catch (error: any) {
    logger.error('SARI course sync failed', { error: error.message })

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Sync failed: ${error.message}`
    })
  }
})

