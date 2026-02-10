/**
 * Get Staff Locations for Frontend Filtering (Public)
 * 
 * PURPOSE:
 * Public API for the booking page to fetch staff_locations with is_online_bookable status
 * Used by frontend as a security layer to filter slots client-side
 * 
 * USAGE:
 * POST /api/staff/get-staff-locations
 * Body: {
 *   staff_ids: ["uuid1", "uuid2"]
 * }
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

interface GetStaffLocationsRequest {
  staff_ids: string[]
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as GetStaffLocationsRequest
    const { staff_ids } = body

    if (!staff_ids || !Array.isArray(staff_ids) || staff_ids.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'staff_ids array is required'
      })
    }

    logger.debug('📍 Fetching staff_locations for filtering', {
      staff_count: staff_ids.length
    })

    const supabase = getSupabaseAdmin()

    // Fetch staff_locations with is_online_bookable status
    const { data: staffLocations, error: slError } = await supabase
      .from('staff_locations')
      .select('staff_id, location_id, is_online_bookable')
      .in('staff_id', staff_ids)
      .eq('is_active', true)

    if (slError) {
      logger.error('❌ Error fetching staff_locations:', slError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff locations'
      })
    }

    logger.debug('✅ Staff locations fetched', {
      staff_count: staff_ids.length,
      location_entries: staffLocations?.length || 0
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
