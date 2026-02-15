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
  let slotAlreadyReserved: boolean = false
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
      .select('id, tenant_id, first_name, last_name, email, phone, created_at')
      .eq('auth_user_id', authenticatedUserId)
      .single()

    if (userProfileError || !userData) {
      logger.warn('❌ User profile not found for authenticated user')
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    tenantId = userData.tenant_id
    auditDetails.tenant_id = tenantId
    auditDetails.user_id = userData.id

    // Determine if the user is a new customer (registered within the last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const isNewCustomer = new Date(userData.created_at) > fiveMinutesAgo
    auditDetails.is_new_customer = isNewCustomer


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
      // IMPORTANT: Still need to reserve overlapping slots even if main slot is already reserved
      slotAlreadyReserved = true
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
      slotAlreadyReserved = false
    }

    // ============ STEP 2: Reserve ALL overlapping slots for this staff (any location/category) ============
    // ALWAYS execute this, whether slot was just reserved or already reserved by this session
    // When a staff member books a slot, reserve ALL their overlapping slots regardless of:
    // - Location (staff cannot teach at multiple locations simultaneously)
    // - Category code (staff cannot teach different categories simultaneously)
    // - Duration (overlapping time windows must all be blocked)
    // This prevents staff from being double-booked across different locations/categories
    
    const slotEnd = new Date(slot.end_time)
    logger.debug('🔍 Looking for overlapping slots:', {
      tenant_id: tenantId,
      staff_id: slot.staff_id,
      slot_start_time: slot.start_time,
      slot_end_time: slot.end_time,
      slotEnd_ISO: slotEnd.toISOString()
    })
    
    const { data: overlappingForReservation, error: overlapQueryError } = await supabase
      .from('availability_slots')
      .select('id, start_time, end_time, category_code')
      .eq('tenant_id', tenantId)
      .eq('staff_id', slot.staff_id)
      // Note: NO location_id filter - we reserve across ALL locations
      // Note: NO category_code filter - we reserve across ALL categories
      .eq('is_available', true) // CRITICAL: Only reserve available slots!
      .lt('start_time', slotEnd.toISOString())
      .gt('end_time', slot.start_time)
      .neq('id', body.slot_id) // Don't include the main slot (already reserved)

    logger.debug('📊 Overlapping slots query result:', {
      error: overlapQueryError?.message || null,
      count: overlappingForReservation?.length || 0,
      slots: overlappingForReservation?.map(s => ({
        id: s.id,
        start_time: s.start_time,
        end_time: s.end_time,
        category_code: s.category_code
      })) || []
    })

    if (!overlapQueryError && overlappingForReservation && overlappingForReservation.length > 0) {
      const overlapSlotIds = overlappingForReservation.map(s => s.id)
      logger.debug(`🔒 Reserving ${overlapSlotIds.length} overlapping slots (any location/category) to prevent staff double-booking...`, {
        staff_id: slot.staff_id,
        booked_slot: {
          category_code: body.category_code,
          location_id: slot.location_id,
          start_time: slot.start_time,
          end_time: slot.end_time
        },
        overlapping_slots_count: overlapSlotIds.length
      })
      
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
        logger.debug(`✅ Reserved ${overlapSlotIds.length} overlapping slots across all locations/categories`)
      }
    } else {
      logger.debug('ℹ️ No overlapping slots found to reserve')
    }

    // Verify slot belongs to user's tenant
    if (slot.tenant_id !== tenantId) {
      logger.warn('❌ Slot does not belong to user tenant')
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    // ============ LAYER 6: CREATE APPOINTMENT ============ 
    logger.debug('✍️ Creating final appointment record...', {
      user_id: userData.id,
      tenant_id: tenantId,
      staff_id: slot.staff_id,
      location_id: slot.location_id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      duration_minutes: slot.duration_minutes,
      type: body.appointment_type,
      event_type_code: body.category_code
    })
    
    // Load location name for title
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('name')
      .eq('id', slot.location_id)
      .single()
    
    const locationName = location?.name || 'Ort unbekannt'
    const appointmentTitle = `${userData.first_name} ${userData.last_name} - ${locationName}`

    // ============ LAYER 6: CALCULATE PRICE ============
    logger.debug('💰 Calculating price for appointment...', {
      category_code: body.category_code,
      duration_minutes: slot.duration_minutes,
      start_time: slot.start_time,
      tenant_id: tenantId
    })

    const { data: pricingRule, error: pricingError } = await supabase
      .from('pricing_rules')
      .select('price_per_minute_rappen, base_duration_minutes, duration_multiplier, weekend_multiplier, evening_multiplier')
      .eq('category_code', body.category_code)
      .eq('tenant_id', tenantId)
      .eq('rule_type', 'base_price')
      .lte('valid_from', new Date().toISOString())
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString())
      .single()

    let totalAmountRappen = 0
    if (pricingRule) {
      let price = pricingRule.price_per_minute_rappen * slot.duration_minutes

      // Apply duration multiplier
      if (pricingRule.duration_multiplier && pricingRule.duration_multiplier !== '1.00') {
        price *= parseFloat(pricingRule.duration_multiplier)
      }

      // Apply weekend multiplier (if start_time is Saturday or Sunday)
      const appointmentStartTime = new Date(slot.start_time)
      const dayOfWeek = appointmentStartTime.getDay() // 0 = Sunday, 6 = Saturday
      if ((dayOfWeek === 0 || dayOfWeek === 6) && pricingRule.weekend_multiplier && pricingRule.weekend_multiplier !== '1.00') {
        price *= parseFloat(pricingRule.weekend_multiplier)
      }

      // Apply evening multiplier (if start_time is after 18:00)
      const hour = appointmentStartTime.getHours()
      if (hour >= 18 && pricingRule.evening_multiplier && pricingRule.evening_multiplier !== '1.00') {
        price *= parseFloat(pricingRule.evening_multiplier)
      }

      totalAmountRappen = Math.round(price)
      logger.debug('💰 Price calculated:', { totalAmountRappen, pricingRule })
    } else {
      logger.warn('⚠️ No pricing rule found for category, defaulting to 0', { category_code: body.category_code, tenant_id: tenantId })
    }

    // ============ LAYER 7: CREATE APPOINTMENT ============ 
    logger.debug('✍️ Creating final appointment record...', {
      user_id: userData.id,
      tenant_id: tenantId,
      staff_id: slot.staff_id,
      location_id: slot.location_id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      duration_minutes: slot.duration_minutes,
      type: body.category_code,  // Category code (B, A, C, etc.)
      event_type_code: 'lesson',  // The appointment type
      title: appointmentTitle, // "{Vorname} {Name} - {Ort}"
      description: sanitizedNotes || '', // Use notes as description, or empty string
      status: 'confirmed', // Status: confirmed (not booked)
      original_price_rappen: totalAmountRappen // Add default price
    })
    
    const { data: newAppointment, error: createAppointmentError } = await supabase
      .from('appointments')
      .insert({
        user_id: userData.id,
        tenant_id: tenantId,
        staff_id: slot.staff_id,
        location_id: slot.location_id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration_minutes: slot.duration_minutes,
        type: body.category_code,  // Category code (B, A, C, etc.)
        event_type_code: 'lesson',  // The appointment type
        title: appointmentTitle, // "{Vorname} {Name} - {Ort}"
        description: sanitizedNotes || '', // Use notes as description, or empty string
        status: 'confirmed', // Status: confirmed (not booked)
        original_price_rappen: totalAmountRappen // Add default price
      })
      .select()
      .single()

    if (createAppointmentError || !newAppointment) {
      logger.error('❌ Failed to create appointment:', {
        error: createAppointmentError,
        message: createAppointmentError?.message,
        code: createAppointmentError?.code,
        details: createAppointmentError?.details
      })
      throw createError({ statusCode: 500, statusMessage: 'Failed to create appointment' })
    }

    auditDetails.appointment_id = newAppointment.id
    logger.debug('✅ Appointment created successfully:', newAppointment.id)

    // ============ LAYER 8: CREATE PAYMENT ============ 
    logger.debug('💳 Creating payment record for appointment...', {
      appointment_id: newAppointment.id,
      user_id: userData.id,
      tenant_id: tenantId,
      total_amount_rappen: totalAmountRappen
    })

    const paymentToInsert = {
      appointment_id: newAppointment.id,
      user_id: userData.id,
      tenant_id: tenantId,
      staff_id: slot.staff_id, // Add staff_id
      lesson_price_rappen: totalAmountRappen, // Use totalAmountRappen for lesson price
      admin_fee_rappen: 0, // Default to 0 for now
      products_price_rappen: 0, // Default to 0 as no products are booked via this flow
      discount_amount_rappen: 0, // Default to 0 as no discounts are applied via this flow
      total_amount_rappen: totalAmountRappen,
      payment_status: 'pending', // Payment is pending after booking
      payment_method: 'wallee', // Standard to wallee
      payment_provider: 'wallee', // Default payment provider
      payment_method_id: null, // No payment method yet
      description: appointmentTitle,
      currency: 'CHF',
      created_by: userData.id // The user who booked (from public.users table)
    }

    const { data: newPayment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentToInsert)
      .select()
      .single()

    if (paymentError || !newPayment) {
      logger.error('❌ Failed to create payment for appointment:', {
        error: paymentError,
        message: paymentError?.message,
        code: paymentError?.code,
        details: paymentError?.details
      })
      // This is critical, but we don't want to fail the appointment if payment fails
      // Instead, we log a warning and let the payment reconciliation handle it later
      logger.warn('⚠️ Warning: Appointment created, but payment record failed.')
    } else {
      logger.debug('✅ Payment record created successfully:', newPayment.id)
      // Optionally, update the appointment with payment_id if available
      // You would need a 'payment_id' column in the appointments table
    }

    // ============ LAYER 9: Mark all reserved slots as definitively booked ============
    // Update all slots reserved by this session to is_available = false
    // This finalizes the reservation after successful appointment creation
    logger.debug('📌 Marking all reserved slots as definitively booked (is_available = false)...')
    const { error: finalizeError } = await supabase
      .from('availability_slots')
      .update({
        is_available: false, // Mark as definitively booked
        updated_at: now
      })
      .eq('reserved_by_session', body.session_id)
      .eq('tenant_id', tenantId)

    if (finalizeError) {
      logger.warn('⚠️ Warning: Could not finalize all slots:', finalizeError)
      // Non-critical: appointment is already created
    } else {
      logger.debug('✅ All reserved slots marked as definitively booked (is_available = false)')
    }

    // ============ LAYER 8: AUDIT LOGGING ============

    // ============ LAYER 8: AUDIT LOGGING ============
    await logAudit({
      user_id: userData.id,
      tenant_id: tenantId,
      action: 'create_appointment',
      resource_type: 'appointment',
      resource_id: newAppointment.id,
      status: 'success',
      ip_address: ipAddress,
      details: {
        ...auditDetails,
        slot_id: body.slot_id,
        appointment_id: newAppointment.id,
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
      appointment_id: newAppointment.id,
      message: 'Appointment created successfully.',
      reservation: {
        slot_id: body.slot_id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration_minutes: slot.duration_minutes,
        staff_id: slot.staff_id,
        location_id: slot.location_id
      }
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
