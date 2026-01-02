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
    logger.warn('🚫 Rate limit exceeded for get-staff-names from IP:', ipAddress)
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('❌ Supabase credentials not configured for get-staff-names API')
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

    // Get user's profile to determine tenant
    const { data: userProfile, error: userProfileError } = await serviceSupabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userProfileError || !userProfile) {
      logger.warn(`⚠️ User profile not found for auth_user_id: ${authUser.id}`)
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const tenantId = userProfile.tenant_id

    // Fetch all staff members for this tenant
    const { data: staff, error: staffError } = await serviceSupabase
      .from('users')
      .select('id, first_name, last_name, role')
      .eq('role', 'staff')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('first_name')

    if (staffError) {
      logger.error('❌ Error fetching staff:', staffError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch staff' })
    }

    logger.info(`✅ Fetched ${staff?.length || 0} staff members for tenant ${tenantId}`)
    return { success: true, data: staff || [] }

  } catch (error: any) {
    logger.error('❌ Error in get-staff-names API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

