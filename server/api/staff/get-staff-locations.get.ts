/**
 * Get Staff Locations with Online Bookable Settings
 * 
 * PURPOSE:
 * Staff can see their assigned locations with online bookable settings
 * Used in Staff Settings page to manage which locations are available for online booking
 * 
 * USAGE:
 * GET /api/staff/get-staff-locations
 */

import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const authHeader = getHeader(event, 'authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const supabase = getSupabaseAdmin()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid authentication'
      })
    }

    logger.debug(`📍 Fetching staff locations for staff`, {
      staff_id: user.id
    })

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // Get staff locations with online bookable settings
    const { data: staffLocations, error: locError } = await supabase
      .from('staff_locations')
      .select(`
        id,
        staff_id,
        location_id,
        is_active,
        is_online_bookable,
        updated_at,
        locations:location_id (
          id,
          name,
          address,
          city,
          postal_code,
          public_bookable
        )
      `)
      .eq('staff_id', userProfile.id)
      .order('updated_at', { ascending: false })

    if (locError) {
      logger.error('❌ Error fetching staff locations:', locError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff locations'
      })
    }

    logger.debug(`✅ Staff locations fetched`, {
      count: staffLocations?.length || 0
    })

    return {
      success: true,
      data: staffLocations || []
    }

  } catch (error: any) {
    logger.error('❌ Error in get-staff-locations:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch staff locations'
    })
  }
})
