import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const userId = query.userId as string

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'userId query parameter is required'
      })
    }

    // LAYER 1: AUTHENTICATE USER
    const authenticatedUser = await getAuthenticatedUser(event)
    if (!authenticatedUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const supabase = getSupabaseAdmin()

    // LAYER 2: GET AUTHENTICATED USER FROM USERS TABLE
    const { data: requestingUser, error: requestingUserError } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_user_id', authenticatedUser.id)
      .single()

    if (requestingUserError || !requestingUser) {
      logger.warn('⚠️ Requesting user not found:', requestingUserError)
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // LAYER 3: LOAD TARGET USER
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, tenant_id, preferred_payment_method')
      .eq('id', userId)
      .eq('tenant_id', requestingUser.tenant_id)
      .single()

    if (targetUserError || !targetUser) {
      logger.debug('ℹ️ Target user not found or not in same tenant, returning default')
      return {
        success: true,
        preferred_payment_method: 'wallee'
      }
    }

    // LAYER 4: AUTHORIZATION - Only customers can read their own, staff/admins can read tenant members
    if (requestingUser.role === 'client') {
      // Customers can only read their own
      if (userId !== requestingUser.id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Not authorized to read this user payment method'
        })
      }
    } else if (!['staff', 'admin', 'tenant_admin'].includes(requestingUser.role)) {
      // Only staff/admins can read others
      throw createError({
        statusCode: 403,
        statusMessage: 'Only staff/admins can access this endpoint'
      })
    }

    logger.debug('✅ Payment method loaded for user:', {
      userId,
      method: targetUser.preferred_payment_method || 'wallee'
    })

    return {
      success: true,
      preferred_payment_method: targetUser.preferred_payment_method || 'wallee'
    }
  } catch (error: any) {
    logger.error('❌ Error loading payment method for user:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to load payment method'
    })
  }
})

