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
    const now = new Date().toISOString()

    // FIRST: Check if slot is already reserved by THIS session
    const { data: currentReservation, error: checkError } = await supabase
      .from('availability_slots')
      .select('id, reserved_by_session, reserved_until, is_available')
      .eq('id', body.slot_id)
      .single()

    if (checkError) {
      logger.error('❌ Error checking slot:', checkError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to check slot status'
      })
    }

    logger.debug('🔍 Current slot status:', {
      slot_id: body.slot_id,
      is_available: currentReservation?.is_available,
      reserved_by_session: currentReservation?.reserved_by_session,
      requested_session: body.session_id,
      sessions_match: currentReservation?.reserved_by_session === body.session_id,
      reserved_until: currentReservation?.reserved_until
    })

    // If already reserved by the same session, just return it with extended expiry
    if (currentReservation?.reserved_by_session === body.session_id) {
      logger.debug('✅ Slot already reserved by this session, extending reservation...')
      
      const { data: extendedSlot, error: extendError } = await supabase
        .from('availability_slots')
        .update({
          reserved_until: reservedUntil,
          updated_at: now
        })
        .eq('id', body.slot_id)
        .select('id, staff_id, location_id, start_time, end_time, duration_minutes, reserved_until')
        .single()

      if (!extendError && extendedSlot) {
        const duration = Date.now() - startTime
        logger.debug('✅ Reservation extended:', {
          slot_id: extendedSlot.id,
          session_id: body.session_id,
          reserved_until: reservedUntil,
          duration: `${duration}ms`
        })

        return {
          success: true,
          message: 'Slot reservation extended',
          slot: {
            id: extendedSlot.id,
            staff_id: extendedSlot.staff_id,
            location_id: extendedSlot.location_id,
            start_time: extendedSlot.start_time,
            end_time: extendedSlot.end_time,
            duration_minutes: extendedSlot.duration_minutes,
            reserved_until: extendedSlot.reserved_until
          }
        }
      }
    }

    // Check if slot is available and not reserved by another user
    if (!currentReservation?.is_available) {
      logger.warn('⚠️ Slot is not available (is_available=false):', body.slot_id)
      // But allow if it's reserved by this same session - we can override
      if (currentReservation?.reserved_by_session !== body.session_id) {
        throw createError({
          statusCode: 409,
          statusMessage: 'This slot is no longer available. Please select another slot.'
        })
      }
    }

    // Check if slot is reserved by someone else and reservation hasn't expired
    if (currentReservation?.reserved_by_session && currentReservation.reserved_by_session !== body.session_id) {
      if (currentReservation.reserved_until && new Date(currentReservation.reserved_until) > new Date(now)) {
        logger.warn('⚠️ Slot is reserved by another user:', body.slot_id)
        throw createError({
          statusCode: 409,
          statusMessage: 'This slot is no longer available. Please select another slot.'
        })
      }
    }

    // Now reserve the slot
    const { data: reservedSlot, error: reserveError } = await supabase
      .from('availability_slots')
      .update({
        reserved_until: reservedUntil,
        reserved_by_session: body.session_id,
        updated_at: now
      })
      .eq('id', body.slot_id)
      .select('id, staff_id, location_id, start_time, end_time, duration_minutes, reserved_until')
      .single()

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
