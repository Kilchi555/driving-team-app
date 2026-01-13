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
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
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
    const supabase = getSupabaseAdmin()

    // Calculate reservation expiry (10 minutes from now)
    const reservedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // ATOMIC UPDATE:
    // - Only update if slot is available
    // - Only update if not already reserved (or reservation expired)
    // - Return updated row (or nothing if conditions not met)
    const { data: reservedSlot, error: reserveError } = await supabase
      .from('availability_slots')
      .update({
        reserved_until: reservedUntil,
        reserved_by_session: body.session_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.slot_id)
      .eq('is_available', true)
      .or(`reserved_until.is.null,reserved_until.lt.${new Date().toISOString()}`)
      .select('id, staff_id, location_id, start_time, end_time, duration_minutes, reserved_until')
      .single()

    if (reserveError) {
      // Check if it's a "no rows" error (slot already reserved)
      if (reserveError.code === 'PGRST116') {
        logger.warn('⚠️ Slot already reserved or unavailable:', body.slot_id)
        throw createError({
          statusCode: 409,
          statusMessage: 'This slot is no longer available. Please select another slot.'
        })
      }

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
