/**
 * Update Staff Location Online Bookable Status
 * 
 * PURPOSE:
 * Staff can toggle whether a location is available for online booking
 * 
 * USAGE:
 * POST /api/staff/update-location-booking
 * Body: {
 *   location_id: "uuid",
 *   is_online_bookable: true/false
 * }
 */

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

interface UpdateLocationBookingRequest {
  location_id: string
  is_online_bookable: boolean
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as UpdateLocationBookingRequest
    const { location_id, is_online_bookable } = body

    if (!location_id || is_online_bookable === undefined) {
      throw createError({
        statusCode: 400,
        statusMessage: 'location_id and is_online_bookable are required'
      })
    }

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

    logger.debug(`📍 Updating location booking status for staff`, {
      staff_id: user.id,
      location_id,
      is_online_bookable
    })

    // Get user profile to find staff_id
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

    // Verify staff owns this location or create entry if it doesn't exist
    let { data: staffLocation, error: staffLocError } = await supabase
      .from('staff_locations')
      .select('id')
      .eq('staff_id', userProfile.id)
      .eq('location_id', location_id)
      .single()

    // If staff_locations entry doesn't exist, verify location is assigned to staff in locations table
    if (staffLocError || !staffLocation) {
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('staff_ids')
        .eq('id', location_id)
        .eq('tenant_id', userProfile.tenant_id)
        .single()

      if (locationError || !locationData) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Location not found or you do not have access'
        })
      }

      // Check if staff_id is in the location's staff_ids array
      const staffIds = Array.isArray(locationData.staff_ids) ? locationData.staff_ids : []
      if (!staffIds.includes(userProfile.id)) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not have this location assigned'
        })
      }

      // Create staff_locations entry
      const { data: newEntry, error: createErr } = await supabase
        .from('staff_locations')
        .insert({
          staff_id: userProfile.id,
          location_id,
          tenant_id: userProfile.tenant_id,
          is_online_bookable,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (createErr || !newEntry) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to create location assignment'
        })
      }

      staffLocation = newEntry
    } else {
      // Update the booking status for existing entry
      const { error: updateError } = await supabase
        .from('staff_locations')
        .update({
          is_online_bookable,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffLocation.id)

      if (updateError) {
        logger.error('❌ Error updating location booking status:', updateError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to update location booking status'
        })
      }
    }

    logger.debug(`✅ Location booking status updated`, {
      location_id,
      is_online_bookable
    })

    return {
      success: true,
      message: `Standort ist ${is_online_bookable ? 'jetzt' : 'nicht mehr'} online buchbar`,
      location_id,
      is_online_bookable
    }

  } catch (error: any) {
    logger.error('❌ Error in update-location-booking:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update location booking status'
    })
  }
})
