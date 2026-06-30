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
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
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

    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    logger.debug('🔓 Release reservation request:', { slot_id, session_id })

    // ============ STEP 1: Try to release the primary slot directly ============
    // Admin client bypasses RLS; session_id filter provides the equivalent ownership check
    const { error: releaseError } = await supabase
      .from('availability_slots')
      .update({
        is_available: true,
        reserved_until: null,
        reserved_by_session: null,
        updated_at: now
      })
      .eq('id', slot_id)
      .eq('reserved_by_session', session_id)

    if (releaseError) {
      logger.error('❌ Error releasing slot:', releaseError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to release reservation'
      })
    }

    logger.debug('✅ Primary slot released')

    // ============ STEP 2: Get the slot details to find overlapping slots ============
    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select('tenant_id, staff_id, location_id, start_time, end_time')
      .eq('id', slot_id)
      .single()

    if (slotError || !slot) {
      logger.warn('⚠️ Could not fetch slot details:', slotError)
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
      .eq('reserved_by_session', session_id)

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
