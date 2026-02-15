/**
 * Release Slot Reservation
 * 
 * PURPOSE:
 * Frees up a reserved slot and all its overlapping slots when:
 * - User cancels during booking
 * - Payment fails
 * - Reservation expires
 * 
 * USAGE:
 * POST /api/booking/release-reservation
 * Body: { slot_id, session_id }
 */

import { defineEventHandler, readBody, createError, H3Event } from 'h3'
import { getSupabase } from '~/server/utils/supabase'
import { createSignedSessionJwt } from '~/server/utils/jwt'
import { logger } from '~/utils/logger'

interface ReleaseReservationRequest {
  slot_id: string
  session_id: string
}

export default defineEventHandler(async (event: H3Event) => {
  try {
    const body = await readBody(event) as ReleaseReservationRequest
    const { slot_id, session_id } = body

    if (!slot_id || !session_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'slot_id and session_id are required'
      })
    }

    const sessionJwt = createSignedSessionJwt(session_id)
    const supabase = getSupabase(event, sessionJwt)
    const now = new Date().toISOString()

    logger.debug('🔓 Release reservation request:', { slot_id, session_id })

    // ============ STEP 1: Try to release the primary slot directly ============
    // We don't SELECT first because the slot is reserved and may not pass the SELECT RLS policy
    const { error: releaseError } = await supabase
      .from('availability_slots')
      .update({
        is_available: true,
        reserved_until: null,
        reserved_by_session: null,
        updated_at: now
      })
      .eq('id', slot_id)

    if (releaseError) {
      logger.error('❌ Error releasing slot:', releaseError)
      throw createError({
        statusCode: releaseError.code === '42501' ? 403 : 500,
        statusMessage: releaseError.code === '42501' ? 'Unauthorized to release this reservation' : 'Failed to release reservation'
      })
    }

    logger.debug('✅ Primary slot released')

    // ============ STEP 2: Get the slot details to find overlapping slots ============
    // Use the internal SELECT policy which allows reading all slots
    const supabaseInternal = getSupabase(event)
    const { data: slot, error: slotError } = await supabaseInternal
      .from('availability_slots')
      .select('tenant_id, staff_id, location_id, start_time, end_time')
      .eq('id', slot_id)
      .single()

    if (slotError || !slot) {
      logger.warn('⚠️ Could not fetch slot details:', slotError)
      // Return success anyway - the primary slot was already released
      return {
        success: true,
        released_count: 1,
        message: 'Primary slot released successfully'
      }
    }

    // ============ STEP 3: Find and release all overlapping slots with same session ============
    const { data: overlappingSlots, error: overlapError } = await supabase
      .from('availability_slots')
      .select('id')
      .eq('tenant_id', slot.tenant_id)
      .eq('staff_id', slot.staff_id)
      .eq('location_id', slot.location_id)
      .eq('reserved_by_session', session_id)
      .lt('start_time', slot.end_time)
      .gt('end_time', slot.start_time)

    if (overlapError) {
      logger.error('❌ Error querying overlapping slots:', overlapError)
      // Return success anyway - the primary slot was released
      return {
        success: true,
        released_count: 1,
        message: 'Primary slot released (overlapping slots could not be queried)'
      }
    }

    const slotIdsToRelease = overlappingSlots ? overlappingSlots.map(s => s.id).filter(id => id !== slot_id) : []

    if (slotIdsToRelease.length === 0) {
      logger.debug('✅ No overlapping slots to release')
      return {
        success: true,
        released_count: 1,
        message: 'Reservation released successfully'
      }
    }

    logger.debug(`🔓 Releasing ${slotIdsToRelease.length} overlapping slots`)

    // ============ STEP 4: Release overlapping slots ============
    const { error: overlapReleaseError } = await supabase
      .from('availability_slots')
      .update({
        is_available: true,
        reserved_until: null,
        reserved_by_session: null,
        updated_at: now
      })
      .in('id', slotIdsToRelease)

    if (overlapReleaseError) {
      logger.error('❌ Error releasing overlapping slots:', overlapReleaseError)
      // Return success anyway - the primary slot was released
      return {
        success: true,
        released_count: 1 + (overlappingSlots?.length || 0),
        message: 'Primary slot released (some overlapping slots could not be released)'
      }
    }

    logger.debug(`✅ Released ${slotIdsToRelease.length} overlapping slots`)

    return {
      success: true,
      released_count: 1 + slotIdsToRelease.length,
      message: 'Reservation released successfully'
    }

  } catch (error: any) {
    logger.error('❌ Release reservation error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to release reservation'
    })
  }
})
