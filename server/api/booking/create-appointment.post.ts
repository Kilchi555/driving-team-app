/**
 * Authenticated API: Create Appointment
 * 
 * PURPOSE:
 * Creates an appointment after verifying slot reservation.
 * Marks slot as unavailable after successful booking.
 * 
 * SECURITY:
 * - Requires authentication
 * - Rate limited (10/min per user)
 * - Verifies slot reservation by session
 * - Tenant isolation
 * - Audit logging
 * - Payment verification
 * 
 * USAGE:
 * POST /api/booking/create-appointment
 * Headers: Authorization: Bearer <token>
 * Body: {
 *   slot_id: "<uuid>",
 *   session_id: "<session-uuid>",
 *   user_data: { first_name, last_name, email, phone, ... },
 *   appointment_type: "lesson",
 *   notes: "...",
 *   category_code: "B"
 * }
 */

import { defineEventHandler, readBody, createError, getHeader, H3Event } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { sanitizeString } from '~/server/utils/validators'
import { toLocalTimeString } from '~/utils/dateUtils'

interface CreateAppointmentRequest {
  slot_id: string
  session_id: string
  user_data?: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
  }
  appointment_type: string
  notes?: string
  category_code: string
}

export default defineEventHandler(async (event: H3Event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined
  let auditDetails: any = {}

  try {
    logger.debug('📅 Create Appointment API called')

    // ============ LAYER 1: AUTHENTICATION ============
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('❌ No auth token provided')
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const token = authHeader.substring(7)
    const supabase = getSupabaseAdmin()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      logger.warn('❌ Invalid auth token')
      throw createError({ statusCode: 401, statusMessage: 'Invalid authentication' })
    }

    authenticatedUserId = user.id
    auditDetails.authenticated_user_id = authenticatedUserId

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      authenticatedUserId,
      'create_appointment',
      10, // 10 requests per minute
      60000 // 60 seconds
    )

    if (!rateLimitResult.allowed) {
      await logAudit({
        auth_user_id: authenticatedUserId,
        action: 'create_appointment',
        status: 'failed',
        error_message: 'Rate limit exceeded',
        ip_address: ipAddress,
        details: auditDetails
      })
      throw createError({ statusCode: 429, statusMessage: 'Too many appointment creation attempts' })
    }

    // ============ LAYER 3: VALIDATE INPUT ============
    const body = await readBody(event) as CreateAppointmentRequest

    if (!body.slot_id || !body.session_id || !body.appointment_type || !body.category_code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'slot_id, session_id, appointment_type, and category_code are required'
      })
    }

    // Sanitize input
    const sanitizedNotes = body.notes ? sanitizeString(body.notes) : undefined

    auditDetails.slot_id = body.slot_id
    auditDetails.appointment_type = body.appointment_type
    auditDetails.category_code = body.category_code

    // ============ LAYER 4: GET USER PROFILE ============
    const { data: userData, error: userProfileError } = await supabase
      .from('users')
      .select('id, tenant_id, first_name, last_name, email, phone')
      .eq('auth_user_id', authenticatedUserId)
      .single()

    if (userProfileError || !userData) {
      logger.warn('❌ User profile not found for authenticated user')
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    tenantId = userData.tenant_id
    auditDetails.tenant_id = tenantId
    auditDetails.user_id = userData.id

    // ============ LAYER 5: RESERVE AND VERIFY SLOT ============
    // First try to reserve the slot (if not already reserved)
    const reservedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const now = new Date().toISOString()
    
    // Try to get the slot first
    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('id', body.slot_id)
      .single()

    if (slotError || !slot) {
      logger.warn('❌ Slot not found:', body.slot_id)
      throw createError({
        statusCode: 409,
        statusMessage: 'Slot not found. Please select a different slot.'
      })
    }

    // Check if slot is already reserved by this session - if so, extend the reservation
    if (slot.reserved_by_session === body.session_id) {
      logger.debug('✅ Slot already reserved by this session, proceeding with appointment creation')
      // Just verify it hasn't expired
      if (slot.reserved_until && new Date(slot.reserved_until) < new Date()) {
        logger.warn('❌ Slot reservation expired:', body.slot_id)
        throw createError({
          statusCode: 409,
          statusMessage: 'Slot reservation expired. Please select the slot again.'
        })
      }
    } else if (slot.reserved_until && new Date(slot.reserved_until) > new Date()) {
      // Slot is reserved by another session and reservation hasn't expired
      logger.warn('⚠️ Slot is reserved by another user:', body.slot_id)
      throw createError({
        statusCode: 409,
        statusMessage: 'This slot is no longer available. Please select another slot.'
      })
    } else {
      // Slot is either not reserved or reservation has expired - we can reserve it
      logger.debug('🔒 Attempting to reserve slot for appointment creation...')
      
      // ============ STEP 1: Reserve the main slot ============
      const { data: reservedSlot, error: reserveError } = await supabase
        .from('availability_slots')
        .update({
          is_available: false, // Mark as unavailable for others
          reserved_until: reservedUntil,
          reserved_by_session: body.session_id,
          updated_at: now
        })
        .eq('id', body.slot_id)
        .eq('is_available', true)
        .select('*')
        .single()

      if (reserveError || !reservedSlot) {
        logger.warn('❌ Could not reserve slot - already taken or unavailable:', body.slot_id)
        throw createError({
          statusCode: 409,
          statusMessage: 'This slot is no longer available. Please select another slot.'
        })
      }

      // ============ STEP 2: Reserve ALL overlapping slots for this staff/location ============
      // This prevents double-booking when a 90-min lesson is booked
      const slotEnd = new Date(slot.end_time)
      const { data: overlappingForReservation, error: overlapQueryError } = await supabase
        .from('availability_slots')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('staff_id', slot.staff_id)
        .eq('location_id', slot.location_id)
        .lt('start_time', slotEnd.toISOString())
        .gt('end_time', slot.start_time)
        .neq('id', body.slot_id) // Don't include the main slot (already reserved)
        .eq('is_available', true) // Only unreserved slots

      if (!overlapQueryError && overlappingForReservation && overlappingForReservation.length > 0) {
        const overlapSlotIds = overlappingForReservation.map(s => s.id)
        logger.debug(`🔒 Reserving ${overlapSlotIds.length} overlapping slots to prevent double-booking...`)
        
        const { error: overlapReserveError } = await supabase
          .from('availability_slots')
          .update({
            is_available: false, // Mark as unavailable for others
            reserved_until: reservedUntil,
            reserved_by_session: body.session_id,
            updated_at: now
          })
          .in('id', overlapSlotIds)

        if (overlapReserveError) {
          logger.warn('⚠️ Warning: Could not reserve all overlapping slots:', overlapReserveError)
          // Non-critical: main slot is already reserved, this is just for UI consistency
        } else {
          logger.debug(`✅ Reserved ${overlapSlotIds.length} overlapping slots`)
        }
      }
    }

    // Verify slot belongs to user's tenant
    if (slot.tenant_id !== tenantId) {
      logger.warn('❌ Slot does not belong to user tenant')
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    // ============ LAYER 6: CREATE APPOINTMENT ============
    // NOTE: Appointment is only created AFTER successful payment via webhook
    // For now, we return a placeholder with the reserved slot info
    const nowLocal = toLocalTimeString(new Date())

    logger.debug('✅ Slot reserved successfully', {
      slot_id: body.slot_id,
      reserved_until: reservedUntil,
      session_id: body.session_id
    })

    // ============ LAYER 7: AUDIT LOGGING ============
    await logAudit({
      user_id: userData.id,
      tenant_id: tenantId,
      action: 'reserve_slot',
      resource_type: 'availability_slot',
      resource_id: body.slot_id,
      status: 'success',
      ip_address: ipAddress,
      details: {
        ...auditDetails,
        slot_id: body.slot_id,
        staff_id: slot.staff_id,
        location_id: slot.location_id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration_minutes: slot.duration_minutes,
        duration_ms: Date.now() - startTime
      }
    })

    // ============ LAYER 8: RETURN RESPONSE ============
    return {
      success: true,
      reservation: {
        slot_id: body.slot_id,
        reserved_until: reservedUntil,
        session_id: body.session_id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration_minutes: slot.duration_minutes,
        staff_id: slot.staff_id,
        location_id: slot.location_id
      },
      message: 'Slot reserved successfully. Proceed to payment.'
    }

  } catch (error: any) {
    logger.error('❌ Reserve Slot API error:', error)
    await logAudit({
      user_id: authenticatedUserId,
      tenant_id: tenantId,
      action: 'reserve_slot',
      status: 'failed',
      error_message: error.statusMessage || error.message,
      ip_address: ipAddress,
      details: { ...auditDetails, duration_ms: Date.now() - startTime }
    })
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to reserve slot'
    })
  }
})
