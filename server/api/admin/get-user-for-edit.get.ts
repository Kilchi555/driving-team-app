import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'

export default defineEventHandler(async (event) => {
  try {
    // Layer 1: Authentication
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    // Use admin client which already has correct credentials
    const supabase = getSupabaseAdmin()
    
    const token = authHeader.replace('Bearer ', '')
    
    // Extract user_id from JWT token
    let requestingUserId: string | null = null
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        // Pad base64 string if necessary
        let padded = parts[1]
        padded += '='.repeat((4 - padded.length % 4) % 4)
        const decoded = JSON.parse(Buffer.from(padded, 'base64').toString())
        requestingUserId = decoded.sub
      }
    } catch (e) {
      logger.warn('Failed to parse JWT token:', e)
    }
    
    if (!requestingUserId) {
      logger.error('Could not extract user ID from token')
      throw createError({ statusCode: 401, statusMessage: 'Invalid token format' })
    }

    // Get requesting user's profile (to check role and tenant)
    const { data: requestingUser, error: reqUserError } = await supabase
      .from('users')
      .select('id, role, tenant_id, auth_user_id')
      .eq('auth_user_id', requestingUserId)
      .single()

    if (reqUserError || !requestingUser) {
      logger.error('Requesting user profile not found:', reqUserError)
      throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
    }

    // Layer 4: Authorization - Only admin/staff/superadmin
    if (!['admin', 'staff', 'superadmin'].includes(requestingUser.role)) {
      logger.warn(`Insufficient permissions for role: ${requestingUser.role}`)
      throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' })
    }

    // Get query parameter
    const userId = getQuery(event).user_id as string
    if (!userId) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Missing required query parameter: user_id' 
      })
    }

    // Layer 4: Ownership - User must be in same tenant
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, category, birthdate, faberid, tenant_id, preferred_payment_method, role')
      .eq('id', userId)
      .eq('tenant_id', requestingUser.tenant_id)
      .single()

    if (targetError || !targetUser) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    // Audit logging
    await logAudit({
      user_id: requestingUser.id,
      action: 'admin_load_user_for_edit',
      resource_type: 'user',
      resource_id: userId,
      status: 'success',
      ip_address: getClientIP(event),
    })

    return {
      success: true,
      user: targetUser
    }

  } catch (error: any) {
    logger.error('Error in get-user-for-edit API:', error)
    
    if (error.statusCode && error.statusMessage) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch user'
    })
  }
})
