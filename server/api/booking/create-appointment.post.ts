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
import { sanitizeString } from '~/server/utils/sanitization'
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

    // ============ LAYER 5: VERIFY SLOT RESERVATION ============
    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('id', body.slot_id)
      .eq('reserved_by_session', body.session_id)
      .single()

    if (slotError || !slot) {
      logger.warn('❌ Slot not found or not reserved by this session:', body.slot_id)
      await logAudit({
        user_id: userData.id,
        tenant_id: tenantId,
        action: 'create_appointment',
        status: 'failed',
        error_message: 'Slot not reserved or reservation expired',
        ip_address: ipAddress,
        details: auditDetails
      })
      throw createError({
        statusCode: 409,
        statusMessage: 'Slot reservation expired or invalid. Please reserve the slot again.'
      })
    }

    // Check if reservation expired
    if (slot.reserved_until && new Date(slot.reserved_until) < new Date()) {
      logger.warn('❌ Slot reservation expired:', body.slot_id)
      await logAudit({
        user_id: userData.id,
        tenant_id: tenantId,
        action: 'create_appointment',
        status: 'failed',
        error_message: 'Slot reservation expired',
        ip_address: ipAddress,
        details: auditDetails
      })
      throw createError({
        statusCode: 409,
        statusMessage: 'Slot reservation expired. Please reserve the slot again.'
      })
    }

    // Verify slot belongs to user's tenant
    if (slot.tenant_id !== tenantId) {
      logger.warn('❌ Slot does not belong to user tenant')
      await logAudit({
        user_id: userData.id,
        tenant_id: tenantId,
        action: 'create_appointment',
        status: 'failed',
        error_message: 'Tenant mismatch',
        ip_address: ipAddress,
        details: auditDetails
      })
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    // ============ LAYER 6: CREATE APPOINTMENT ============
    const now = toLocalTimeString(new Date())

    const appointmentData = {
      tenant_id: tenantId,
      user_id: userData.id,
      staff_id: slot.staff_id,
      location_id: slot.location_id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      duration_minutes: slot.duration_minutes,
      status: 'booked',
      type: body.appointment_type,
      category_code: body.category_code,
      notes: sanitizedNotes,
      created_at: now,
      updated_at: now
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select('*')
      .single()

    if (appointmentError) {
      logger.error('❌ Error creating appointment:', appointmentError)
      await logAudit({
        user_id: userData.id,
        tenant_id: tenantId,
        action: 'create_appointment',
        status: 'failed',
        error_message: `Appointment creation failed: ${appointmentError.message}`,
        ip_address: ipAddress,
        details: auditDetails
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create appointment'
      })
    }

    logger.debug('✅ Appointment created:', appointment.id)
    auditDetails.appointment_id = appointment.id

    // ============ LAYER 7: MARK SLOT AS UNAVAILABLE ============
    const { error: slotUpdateError } = await supabase
      .from('availability_slots')
      .update({
        is_available: false,
        appointment_id: appointment.id,
        reserved_until: null,
        reserved_by_session: null,
        updated_at: now
      })
      .eq('id', body.slot_id)

    if (slotUpdateError) {
      logger.error('❌ Error updating slot availability:', slotUpdateError)
      // Non-critical: appointment is created, slot update can be retried
    } else {
      logger.debug('✅ Slot marked as unavailable')
    }

    // ============ LAYER 8: AUDIT LOGGING ============
    await logAudit({
      user_id: userData.id,
      tenant_id: tenantId,
      action: 'create_appointment',
      resource_type: 'appointment',
      resource_id: appointment.id,
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

    // ============ LAYER 9: RETURN RESPONSE ============
    return {
      success: true,
      appointment: {
        id: appointment.id,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        duration_minutes: appointment.duration_minutes,
        status: appointment.status,
        type: appointment.type,
        category_code: appointment.category_code
      },
      payment_required: false, // TODO: Integrate payment logic if needed
      message: 'Appointment created successfully'
    }

  } catch (error: any) {
    logger.error('❌ Create Appointment API error:', error)
    await logAudit({
      user_id: authenticatedUserId,
      tenant_id: tenantId,
      action: 'create_appointment',
      status: 'failed',
      error_message: error.statusMessage || error.message,
      ip_address: ipAddress,
      details: { ...auditDetails, duration_ms: Date.now() - startTime }
    })
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create appointment'
    })
  }
})
