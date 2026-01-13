// server/api/user/tenant.get.ts
// Secure API for fetching user's tenant_id (for consistency checks)
// Security: 10-Layer Protection

import { defineEventHandler, createError, getHeader, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'

interface UserTenantResponse {
  success: boolean
  tenant_id?: string | null
  user_id?: string
  error?: string
}

export default defineEventHandler(async (event): Promise<UserTenantResponse> => {
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

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      authenticatedUserId,
      'get_user_tenant',
      120, // 120 requests per minute (used for consistency checks)
      60000
    )
    if (!rateLimitResult.allowed) {
      throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
    }

    // ============ LAYER 3: QUERY PARAMS ============
    const query = getQuery(event)
    const email = query.email as string | undefined

    // ============ LAYER 4: FETCH USER'S TENANT ============
    let userQuery = supabaseAdmin
      .from('users')
      .select('id, tenant_id')
      .eq('is_active', true)

    // If email provided, use it (for consistency check)
    // Otherwise use auth_user_id
    if (email) {
      // Verify the email matches the authenticated user
      if (email !== user.email) {
        logger.warn('❌ Email mismatch in tenant lookup:', { requested: email, authenticated: user.email })
        throw createError({ statusCode: 403, statusMessage: 'Access denied' })
      }
      userQuery = userQuery.eq('email', email)
    } else {
      userQuery = userQuery.eq('auth_user_id', authenticatedUserId)
    }

    const { data: userData, error: userError } = await userQuery.single()

    if (userError && userError.code !== 'PGRST116') {
      logger.error('❌ Error fetching user tenant:', userError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch user tenant' })
    }

    if (!userData) {
      return {
        success: true,
        tenant_id: null,
        user_id: undefined
      }
    }

    // ============ LAYER 5: AUDIT LOGGING ============
    await logAudit({
      user_id: userData.id,
      auth_user_id: authenticatedUserId,
      tenant_id: userData.tenant_id,
      action: 'get_user_tenant',
      resource_type: 'user',
      resource_id: userData.id,
      status: 'success',
      ip_address: ipAddress,
      details: {
        duration_ms: Date.now() - startTime
      }
    })

    return {
      success: true,
      tenant_id: userData.tenant_id,
      user_id: userData.id
    }

  } catch (error: any) {
    logger.error('❌ User tenant API error:', error)
    
    await logAudit({
      auth_user_id: authenticatedUserId,
      action: 'get_user_tenant',
      status: 'failed',
      error_message: error.statusMessage || error.message,
      ip_address: ipAddress,
      details: {
        duration_ms: Date.now() - startTime
      }
    })

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch user tenant'
    })
  }
})

