/**
 * POST /api/sari/save-settings
 * Save SARI credentials for a tenant
 */

import { getSupabase } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
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

    // Get user profile to check role
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

    if (userProfile.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only admins can configure SARI settings'
      })
    }

    // 3. Get request body
    const body = await readBody(event)
    const {
      sari_enabled,
      sari_environment,
      sari_client_id,
      sari_client_secret,
      sari_username,
      sari_password
    } = body

    logger.debug('Saving SARI settings', {
      tenant_id: userProfile.tenant_id,
      sari_enabled,
      sari_environment
    })

    const updateData: Record<string, any> = { sari_enabled, sari_environment }

    // Only update credentials if provided
    if (sari_client_id) updateData.sari_client_id = sari_client_id
    if (sari_client_secret) updateData.sari_client_secret = sari_client_secret
    if (sari_username) updateData.sari_username = sari_username
    if (sari_password) updateData.sari_password = sari_password

    const { error: updateError } = await supabaseAdmin
      .from('tenants')
      .update(updateData)
      .eq('id', userProfile.tenant_id)

    if (updateError) {
      throw new Error(`Failed to update settings: ${updateError.message}`)
    }

    logger.debug('✅ SARI settings saved', {
      tenant_id: userProfile.tenant_id
    })

    return {
      success: true,
      message: 'SARI settings saved successfully',
      config: {
        sari_enabled,
        sari_environment
      }
    }
  } catch (error: any) {
    logger.error('Failed to save SARI settings', { error: error.message })

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Failed to save settings: ${error.message}`
    })
  }
})

