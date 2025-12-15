import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Generate a calendar subscription token for the current staff member
 * Returns a token that can be used to access their calendar feed privately
 */
export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error'
    })
  }

  try {
    // Get auth token from header
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.substring(7)
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Get current user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser()
    if (userError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Could not verify user'
      })
    }

    logger.debug(`🔑 Generating calendar token for user: ${user.id}`)

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get user profile to verify they're staff
    const { data: userProfile, error: profileError } = await serviceSupabase
      .from('users')
      .select('id, email, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // Check if user is staff (only staff can have calendar tokens)
    if (!['admin', 'staff'].includes(userProfile.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only staff members can generate calendar tokens'
      })
    }

    logger.debug(`✅ User is staff: ${userProfile.role}`)

    // Generate random token (32 chars, alphanumeric)
    const calendarToken = Math.random()
      .toString(36)
      .substring(2, 15) + 
      Math.random()
        .toString(36)
        .substring(2, 15)

    // Check if token already exists
    const { data: existingToken, error: existingError } = await serviceSupabase
      .from('calendar_tokens')
      .select('token')
      .eq('staff_id', userProfile.id)
      .eq('is_active', true)
      .single()

    if (existingToken && !existingError) {
      // Return existing token
      logger.debug(`ℹ️ Using existing token for staff: ${userProfile.email}`)
      
      const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://simy.ch'
      const calendarLink = `${baseUrl}/api/calendar/ics?token=${existingToken.token}`

      return {
        success: true,
        token: existingToken.token,
        calendarLink: calendarLink,
        message: 'Existing token returned'
      }
    }

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

    logger.info(`✅ Calendar token generated for staff: ${userProfile.email}`)

    const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://simy.ch'
    const calendarLink = `${baseUrl}/api/calendar/ics?token=${calendarToken}`

    return {
      success: true,
      token: calendarToken,
      calendarLink: calendarLink,
      message: 'Calendar token generated successfully'
    }
  } catch (error: any) {
    console.error('Error generating calendar token:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate calendar token'
    })
  }
})

