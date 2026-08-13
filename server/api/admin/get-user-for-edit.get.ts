import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Layer 1: Authentication — verify JWT via Supabase (never trust decoded payload alone)
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const supabase = getSupabaseAdmin()

    // Get requesting user's profile (to check role and tenant)
    const { data: requestingUser, error: reqUserError } = await supabase
      .from('users')
      .select('id, role, tenant_id, auth_user_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (reqUserError || !requestingUser) {
      logger.error('Requesting user profile not found:', reqUserError)
      throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
    }

    // Layer 4: Authorization - Only admin/staff/super_admin
    if (!['admin', 'staff', 'super_admin', 'tenant_admin'].includes(requestingUser.role)) {
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
    // Do NOT return onboarding_token — it is an account-takeover secret
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, category, birthdate, faberid, tenant_id, preferred_payment_method, role, auth_user_id, street, street_nr, zip, city, profession, company_id')
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
