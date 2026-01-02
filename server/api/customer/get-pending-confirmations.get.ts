import { defineEventHandler, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  // Get client IP for rate limiting
  const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                    getHeader(event, 'x-real-ip') || 
                    event.node.req.socket.remoteAddress || 
                    'unknown'
  
  // Apply rate limiting: 30 requests per minute per IP
  const rateLimit = await checkRateLimit(ipAddress, 'register', 30, 60 * 1000)
  if (!rateLimit.allowed) {
    logger.warn('🚫 Rate limit exceeded for get-pending-confirmations from IP:', ipAddress)
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('❌ Supabase credentials not configured for get-pending-confirmations API')
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error'
    })
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Get authenticated user
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // Get user's profile
    const { data: userProfile, error: userProfileError } = await serviceSupabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userProfileError || !userProfile) {
      logger.warn(`⚠️ User profile not found for auth_user_id: ${authUser.id}`)
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    // Only customers (role: 'client') can use this endpoint
    if (userProfile.role !== 'client') {
      logger.warn(`🚫 User ${authUser.id} with role ${userProfile.role} attempted to access pending confirmations.`)
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Only customers can access this endpoint' })
    }

    // Fetch pending confirmation appointments with staff data
    const { data: confirmationsData, error: confirmationsError } = await serviceSupabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        status,
        confirmation_token,
        type,
        event_type_code,
        staff:users!appointments_staff_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .eq('user_id', userProfile.id)
      .eq('status', 'pending_confirmation')
      .eq('tenant_id', userProfile.tenant_id)
      .not('confirmation_token', 'is', null)
      .order('start_time', { ascending: true })

    if (confirmationsError) {
      logger.error('❌ Error fetching pending confirmations:', confirmationsError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch pending confirmations' })
    }

    logger.info(`✅ Fetched ${confirmationsData?.length || 0} pending confirmations for customer ${userProfile.id}`)
    return { success: true, data: confirmationsData || [] }

  } catch (error: any) {
    logger.error('❌ Error in get-pending-confirmations API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

