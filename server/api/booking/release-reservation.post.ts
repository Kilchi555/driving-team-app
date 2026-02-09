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

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

interface ReleaseReservationRequest {
  slot_id: string
  session_id: string
}

export default defineEventHandler(async (event) => {
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

    // ============ STEP 1: Get the slot details ============
    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('id', slot_id)
      .eq('reserved_by_session', session_id)
      .single()

    if (slotError || !slot) {
      logger.warn('⚠️ Slot not found or not reserved by this session:', { slot_id, session_id })
      // Not an error - maybe already released
      return {
        success: true,
        message: 'Slot already released or not found'
      }
    }

    // ============ STEP 2: Find all overlapping slots with same session ============
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
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to release reservation'
      })
    }

    const slotIdsToRelease = overlappingSlots ? overlappingSlots.map(s => s.id) : [slot_id]

    logger.debug(`🔓 Releasing ${slotIdsToRelease.length} reserved slots for session ${session_id}`)

    // ============ STEP 3: Clear reservation from all overlapping slots ============
    // Set is_available back to true + clear reservation fields
    const { error: releaseError } = await supabase
      .from('availability_slots')
      .update({
        is_available: true, // Make available again
        reserved_until: null,
        reserved_by_session: null,
        updated_at: now
      })
      .in('id', slotIdsToRelease)
      .eq('reserved_by_session', session_id)

    if (releaseError) {
      logger.error('❌ Error releasing slots:', releaseError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to release reservation'
      })
    }

    logger.debug(`✅ Released ${slotIdsToRelease.length} slots`)

    return {
      success: true,
      released_count: slotIdsToRelease.length,
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
