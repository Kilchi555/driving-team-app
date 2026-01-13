import { defineEventHandler, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured')
    throw createError({ statusCode: 500, statusMessage: 'Server configuration error' })
  }

  try {
    // Get auth token from header
    const authHeader = getHeader(event, 'Authorization')
    const accessToken = authHeader?.split(' ')[1]

    if (!accessToken) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized: No access token provided' })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Verify access token and get user from Supabase Auth
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(accessToken)

    if (authError || !user) {
      logger.warn('🚫 Calendar token generation: Invalid access token or user not found', authError?.message)
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Invalid access token' })
    }

    // Get user profile from public.users table
    const { data: userProfile, error: profileError } = await serviceSupabase
      .from('users')
      .select('id, email, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      logger.error('❌ Calendar token generation: User profile not found for auth_user_id:', user.id, profileError?.message)
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    // Only staff and admin can generate calendar tokens
    if (!['staff', 'admin', 'super_admin'].includes(userProfile.role)) {
      logger.warn('🚫 Calendar token generation: User is not staff/admin', userProfile.role)
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Only staff can generate calendar tokens' })
    }

    logger.debug('🔐 Generating calendar token for staff:', userProfile.email)

    // Invalidate old token (if exists)
    try {
      const { error: invalidateError } = await serviceSupabase
        .from('calendar_tokens')
        .update({ is_active: false })
        .eq('staff_id', userProfile.id)
        .eq('is_active', true)

      if (invalidateError) {
        logger.warn('⚠️ Failed to invalidate old token:', invalidateError.message)
      } else {
        logger.debug(`ℹ️ Old calendar token invalidated for staff: ${userProfile.email}`)
      }
    } catch (invalidateErr) {
      console.warn('⚠️ Failed to invalidate old token (continuing):', invalidateErr)
    }

    // Generate random token (26 chars, alphanumeric)
    const calendarToken = Math.random()
      .toString(36)
      .substring(2, 15) +
      Math.random()
      .toString(36)
      .substring(2, 15)

    // Store new token in database
    const { error: insertError } = await serviceSupabase
      .from('calendar_tokens')
      .insert({
        staff_id: userProfile.id,
        token: calendarToken,
        is_active: true
      })

    if (insertError) {
      logger.error('❌ Error storing token:', insertError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate token'
      })
    }

    logger.info(`✅ New calendar token generated for staff: ${userProfile.email}`)

    const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://simy.ch'
    const calendarLink = `${baseUrl}/api/calendar/ics?token=${calendarToken}`

    return {
      success: true,
      token: calendarToken,
      calendarLink: calendarLink,
      message: 'New calendar token generated and previous token invalidated'
    }

  } catch (error: any) {
    console.error('❌ Calendar token generation error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'An unexpected error occurred'
    })
  }
})

