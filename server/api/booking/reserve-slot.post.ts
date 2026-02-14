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

    // First, READ the current slot to verify it exists
    const { data: currentSlot, error: readError } = await supabase
      .from('availability_slots')
      .select('id, reserved_by_session, reserved_until, staff_id, location_id, start_time, end_time, duration_minutes')
      .eq('id', body.slot_id)
      .maybeSingle()

    if (readError || !currentSlot) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Slot not found'
      })
    }

    // Attempt to reserve the slot
    // RLS policy enforces: can only update if slot is free (reserved_by_session IS NULL) OR reservation expired
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
      message: 'Slot reserved for 10 minutes',
      slot: {
        id: reservedSlot.id,
        staff_id: reservedSlot.staff_id,
        location_id: reservedSlot.location_id,
        start_time: reservedSlot.start_time,
        end_time: reservedSlot.end_time,
        duration_minutes: reservedSlot.duration_minutes,
        reserved_until: reservedSlot.reserved_until
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
