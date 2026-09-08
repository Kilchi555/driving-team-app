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
import { findStaffBusyOverlap } from '~/server/utils/time-range-overlap'
import { claimAvailabilitySlot, claimOverlappingAvailabilitySlots } from '~/server/utils/claim-availability-slot'

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
    // Public booking stays on the server API (getSupabaseAdmin). The claim
    // helper compare-and-swaps reserved_* only while the row is still free.
    const supabaseAdmin = getSupabaseAdmin()
    const now = new Date()

    logger.debug('🔍 About to attempt reservation', {
      slot_id: body.slot_id,
      session_id: body.session_id
    })

    // Calculate reservation expiry (5 minutes from now)
    const reservedUntil = new Date(now.getTime() + 5 * 60 * 1000).toISOString()
    const overlappingReservedUntil = reservedUntil

    // First, READ the current slot to verify it exists (admin: sees any slot, even reserved)
    const { data: currentSlot, error: readError } = await supabaseAdmin
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

    // ============ STEP 1: Reserve the primary slot (atomic) ============
    // Availability check from the data we already fetched – if the slot is taken,
    // return 409 immediately without hitting the DB again.
    const isExpired = currentSlot.reserved_until && new Date(currentSlot.reserved_until) < now
    const isAvailable = !currentSlot.reserved_by_session || isExpired

    if (!isAvailable) {
      throw createError({ statusCode: 409, statusMessage: 'Slot is no longer available' })
    }

    const busyOverlap = await findStaffBusyOverlap(supabaseAdmin, {
      staffId: currentSlot.staff_id,
      startTime: currentSlot.start_time,
      endTime: currentSlot.end_time,
      tenantId: currentSlot.tenant_id,
    })
    if (busyOverlap) {
      logger.warn('❌ Slot overlaps external busy time', {
        slot_id: body.slot_id,
        staff_id: currentSlot.staff_id,
        busy_id: busyOverlap.id,
      })
      throw createError({
        statusCode: 409,
        statusMessage: 'Dieser Termin liegt in einer gesperrten Zeit. Bitte wähle einen anderen Slot.',
      })
    }

    // Compare-and-swap: the row is claimed only while it is still free or the
    // hold has expired. Two concurrent requests cannot both succeed.
    const { data: claimed, error: reserveError } = await claimAvailabilitySlot(supabaseAdmin, {
      slotId: body.slot_id,
      sessionId: body.session_id,
      reservedUntil,
      isPrimaryReservation: true,
    }, now)

    if (reserveError) {
      logger.error('❌ Error reserving slot:', reserveError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to reserve slot' })
    }

    if (!claimed) {
      throw createError({ statusCode: 409, statusMessage: 'Slot is no longer available' })
    }

    logger.debug('✅ Primary slot reserved')

    // ============ STEP 2: Find all overlapping slots ============
    // Include already-reserved slots – we want to block the staff member's entire time window.
    const { data: overlappingSlots, error: findOverlapError } = await supabaseAdmin
      .from('availability_slots')
      .select('id')
      .eq('staff_id', currentSlot.staff_id)
      .eq('tenant_id', currentSlot.tenant_id)
      .lte('start_time', currentSlot.end_time)
      .gte('end_time', currentSlot.start_time)
      .neq('id', body.slot_id)

    if (findOverlapError) {
      logger.warn('⚠️ Could not find overlapping slots:', findOverlapError)
    }

    const overlappingSlotIds = overlappingSlots ? overlappingSlots.map(s => s.id) : []

    if (overlappingSlotIds.length > 0) {
      logger.debug(`🔗 Found ${overlappingSlotIds.length} overlapping slots, reserving them...`)

      const { error: overlapReserveError } = await claimOverlappingAvailabilitySlots(supabaseAdmin, {
        slotIds: overlappingSlotIds,
        sessionId: body.session_id,
        reservedUntil: overlappingReservedUntil,
      }, now)

      if (overlapReserveError) {
        logger.warn('⚠️ Could not reserve overlapping slots:', overlapReserveError)
      } else {
        logger.debug(`✅ Claimed overlapping slots that were still free`)
      }
    }

    // Build response from the slot data we already have
    const reservedSlot = {
      id: currentSlot.id,
      staff_id: currentSlot.staff_id,
      location_id: currentSlot.location_id,
      start_time: currentSlot.start_time,
      end_time: currentSlot.end_time,
      duration_minutes: currentSlot.duration_minutes,
      reserved_until: reservedUntil
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
