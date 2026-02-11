// server/api/staff/get-location-bookable-status.get.ts
// Get staff location online bookable status
// Uses service role to bypass RLS

import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const authUser = await getAuthenticatedUser(event)
    
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Get user profile to get actual user ID (not auth_user_id)
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get user profile
    const { data: userProfile, error: userError } = await serviceSupabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      logger.error('❌ User profile not found:', userError)
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // Get staff_locations for this user
    const { data: staffLocations, error: staffLocError } = await serviceSupabase
      .from('staff_locations')
      .select('location_id, is_online_bookable')
      .eq('staff_id', userProfile.id)

    if (staffLocError) {
      logger.error('❌ Error loading staff_locations:', staffLocError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load staff locations'
      })
    }

    logger.debug('✅ Loaded staff_locations:', staffLocations?.length || 0)

    return {
      success: true,
      staff_locations: staffLocations || []
    }

  } catch (err: any) {
    logger.error('❌ Error in get-location-bookable-status:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to get location bookable status'
    })
  }
})
