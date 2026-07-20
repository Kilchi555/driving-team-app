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
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { roundToNearest5Rappen } from '~/utils/rounding'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { sanitizeString } from '~/server/utils/validators'
import { toLocalTimeString } from '~/utils/dateUtils'
import { recordAndUploadConversion, sha256Hex } from '~/server/utils/google-ads-conversion'
import { recordAndSendCapiEvent } from '~/server/utils/meta-capi'
import { calculateAdminFee } from '~/server/utils/admin-fee'
import { resolveVehicleSettings, calculateVehicleCost } from '~/server/utils/vehicle-availability'
import { resolveRoomSettings, pickAvailableRoomId, type RoomServiceType } from '~/server/utils/room-availability'
import { logFallbackUsed } from '~/server/utils/log-fallback'

interface MarketingAttributionPayload {
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  /** Meta click ID from ?fbclid= URL parameter. */
  fbclid?: string | null
  /** Meta _fbc cookie (fb.1.{ts}.{fbclid}) for CAPI deduplication. */
  fbc?: string | null
  /** Meta _fbp cookie (fb.1.{ts}.{random}) for CAPI audience matching. */
  fbp?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
}

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
  discount_code?: string
  discount_amount_rappen?: number
  /** Cross-domain marketing session ID (set on drivingteam.ch, forwarded via URL). */
  marketing_session_id?: string
  /** Decoded marketing attribution blob (gclid + UTMs). */
  marketing_attribution?: MarketingAttributionPayload | null
  /** Customer pickup PLZ — stored on the appointment for pickup bookings. */
  customer_pickup_plz?: string | null
  /** Full formatted pickup address (e.g. "Musterstrasse 12, 8048 Zürich") */
  customer_pickup_address?: string | null
  /** Vehicle mode chosen by student: 'school' = rent school vehicle, 'own' = bring own vehicle */
  vehicle_mode?: 'school' | 'own' | null
  /** Booking service type (Fahrstunde/Theorie/Beratung) — resolves the admin-configured room
   *  rule for this category+location. The room itself is auto-assigned server-side, never
   *  chosen by the customer. */
  service_type?: RoomServiceType
  /** Customer-selected payment method. Only 'invoice' is honored, and only when the tenant has explicitly enabled it — otherwise falls back to 'wallee'. */
  payment_method?: 'wallee' | 'invoice'
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
    // getAuthenticatedUser() checks the Bearer header AND falls back to the
    // HTTP-only session cookie (with token refresh) — a raw Bearer-only check
    // here meant this endpoint 401'd whenever the client's access token had
    // just expired and hadn't been refreshed yet.
    const supabase = getSupabaseAdmin()
    const authUser = await getAuthenticatedUser(event)

    if (!authUser) {
      logger.warn('❌ No valid auth token/session provided')
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    authenticatedUserId = authUser.id
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

    const [pricingRuleRes, adminFeeRuleRes, locationSettingsRes, categorySettingsRes] = await Promise.all([
      supabase
        .from('pricing_rules')
        .select('price_per_minute_rappen, base_duration_minutes, duration_multiplier, weekend_multiplier, evening_multiplier')
        .eq('category_code', body.category_code)
        .eq('tenant_id', tenantId)
        .eq('rule_type', 'base_price')
        .lte('valid_from', new Date().toISOString())
        .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString())
        .maybeSingle(),
      supabase
        .from('pricing_rules')
        .select('admin_fee_rappen, admin_fee_applies_from')
        .eq('category_code', body.category_code)
        .eq('tenant_id', tenantId)
        .eq('rule_type', 'admin_fee')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('locations')
        .select('category_vehicle_settings, category_room_settings')
        .eq('id', slot.location_id)
        .maybeSingle(),
      supabase
        .from('categories')
        .select('vehicle_settings, room_settings')
        .eq('code', body.category_code)
        .eq('tenant_id', tenantId)
        .maybeSingle(),
    ])

    const pricingRule = pricingRuleRes.data
    const pricingError = pricingRuleRes.error
    const adminFeeRuleRappen = Number(adminFeeRuleRes.data?.admin_fee_rappen || 0)
    const adminFeeAppliesFromRule = adminFeeRuleRes.data?.admin_fee_applies_from != null
      ? Number(adminFeeRuleRes.data.admin_fee_applies_from)
      : null

    // Resolve vehicle settings for this location + category
    const vehicleSettings = resolveVehicleSettings(
      locationSettingsRes.data?.category_vehicle_settings,
      categorySettingsRes.data?.vehicle_settings,
      body.category_code
    )

    // Resolve room settings for this location + category + booking service type.
    // Rooms are never chosen by the customer — the admin defines the rule, and a
    // free room from the allowed pool gets auto-assigned further below.
    const roomServiceType: RoomServiceType = body.service_type ?? 'fahrstunde'
    const roomRule = resolveRoomSettings(
      locationSettingsRes.data?.category_room_settings,
      categorySettingsRes.data?.room_settings,
      body.category_code,
      roomServiceType
    )

    let totalAmountRappen = 0
    if (pricingRule) {
      let price = Number(pricingRule.price_per_minute_rappen) * slot.duration_minutes

      // Apply duration multiplier
      if (pricingRule.duration_multiplier && pricingRule.duration_multiplier !== '1.00') {
        price *= parseFloat(pricingRule.duration_multiplier)
        price = Math.round(price) // Round after each calculation
      }

      // Apply weekend multiplier (if start_time is Saturday or Sunday)
      const appointmentStartTime = new Date(slot.start_time)
      const dayOfWeek = appointmentStartTime.getDay() // 0 = Sunday, 6 = Saturday
      if ((dayOfWeek === 0 || dayOfWeek === 6) && pricingRule.weekend_multiplier && pricingRule.weekend_multiplier !== '1.00') {
        price *= parseFloat(pricingRule.weekend_multiplier)
        price = Math.round(price) // Round after each calculation
      }

      // Apply evening multiplier (if start_time is after 18:00)
      const hour = appointmentStartTime.getHours()
      if (hour >= 18 && pricingRule.evening_multiplier && pricingRule.evening_multiplier !== '1.00') {
        price *= parseFloat(pricingRule.evening_multiplier)
        price = Math.round(price) // Round after each calculation
      }

      totalAmountRappen = Math.round(price)
      totalAmountRappen = roundToNearest5Rappen(totalAmountRappen)

      // Apply vehicle option cost (positive = surcharge, negative = discount)
      if (body.vehicle_mode) {
        const vehicleCost = calculateVehicleCost(vehicleSettings, body.vehicle_mode, slot.duration_minutes)
        totalAmountRappen = Math.max(0, totalAmountRappen + vehicleCost)
      }

      logger.debug('💰 Price calculated:', { totalAmountRappen, vehicle_mode: body.vehicle_mode, pricingRule })
    } else {
      // ✅ No silent price fallback for real bookings: a request without a person
      // present to notice a wrong price must fail safely instead of charging 0.
      logger.warn('⚠️ No pricing rule found for category, aborting booking', { category_code: body.category_code, tenant_id: tenantId, pricingError: pricingError?.message })
      await logFallbackUsed({
        source: 'pricing',
        message: `Buchung abgebrochen: keine aktive Preisregel für Kategorie "${body.category_code}" gefunden.`,
        tenantId,
        level: 'error',
        details: { category_code: body.category_code, dbError: pricingError?.message || null }
      })
      throw createError({
        statusCode: 503,
        statusMessage: 'Der Preis für diese Kategorie konnte gerade nicht ermittelt werden. Bitte versuche es in Kürze erneut oder kontaktiere uns direkt.'
      })
    }

    // ============ LAYER 6c: ADMIN FEE CALCULATION ============
    // Must run BEFORE the appointment is inserted so the utility's count of
    // existing active appointments doesn't include the upcoming one.
    const adminFeeResult = await calculateAdminFee({
      supabase,
      userId: userData.id,
      tenantId: tenantId!,
      categoryCode: body.category_code,
      adminFeeRappenFromRule: adminFeeRuleRappen,
      adminFeeAppliesFromRule,
    })
    const adminFeeRappen = adminFeeResult.adminFeeRappen
    logger.debug('💼 Admin fee decision (booking flow):', {
      user_id: userData.id,
      category: body.category_code,
      adminFeeRappen,
      reason: adminFeeResult.reason,
      appointmentNumber: adminFeeResult.appointmentNumber,
      alreadyPaid: adminFeeResult.alreadyPaid,
    })

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
    
    // Marketing attribution: prefer payload from client, fall back to a DB
    // lookup via marketing_session_id (the session_id used cross-domain).
    let marketingAttr: MarketingAttributionPayload | null = body.marketing_attribution ?? null
    if (!marketingAttr && body.marketing_session_id) {
      const { data: attrRow } = await supabase
        .from('marketing_attributions')
        .select('gclid, gbraid, wbraid, fbclid, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term')
        .eq('session_id', body.marketing_session_id)
        .maybeSingle()
      if (attrRow) marketingAttr = attrRow as MarketingAttributionPayload
    }

    // Auto-assign a room (never chosen by the customer) — pick the first free
    // room from the admin-configured pool for this category+location+service type.
    let autoAssignedRoomId: string | null = null
    if (roomRule.mode !== 'none' && roomRule.allowed_room_ids.length > 0) {
      autoAssignedRoomId = await pickAvailableRoomId(supabase, {
        allowedRoomIds: roomRule.allowed_room_ids,
        startTime: slot.start_time,
        endTime: slot.end_time,
      })
      if (!autoAssignedRoomId) {
        logger.warn('⚠️ No free room available for auto-assignment (non-fatal):', {
          category_code: body.category_code,
          service_type: roomServiceType,
          mode: roomRule.mode,
        })
      }
    }

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
        original_price_rappen: totalAmountRappen, // Add default price
        source: 'online',
        created_by: userData.id,
        // Marketing attribution (denormalized — used by server-side Google Ads + Meta CAPI upload)
        marketing_session_id: body.marketing_session_id ?? null,
        gclid: marketingAttr?.gclid ?? null,
        gbraid: marketingAttr?.gbraid ?? null,
        wbraid: marketingAttr?.wbraid ?? null,
        fbclid: marketingAttr?.fbclid ?? null,
        fbc: marketingAttr?.fbc ?? null,
        fbp: marketingAttr?.fbp ?? null,
        utm_source: marketingAttr?.utm_source ?? null,
        utm_medium: marketingAttr?.utm_medium ?? null,
        utm_campaign: marketingAttr?.utm_campaign ?? null,
        utm_content: marketingAttr?.utm_content ?? null,
        utm_term: marketingAttr?.utm_term ?? null,
        customer_pickup_plz: body.customer_pickup_plz?.trim() || null,
        customer_pickup_address: body.customer_pickup_address?.trim() || null,
        vehicle_mode: body.vehicle_mode ?? null,
        room_id: autoAssignedRoomId,
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

    // Create vehicle_bookings placeholder when the chosen option requires a school vehicle.
    // vehicle_id is null (no specific vehicle assigned yet — staff does that later).
    // This row acts as a capacity blocker for future availability checks.
    const chosenOption = vehicleSettings.options?.find(o => o.key === body.vehicle_mode)
    if (body.vehicle_mode && chosenOption?.requires_school_vehicle) {
      const { error: vbErr } = await supabase
        .from('vehicle_bookings')
        .insert({
          vehicle_id: null,
          tenant_id: tenantId,
          location_id: slot.location_id,
          category_code: body.category_code,
          start_time: slot.start_time,
          end_time: slot.end_time,
          purpose: 'lesson',
          appointment_id: newAppointment.id,
          booked_by: userData.id,
          status: 'confirmed',
        })
      if (vbErr) {
        logger.warn('⚠️ vehicle_bookings placeholder creation failed (non-fatal):', vbErr.message)
      } else {
        logger.debug('✅ vehicle_bookings placeholder created for school vehicle lesson')
      }
    }

    // Create room_booking for the auto-assigned room (see LAYER 7 above).
    // Re-check for conflicts right before inserting to close the race window
    // between the pick and this insert (e.g. a near-simultaneous booking).
    if (autoAssignedRoomId) {
      const { data: roomConflicts } = await supabase
        .from('room_bookings')
        .select('id')
        .eq('room_id', autoAssignedRoomId)
        .neq('status', 'cancelled')
        .lt('start_time', slot.end_time)
        .gt('end_time', slot.start_time)
        .limit(1)

      if ((roomConflicts?.length ?? 0) > 0) {
        logger.warn('⚠️ Room conflict detected on booking — skipping room_bookings insert:', autoAssignedRoomId)
      } else {
        const { error: rbErr } = await supabase
          .from('room_bookings')
          .insert({
            room_id: autoAssignedRoomId,
            tenant_id: tenantId,
            start_time: slot.start_time,
            end_time: slot.end_time,
            purpose: 'lesson',
            appointment_id: newAppointment.id,
            booked_by: userData.id,
            status: 'confirmed',
          })
        if (rbErr) {
          logger.warn('⚠️ room_bookings creation failed (non-fatal):', rbErr.message)
        } else {
          logger.debug('✅ room_bookings entry created for room:', autoAssignedRoomId)
        }
      }
    }

    // ============ LAYER 7b: VALIDATE DISCOUNT (manual code or auto-apply) ============
    let validatedDiscountAmount = 0

    // Auto-apply: load registered sticky discounts for this user if no manual code given
    let autoDiscountCode: string | null = null
    if (!body.discount_code) {
      try {
        const now = new Date().toISOString()
        const { data: userCodes } = await supabase
          .from('user_discount_codes')
          .select(`
            code,
            expires_at,
            discounts (
              id, discount_type, discount_value, max_discount_rappen,
              valid_until, is_active, auto_apply, usage_limit, usage_count
            )
          `)
          .eq('user_id', userData.id)
          .eq('tenant_id', tenantId!)
          .eq('is_active', true)

        const activeAutoCode = (userCodes || []).find((udc: any) => {
          const d = udc.discounts
          if (!d?.is_active || !d?.auto_apply) return false
          const expiresAt = udc.expires_at ? new Date(udc.expires_at) : null
          if (expiresAt && expiresAt < new Date()) return false
          const discountValidUntil = d.valid_until ? new Date(d.valid_until) : null
          if (!expiresAt && discountValidUntil && discountValidUntil < new Date()) return false
          if (d.usage_limit && (d.usage_count ?? 0) >= d.usage_limit) return false
          return true
        })

        if (activeAutoCode) {
          const d = activeAutoCode.discounts
          if (d.discount_type === 'percentage') {
            validatedDiscountAmount = Math.round((totalAmountRappen * d.discount_value) / 100)
            if (d.max_discount_rappen) validatedDiscountAmount = Math.min(validatedDiscountAmount, d.max_discount_rappen)
          } else if (d.discount_type === 'fixed') {
            validatedDiscountAmount = Math.round((d.discount_value || 0) * 100)
          } else if (d.discount_type === 'free_lesson') {
            validatedDiscountAmount = totalAmountRappen
          }
          validatedDiscountAmount = Math.min(validatedDiscountAmount, totalAmountRappen)
          autoDiscountCode = activeAutoCode.code
          logger.debug('🎁 Auto-applied user discount:', autoDiscountCode, 'amount:', validatedDiscountAmount)
        }
      } catch (autoErr: any) {
        logger.warn('⚠️ Auto-discount lookup failed (non-critical):', autoErr.message)
      }
    }

    if (body.discount_code && body.discount_amount_rappen && body.discount_amount_rappen > 0) {
      try {
        const discountCode = body.discount_code
        let discountFound = false

        // 1. Try voucher_codes table (type must be 'discount', not 'credit'; applies to appointments)
        const { data: voucherData } = await supabase
          .from('voucher_codes')
          .select('discount_type, discount_value, max_discount_rappen, valid_from, valid_until, is_active, type, applies_to, max_redemptions, current_redemptions')
          .ilike('code', discountCode)
          .eq('tenant_id', tenantId!)
          .eq('is_active', true)
          .maybeSingle()

        if (voucherData) {
          const isDiscountType = voucherData.type && voucherData.type !== 'credit'
          const appliesTo = voucherData.applies_to || 'appointments'
          const appliesToAppointments = appliesTo === 'all' || appliesTo === 'appointments'
          const now = new Date()
          const validFrom = voucherData.valid_from ? new Date(voucherData.valid_from) : null
          const validUntil = voucherData.valid_until ? new Date(voucherData.valid_until) : null
          const withinPeriod = (!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)
          const withinLimit = !voucherData.max_redemptions || (voucherData.current_redemptions ?? 0) < voucherData.max_redemptions

          if (isDiscountType && appliesToAppointments && withinPeriod && withinLimit) {
            if (voucherData.discount_type === 'percentage') {
              validatedDiscountAmount = Math.round((totalAmountRappen * voucherData.discount_value) / 100)
              if (voucherData.max_discount_rappen) {
                validatedDiscountAmount = Math.min(validatedDiscountAmount, voucherData.max_discount_rappen)
              }
            } else if (voucherData.discount_type === 'fixed') {
              // voucher_codes.discount_value is stored in Rappen
              validatedDiscountAmount = voucherData.discount_value || 0
            }
            discountFound = true
          }
        }

        // 2. Try vouchers table (purchased gift cards from shop – full amount as discount)
        if (!discountFound) {
          const { data: giftCard } = await supabase
            .from('vouchers')
            .select('amount_rappen, redeemed_at, valid_until, is_active')
            .ilike('code', discountCode)
            .eq('tenant_id', tenantId!)
            .eq('is_active', true)
            .maybeSingle()

          if (giftCard && !giftCard.redeemed_at) {
            const now = new Date()
            const withinPeriod = !giftCard.valid_until || new Date(giftCard.valid_until) >= now
            if (withinPeriod) {
              validatedDiscountAmount = giftCard.amount_rappen
              discountFound = true
            }
          }
        }

        // 3. Try discounts table
        if (!discountFound) {
          const { data: discountData } = await supabase
            .from('discounts')
            .select('discount_type, discount_value, max_discount_rappen, valid_from, valid_until, is_active, first_lesson_only, usage_limit, usage_count')
            .ilike('code', discountCode)
            .eq('tenant_id', tenantId!)
            .eq('is_active', true)
            .maybeSingle()

          if (discountData) {
            const now = new Date()
            const validFrom = discountData.valid_from ? new Date(discountData.valid_from) : null
            const validUntil = discountData.valid_until ? new Date(discountData.valid_until) : null
            const withinPeriod = (!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)
            const withinLimit = !discountData.usage_limit || (discountData.usage_count ?? 0) < discountData.usage_limit

            if (withinPeriod && withinLimit) {
              // Check first_lesson_only: appointment just inserted counts, so <= 1 means first lesson
              let firstLessonOk = true
              if (discountData.first_lesson_only) {
                const { count: apptCount } = await supabase
                  .from('appointments')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', userData.id)
                  .eq('tenant_id', tenantId!)
                  .in('status', ['confirmed', 'completed'])
                firstLessonOk = (apptCount ?? 0) <= 1
              }

              if (firstLessonOk) {
                if (discountData.discount_type === 'percentage') {
                  validatedDiscountAmount = Math.round((totalAmountRappen * discountData.discount_value) / 100)
                  if (discountData.max_discount_rappen) {
                    validatedDiscountAmount = Math.min(validatedDiscountAmount, discountData.max_discount_rappen)
                  }
                } else if (discountData.discount_type === 'fixed') {
                  // discounts.discount_value is stored in Franken → convert to Rappen
                  validatedDiscountAmount = Math.round((discountData.discount_value || 0) * 100)
                } else if (discountData.discount_type === 'free_lesson') {
                  validatedDiscountAmount = totalAmountRappen
                }
                discountFound = true
              }
            }
          }
        }

        validatedDiscountAmount = Math.min(validatedDiscountAmount, totalAmountRappen)
        logger.debug('💸 Discount validated:', { code: discountCode, amount: validatedDiscountAmount, found: discountFound })
      } catch (discountErr: any) {
        logger.warn('⚠️ Discount validation failed (non-critical):', discountErr.message)
      }
    }

    // ============ LAYER 7b.5: INCREMENT USAGE COUNT ============
    const discountCodeToTrack = validatedDiscountAmount > 0
      ? (body.discount_code || autoDiscountCode)
      : null
    const effectiveDiscountCode = body.discount_code || autoDiscountCode

    // Lesson price + admin fee, then discount applied on top.
    const grossAmountRappen = totalAmountRappen + adminFeeRappen
    const netAmountRappen = Math.max(0, grossAmountRappen - validatedDiscountAmount)

    // ============ LAYER 7c: RESOLVE PAYMENT METHOD ============
    // Default to 'wallee'. A customer-requested 'invoice' is only honored if
    // the tenant has explicitly enabled it in tenant_settings — otherwise we
    // silently fall back to wallee so a spoofed request body can't be used
    // to avoid online payment.
    let resolvedPaymentMethod: 'wallee' | 'invoice' = 'wallee'
    if (body.payment_method === 'invoice') {
      const { data: paymentSettingRow } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenantId)
        .eq('category', 'payment')
        .eq('setting_key', 'payment_settings')
        .maybeSingle()
      const tenantPaymentSettings = paymentSettingRow?.setting_value
        ? (typeof paymentSettingRow.setting_value === 'string' ? JSON.parse(paymentSettingRow.setting_value) : paymentSettingRow.setting_value)
        : {}
      if (tenantPaymentSettings.invoice_payments_enabled === true) {
        resolvedPaymentMethod = 'invoice'
      } else {
        logger.warn('⚠️ Customer requested invoice payment but tenant has not enabled it — falling back to wallee', { tenantId })
      }
    }

    // ============ LAYER 8: CREATE PAYMENT ============ 
    logger.debug('💳 Creating payment record for appointment...', {
      appointment_id: newAppointment.id,
      user_id: newAppointment.user_id,
      tenant_id: tenantId,
      lesson_price_rappen: totalAmountRappen,
      admin_fee_rappen: adminFeeRappen,
      total_amount_rappen: netAmountRappen,
      discount_amount_rappen: validatedDiscountAmount
    })

    const paymentToInsert = {
      appointment_id: newAppointment.id,
      user_id: newAppointment.user_id,
      tenant_id: tenantId,
      staff_id: slot.staff_id,
      lesson_price_rappen: totalAmountRappen,
      admin_fee_rappen: adminFeeRappen,
      products_price_rappen: 0,
      discount_amount_rappen: validatedDiscountAmount,
      total_amount_rappen: netAmountRappen,
      payment_status: 'pending',
      payment_method: resolvedPaymentMethod,
      payment_provider: resolvedPaymentMethod === 'wallee' ? 'wallee' : null,
      payment_method_id: null,
      description: appointmentTitle,
      metadata: {
        category: body.category_code || null,
        admin_fee_reason: adminFeeResult.reason,
        ...(effectiveDiscountCode ? { discount_code: effectiveDiscountCode, discount_auto_applied: !body.discount_code } : {})
      },
      currency: 'CHF',
      created_by: newAppointment.user_id
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
        details: paymentError?.details,
        insertData: paymentToInsert
      })
      // This is critical, but we don't want to fail the appointment if payment fails
      // Instead, we log a warning and let the payment reconciliation handle it later
      logger.warn('⚠️ Warning: Appointment created, but payment record failed.')
    } else {
      logger.debug('✅ Payment record created successfully:', newPayment.id)
    }

    // ============ LAYER 8.5: INCREMENT DISCOUNT USAGE COUNT ============
    if (discountCodeToTrack && tenantId) {
      ;(async () => {
        try {
          // Try discounts table first
          const { data: disc } = await supabase
            .from('discounts')
            .select('id, usage_count')
            .ilike('code', discountCodeToTrack)
            .eq('tenant_id', tenantId)
            .maybeSingle()

          if (disc) {
            await supabase
              .from('discounts')
              .update({ usage_count: (disc.usage_count ?? 0) + 1 })
              .eq('id', disc.id)
            logger.debug('📊 Discount usage_count incremented:', discountCodeToTrack)
            return
          }

          // Try voucher_codes table
          const { data: vc } = await supabase
            .from('voucher_codes')
            .select('id, current_redemptions')
            .ilike('code', discountCodeToTrack)
            .eq('tenant_id', tenantId)
            .maybeSingle()

          if (vc) {
            await supabase
              .from('voucher_codes')
              .update({ current_redemptions: (vc.current_redemptions ?? 0) + 1 })
              .eq('id', vc.id)
            logger.debug('📊 Voucher current_redemptions incremented:', discountCodeToTrack)
          }
        } catch (e: any) {
          logger.warn('⚠️ Failed to increment discount usage (non-critical):', e.message)
        }
      })()
    }

    // ============ LAYER 9: Mark all reserved slots as definitively booked ============
    // Update all slots reserved by this session to is_available = false
    // This finalizes the reservation after successful appointment creation
    logger.debug('📌 Marking all reserved slots as definitively booked (is_available = false)...')
    const { error: finalizeError } = await supabase
      .from('availability_slots')
      .update({
        is_available: false,
        appointment_id: newAppointment.id,
        reserved_by_session: null,
        reserved_until: null,
        updated_at: now
      })
      .eq('reserved_by_session', body.session_id)
      .eq('tenant_id', tenantId)

    if (finalizeError) {
      logger.warn('⚠️ Warning: Could not finalize all slots:', finalizeError)
      // Non-critical: appointment is already created
    } else {
      logger.debug('✅ All reserved slots finalized: appointment_id linked, reservation cleared')
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

    // ============ LAYER 9: TRIGGER AVAILABILITY RECALCULATION ============
    // Fire-and-forget: recalculate slots for this staff so other customers
    // immediately see updated availability (don't await - non-blocking)
    const cronSecret = process.env.CRON_SECRET
    $fetch('/api/availability/queue-recalc', {
      method: 'POST',
      body: {
        staff_id: slot.staff_id,
        tenant_id: tenantId,
        trigger: 'appointment'
      },
      headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}
    }).catch((err: any) => {
      logger.warn('⚠️ Could not queue availability recalc after booking (non-critical):', err.message)
    })

    // Send appointment confirmation email. We AWAIT this (inside try/catch so a
    // failure never breaks the already-committed booking). A previous
    // fire-and-forget version was unreliable on Vercel serverless: the function
    // is frozen right after the response is returned, so the unawaited $fetch was
    // frequently cut off before the email was actually sent — which is why
    // self-booking customers received no confirmation while staff-created
    // appointments (different flow) did.
    try {
      await $fetch('/api/reminders/send-appointment-confirmation', {
        method: 'POST',
        body: {
          appointmentId: newAppointment.id,
          userId: userData.id,
          tenantId: tenantId
        }
      })
    } catch (err: any) {
      logger.warn('⚠️ Could not send appointment confirmation email (non-critical):', err?.message)
    }

    // ============ LAYER 11: SERVER-SIDE GOOGLE ADS CONVERSION UPLOAD ============
    // Fire-and-forget. Never blocks or fails the booking. If any of:
    //   - GOOGLE_ADS_* env vars missing
    //   - no gclid/gbraid/wbraid attached to the booking
    //   - Google Ads API rejects
    // then the upload is skipped/logged; the booking itself is unaffected.
    if (marketingAttr?.gclid || marketingAttr?.gbraid || marketingAttr?.wbraid) {
      ;(async () => {
        try {
          // Hash email/phone for Enhanced Conversions (improves match rate).
          const normalizedEmail = (userData.email ?? '').trim().toLowerCase()
          const normalizedPhone = (userData.phone ?? '').replace(/\s+/g, '').replace(/^00/, '+')
          const hashedEmail = normalizedEmail ? await sha256Hex(normalizedEmail) : null
          const hashedPhone = normalizedPhone.startsWith('+') ? await sha256Hex(normalizedPhone) : null

          // Conversion value: net amount after discount, fallback to gross.
          const conversionValueChf = (netAmountRappen > 0 ? netAmountRappen : totalAmountRappen) / 100

          await recordAndUploadConversion({
            appointment_id: newAppointment.id,
            tenant_id: tenantId ?? null,
            gclid: marketingAttr.gclid ?? null,
            gbraid: marketingAttr.gbraid ?? null,
            wbraid: marketingAttr.wbraid ?? null,
            conversion_value_chf: conversionValueChf,
            conversion_date_time: new Date(),
            hashed_email: hashedEmail,
            hashed_phone: hashedPhone,
          })
        } catch (err: any) {
          logger.warn('⚠️ Server-side Google Ads conversion upload failed (non-critical):', err?.message ?? err)
        }
      })()
    } else {
      logger.debug('ℹ️ Skipping Google Ads conversion upload — no click ID for this booking')
    }

    // ============ LAYER 11b: META CONVERSIONS API (CAPI) UPLOAD ============
    // Fire-and-forget. Sends a Purchase event to Meta's CAPI even when the browser
    // Pixel fires too — Meta deduplicates via event_id. Requires at least one user
    // signal (fbclid, fbc, fbp, email, or phone) to be meaningful.
    ;(async () => {
      try {
        const normalizedEmail = (userData.email ?? '').trim().toLowerCase()
        const normalizedPhone = (userData.phone ?? '').replace(/\s+/g, '').replace(/^00/, '+')
        const hashedEmail = normalizedEmail ? await sha256Hex(normalizedEmail) : null
        const hashedPhone = normalizedPhone.startsWith('+') ? await sha256Hex(normalizedPhone) : null

        const conversionValueChf = (netAmountRappen > 0 ? netAmountRappen : totalAmountRappen) / 100

        await recordAndSendCapiEvent({
          appointment_id: newAppointment.id,
          tenant_id: tenantId ?? null,
          event_name: 'Purchase',
          conversion_value_chf: conversionValueChf,
          conversion_date_time: new Date(),
          fbclid: marketingAttr?.fbclid ?? null,
          fbc: marketingAttr?.fbc ?? null,
          fbp: marketingAttr?.fbp ?? null,
          hashed_email: hashedEmail,
          hashed_phone: hashedPhone,
          client_ip: ipAddress ?? null,
          user_agent: getHeader(event, 'user-agent') ?? null,
          event_source_url: getHeader(event, 'referer') ?? null,
        })
      } catch (err: any) {
        logger.warn('⚠️ Meta CAPI upload failed (non-critical):', err?.message ?? err)
      }
    })()

    // ============ LAYER 12: LINK booking_events.completed TO APPOINTMENT ============
    // Closes the first-party funnel so we can answer "which marketing session
    // produced which appointment?" with a single join.
    if (body.marketing_session_id) {
      ;(async () => {
        try {
          await supabase
            .from('booking_events')
            .update({ appointment_id: newAppointment.id })
            .eq('session_id', body.marketing_session_id)
            .eq('event_type', 'completed')
            .is('appointment_id', null)
        } catch (err: any) {
          logger.warn('⚠️ Could not link booking_events to appointment (non-critical):', err?.message ?? err)
        }
      })()
    }

    // ============ LAYER 13: STORE ACQUISITION ATTRIBUTION ON USER ============
    // For new customers only, and only if not already set.
    // This lets us attribute ALL future bookings and revenue back to the original
    // marketing source — enabling true LTV-per-channel analysis.
    if (isNewCustomer && (marketingAttr || body.marketing_session_id)) {
      ;(async () => {
        try {
          // Resolve referrer page from booking_redirects if we have a marketing_session_id
          let referrerPage: string | null = null
          if (body.marketing_session_id) {
            const { data: redirect } = await supabase
              .from('booking_redirects')
              .select('referrer_page')
              .eq('session_id', body.marketing_session_id)
              .maybeSingle()
            referrerPage = redirect?.referrer_page ?? null
          }

          const source = marketingAttr?.utm_source ?? (referrerPage ? 'organic/direct' : null)
          const medium = marketingAttr?.utm_medium ?? (marketingAttr?.gclid ? 'cpc' : referrerPage ? 'organic' : null)

          // Also read utm_term from booking_redirects if not in marketingAttr
          let utmTerm = marketingAttr?.utm_term ?? null
          if (!utmTerm && body.marketing_session_id) {
            const { data: redirectTerm } = await supabase
              .from('booking_redirects')
              .select('utm_term')
              .eq('session_id', body.marketing_session_id)
              .maybeSingle()
            utmTerm = redirectTerm?.utm_term ?? null
          }

          await supabase
            .from('users')
            .update({
              acquisition_source: source,
              acquisition_medium: medium,
              acquisition_campaign: marketingAttr?.utm_campaign ?? null,
              acquisition_term: utmTerm,
              acquisition_referrer_page: referrerPage,
              acquisition_gclid: marketingAttr?.gclid ?? null,
              acquisition_at: new Date().toISOString(),
            })
            .eq('id', userData.id)
            .is('acquisition_at', null) // Never overwrite existing attribution
        } catch (err: any) {
          logger.warn('⚠️ Could not write acquisition attribution to user (non-critical):', err?.message ?? err)
        }
      })()
    }

    // ============ LAYER 10: RETURN RESPONSE ============
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
