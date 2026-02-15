/**
 * Public API: Reserve Slot (Temporary)
 * 
 * PURPOSE:
 * Temporarily reserves an available slot for 10 minutes.
 * Prevents race conditions when multiple users try to book the same slot.
 * 
 * SECURITY:
 * - Public endpoint (no auth required)
 * - Rate limited (10/min per IP)
 * - Atomic UPDATE (prevents double-booking)
 * - Auto-cleanup after expiry (cron job)
 * - Session-based reservation
 * 
 * USAGE:
 * POST /api/booking/reserve-slot
 * Body: { slot_id: "<uuid>", session_id: "<session-uuid>" }
 */

import { defineEventHandler, readBody, createError, H3Event } from 'h3'
import { getSupabase } from '~/server/utils/supabase'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'

interface ReserveSlotRequest {
  slot_id: string
  session_id: string
}

export default defineEventHandler(async (event: H3Event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)

  try {
    logger.debug('🔒 Reserve Slot API called')

    // ============ LAYER 1: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      ipAddress,
      'reserve_slot',
      10, // 10 requests per minute per IP
      60000 // 60 seconds
    )

    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many reservation attempts. Please try again later.'
      })
    }

    // ============ LAYER 2: VALIDATE INPUT ============
    const body = await readBody(event) as ReserveSlotRequest

    if (!body.slot_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'slot_id is required'
      })
    }

    if (!body.session_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'session_id is required'
      })
    }

    // ============ LAYER 3: ATOMIC RESERVATION ============
    // Use anon key so RLS policies are enforced
    const supabase = getSupabase()
    
    logger.debug('🔍 About to attempt UPDATE with anon key', {
      slot_id: body.slot_id,
      session_id: body.session_id
    })

    // Calculate reservation expiry (5 minutes from now)
    const reservedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    
    // Overlapping slots get the same 5 minutes expiry
    const overlappingReservedUntil = reservedUntil

    // First, READ the current slot to verify it exists
    const { data: currentSlot, error: readError } = await supabase
      .from('availability_slots')
      .select('id, tenant_id, reserved_by_session, reserved_until, staff_id, location_id, start_time, end_time, duration_minutes')
      .eq('id', body.slot_id)
      .maybeSingle()

    if (readError || !currentSlot) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Slot not found'
      })
    }

    // ============ STEP 1: Reserve the primary slot ============
    const { error: reserveError } = await supabase
      .from('availability_slots')
      .update({
        reserved_until: reservedUntil,
        reserved_by_session: body.session_id
      })
      .eq('id', body.slot_id)

    if (reserveError) {
      logger.error('❌ Error reserving slot:', reserveError)
      throw createError({
        statusCode: reserveError.code === '42501' ? 409 : 500,
        statusMessage: reserveError.code === '42501' ? 'Slot is no longer available' : 'Failed to reserve slot'
      })
    }

    logger.debug('✅ Primary slot reserved')

    // ============ STEP 2: Find and reserve all overlapping slots ============
    // Find slots that overlap with this one and belong to the same staff
    // Location doesn't matter - if staff is busy, they're busy everywhere
    // IMPORTANT: Include already-reserved slots too (even if from old sessions)
    // We want to update ALL overlapping slots for this staff member
    const { data: overlappingSlots, error: findOverlapError } = await supabase
      .from('availability_slots')
      .select('id')
      .eq('staff_id', currentSlot.staff_id)
      .eq('tenant_id', currentSlot.tenant_id)
      // Removed: .is('reserved_by_session', null) - we WANT to include already-reserved slots
      .lte('start_time', currentSlot.end_time) // Starts before or at this slot ends (also include adjacent)
      .gte('end_time', currentSlot.start_time) // Ends after or at this slot starts (also include adjacent)
      .neq('id', body.slot_id) // Exclude the primary slot (already reserved)

    if (findOverlapError) {
      logger.warn('⚠️ Could not find overlapping slots:', findOverlapError)
      // Continue anyway - the primary slot is already reserved
    }

    const overlappingSlotIds = overlappingSlots ? overlappingSlots.map(s => s.id) : []
    
    if (overlappingSlotIds.length > 0) {
      logger.debug(`🔗 Found ${overlappingSlotIds.length} overlapping slots, reserving them...`)
      
      // ============ STEP 3: Reserve all overlapping slots ============
      const { error: overlapReserveError } = await supabase
        .from('availability_slots')
        .update({
          reserved_until: overlappingReservedUntil,
          reserved_by_session: body.session_id
        })
        .in('id', overlappingSlotIds)

      if (overlapReserveError) {
        logger.warn('⚠️ Could not reserve all overlapping slots:', overlapReserveError)
        // Continue anyway - the primary slot is reserved
      } else {
        logger.debug(`✅ Reserved ${overlappingSlotIds.length} overlapping slots`)
      }
    }

    // Construct response from current slot data (don't SELECT after UPDATE, as reserved slots won't be visible via SELECT policy)
    const reservedSlot = {
      id: currentSlot.id,
      staff_id: currentSlot.staff_id,
      location_id: currentSlot.location_id,
      start_time: currentSlot.start_time,
      end_time: currentSlot.end_time,
      duration_minutes: currentSlot.duration_minutes,
      reserved_until: reservedUntil
    }

    if (reserveError) {
      logger.error('❌ Error reserving slot:', reserveError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to reserve slot'
      })
    }

    if (!reservedSlot) {
      throw createError({
        statusCode: 409,
        statusMessage: 'This slot is no longer available. Please select another slot.'
      })
    }

    const duration = Date.now() - startTime
    logger.debug('✅ Slot reserved successfully:', {
      slot_id: reservedSlot.id,
      session_id: body.session_id,
      reserved_until: reservedUntil,
      duration: `${duration}ms`
    })

    return {
      success: true,
      message: 'Slot reserved for 5 minutes',
      slot: {
        id: reservedSlot.id,
        staff_id: reservedSlot.staff_id,
        location_id: reservedSlot.location_id,
        start_time: reservedSlot.start_time,
        end_time: reservedSlot.end_time,
        duration_minutes: reservedSlot.duration_minutes,
        reserved_until: reservedSlot.reserved_until,
        overlappingSlotsReserved: overlappingSlotIds.length
      }
    }

  } catch (error: any) {
    logger.error('❌ Reserve Slot API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to reserve slot'
    })
  }
})
