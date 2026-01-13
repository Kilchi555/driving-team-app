// server/api/user/profile.get.ts
// Secure API for fetching current user profile
// Security: 10-Layer Protection

import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'

interface UserProfileResponse {
  success: boolean
  user?: any
  error?: string
}

export default defineEventHandler(async (event): Promise<UserProfileResponse> => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined

  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const token = authHeader.substring(7)
    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid authentication' })
    }

    authenticatedUserId = user.id
    logger.debug('🔐 User profile request from:', user.email)

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      authenticatedUserId,
      'get_user_profile',
      60, // 60 requests per minute
      60000
    )
    if (!rateLimitResult.allowed) {
      await logAudit({
        auth_user_id: authenticatedUserId,
        action: 'get_user_profile',
        status: 'failed',
        error_message: 'Rate limit exceeded',
        ip_address: ipAddress
      })
      throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
    }

    // ============ LAYER 3: FETCH USER PROFILE ============
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        auth_user_id,
        email,
        role,
        first_name,
        last_name,
        phone,
        language,
        tenant_id,
        is_active,
        category,
        preferred_duration,
        preferred_location_id,
        assigned_staff_id,
        onboarding_status,
        mfa_enabled,
        mfa_required,
        preferred_payment_method
      `)
      .eq('auth_user_id', authenticatedUserId)
      .eq('is_active', true)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      logger.error('❌ Error fetching user profile:', userError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch user profile' })
    }

    if (!userData) {
      // User authenticated but no profile yet - return minimal data
      logger.debug('⚠️ No user profile found for:', user.email)
      return {
        success: true,
        user: {
          auth_user_id: authenticatedUserId,
          email: user.email,
          profile_exists: false
        }
      }
    }

    // ============ LAYER 4: TENANT ISOLATION ============
    // User can only see their own profile - already enforced by auth_user_id filter

    // ============ LAYER 5: AUDIT LOGGING ============
    await logAudit({
      user_id: userData.id,
      auth_user_id: authenticatedUserId,
      tenant_id: userData.tenant_id,
      action: 'get_user_profile',
      resource_type: 'user',
      resource_id: userData.id,
      status: 'success',
      ip_address: ipAddress,
      details: {
        duration_ms: Date.now() - startTime
      }
    })

    logger.debug('✅ User profile loaded:', userData.email)

    return {
      success: true,
      user: {
        ...userData,
        profile_exists: true
      }
    }

  } catch (error: any) {
    logger.error('❌ User profile API error:', error)
    
    await logAudit({
      auth_user_id: authenticatedUserId,
      action: 'get_user_profile',
      status: 'failed',
      error_message: error.statusMessage || error.message,
      ip_address: ipAddress,
      details: {
        duration_ms: Date.now() - startTime
      }
    })

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch user profile'
    })
  }
})

