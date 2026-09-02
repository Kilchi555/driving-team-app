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
import { netAfterAppointmentDiscount, resolveAppointmentDiscount } from '~/server/utils/resolve-appointment-discount'
import { findStaffBusyOverlap } from '~/server/utils/time-range-overlap'
import { abortCheckoutAfterBenefitLockFail, benefitLockUnavailablePayload, lockCheckoutBenefits } from '~/server/utils/checkout-benefits'
import { ensureClientPickupLocation } from '~/server/utils/ensure-client-pickup-location'
import { calculateAdminFee } from '~/server/utils/admin-fee'
import { resolveVehicleSettings, calculateVehicleCost } from '~/server/utils/vehicle-availability'
import { resolveRoomSettings, pickAvailableRoomId, type RoomServiceType } from '~/server/utils/room-availability'
import { logFallbackUsed } from '~/server/utils/log-fallback'
import { resolveMarketingAttribution } from '~/server/utils/resolve-marketing-attribution'
import { stampFirstTouchAcquisition } from '~/server/utils/first-touch-acquisition'
import { quoteTravelFee } from '~/server/utils/travel-fee-quote'
import { shouldHoldAppointmentUntilPaid } from '~/server/utils/pay-before-confirm'
import { createWalleeCheckoutForPayment, releaseUnpaidPendingAppointment } from '~/server/utils/wallee-appointment-checkout'
import { applyRequestedStudentCredit } from '~/server/utils/apply-student-credit'
import { guestSlotCategoryMismatchReason, invalidDrivingLessonBasePriceReason } from '~/server/utils/guest-booking-price-rule'

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
  /** Default true: apply available wallet credit before checkout / invoice. */
  apply_available_credit?: boolean
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
      throw createError({
        statusCode: 401,
        statusMessage: 'Bitte melde dich an oder registriere dich',
        data: { code: 'NO_PROFILE' }
      })
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

    const categoryMismatch = guestSlotCategoryMismatchReason({
      slotCategoryCode: slot.category_code,
      bodyCategoryCode: body.category_code,
    })
    if (categoryMismatch) {
      logger.warn('❌ Category does not match reserved slot:', {
        reason: categoryMismatch,
        slot_category_code: slot.category_code,
        body_category_code: body.category_code,
        slot_id: body.slot_id,
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Die gewählte Kategorie passt nicht zum reservierten Zeitslot.',
        data: { code: 'CATEGORY_SLOT_MISMATCH' },
      })
    }

    const busyOverlap = await findStaffBusyOverlap(supabase, {
      staffId: slot.staff_id,
      startTime: slot.start_time,
      endTime: slot.end_time,
      tenantId: slot.tenant_id,
    })
    if (busyOverlap) {
      logger.warn('❌ Slot overlaps external busy time:', body.slot_id)
      throw createError({
        statusCode: 409,
        statusMessage: 'Dieser Termin liegt in einer gesperrten Zeit. Bitte wähle einen anderen Slot.',
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
      throw createError({
        statusCode: 403,
        statusMessage: 'Dieses Konto gehört zu einer anderen Fahrschule',
        data: { code: 'WRONG_TENANT' }
      })
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

    const [pricingRuleRes, adminFeeRuleRes, locationSettingsRes, categorySettingsRes, eventPriceRes, eventTypeRes] = await Promise.all([
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
      // per_event_type fallback: event_price keyed by event_type_code
      supabase
        .from('pricing_rules')
        .select('price_per_minute_rappen, base_duration_minutes, duration_multiplier, weekend_multiplier, evening_multiplier')
        .eq('event_type_code', body.category_code)
        .eq('tenant_id', tenantId)
        .eq('rule_type', 'event_price')
        .eq('is_active', true)
        .lte('valid_from', new Date().toISOString())
        .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString())
        .maybeSingle(),
      supabase
        .from('event_types')
        .select('code, require_payment, public_bookable')
        .eq('tenant_id', tenantId)
        .eq('code', body.category_code)
        .eq('is_active', true)
        .maybeSingle(),
    ])

    const pricingRule = pricingRuleRes.data || eventPriceRes.data
    const pricingError = pricingRuleRes.error
    const freePublicEvent =
      !!eventTypeRes.data &&
      eventTypeRes.data.require_payment === false &&
      eventTypeRes.data.public_bookable !== false
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
    } else if (freePublicEvent) {
      // Free public event type (e.g. Erstgespräch) — intentional zero price
      totalAmountRappen = 0
      logger.debug('💰 Free public event type — price 0', { category_code: body.category_code })
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

    // Fahrstunden may still net to CHF 0 via Rabatt/Gutschein/Guthaben.
    // Reject only a missing/zero base_price rule (not intentional free events).
    const basePriceProblem = invalidDrivingLessonBasePriceReason({
      ruleType: pricingRuleRes.data ? 'base_price' : 'event_price',
      allowFreePublicEvent: freePublicEvent,
      hasPricingRule: !!pricingRuleRes.data,
      pricePerMinuteRappen: pricingRuleRes.data?.price_per_minute_rappen,
    })
    if (basePriceProblem) {
      logger.warn('⚠️ Zero/missing base_price rule for driving lesson, aborting booking', {
        reason: basePriceProblem,
        category_code: body.category_code,
        tenant_id: tenantId,
        price_per_minute_rappen: pricingRuleRes.data?.price_per_minute_rappen ?? null,
      })
      throw createError({
        statusCode: 503,
        statusMessage: 'Der Preis für diese Fahrstunde konnte nicht ermittelt werden. Bitte versuche es in Kürze erneut oder kontaktiere uns direkt.',
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
    const travelFee = await quoteTravelFee(tenantId!, {
      locationId: slot.location_id,
      locationType: body.customer_pickup_plz || body.customer_pickup_address ? 'pickup' : null,
      destinationAddress: body.customer_pickup_address,
      pickupPlz: body.customer_pickup_plz,
    })
    const travelFeeRappen = travelFee.fee_rappen || 0

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

    const { data: tenantPayPolicy } = await supabase
      .from('tenants')
      .select('booking_policy, slug, wallee_enabled')
      .eq('id', tenantId)
      .maybeSingle()
    const mayHoldUntilPaid =
      tenantPayPolicy?.booking_policy?.require_payment_before_confirm === true
      && resolvedPaymentMethod === 'wallee'

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
      type: body.category_code,  // Category or event type code
      event_type_code: eventTypeRes.data?.code || body.appointment_type || 'lesson',
      title: appointmentTitle, // "{Vorname} {Name} - {Ort}"
      description: sanitizedNotes || '', // Use notes as description, or empty string
      status: 'confirmed', // Status: confirmed (not booked)
      original_price_rappen: totalAmountRappen // Add default price
    })
    
    // Prefer client payload; always merge DB + booking_redirects by session so
    // Fahrstunden bookings keep gclid/fbclid when only session_id crossed domains.
    const marketingAttr = await resolveMarketingAttribution(
      supabase,
      body.marketing_session_id,
      body.marketing_attribution,
    )

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
        type: body.category_code,  // Category or event type code
        event_type_code: eventTypeRes.data?.code || body.appointment_type || 'lesson',
        title: appointmentTitle, // "{Vorname} {Name} - {Ort}"
        description: sanitizedNotes || '', // Use notes as description, or empty string
        status: mayHoldUntilPaid ? 'pending' : 'confirmed',
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

    // Persist pickup as reusable client location (staff LocationSelector / Treffpunkte)
    if (body.customer_pickup_address?.trim()) {
      try {
        await ensureClientPickupLocation(supabase, {
          tenantId,
          clientUserId: userData.id,
          address: body.customer_pickup_address,
          name: 'Pickup-Adresse',
          postalCode: body.customer_pickup_plz || null
        })
      } catch (pickupErr: any) {
        logger.warn('⚠️ Could not save booking pickup location (non-fatal):', pickupErr?.message)
      }
    }

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

    const grossAmountRappen = totalAmountRappen + adminFeeRappen + travelFeeRappen

    if (body.discount_code) {
      const resolved = await resolveAppointmentDiscount({
        supabase,
        tenantId: tenantId!,
        code: body.discount_code,
        lessonAmountRappen: totalAmountRappen,
        capAtRappen: grossAmountRappen,
        categoryCode: body.category_code,
        userId: userData.id,
      })
      validatedDiscountAmount = resolved.amountRappen
    } else {
      validatedDiscountAmount = Math.min(validatedDiscountAmount, grossAmountRappen)
    }

    const discountCodeToTrack = validatedDiscountAmount > 0
      ? (body.discount_code || autoDiscountCode)
      : null
    const effectiveDiscountCode = body.discount_code || autoDiscountCode
    const netAmountRappen = netAfterAppointmentDiscount(grossAmountRappen, validatedDiscountAmount)
    const applyAvailableCredit = body.apply_available_credit !== false

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
        ...(mayHoldUntilPaid ? { pay_before_confirm: true } : {}),
        ...(effectiveDiscountCode ? { discount_code: effectiveDiscountCode, discount_auto_applied: !body.discount_code } : {}),
        ...(travelFeeRappen > 0 ? { travel_fee: { km: travelFee.km, billable_km: travelFee.billable_km, fee_rappen: travelFeeRappen, capped: travelFee.capped, label: travelFee.label } } : {}),
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
      if (discountCodeToTrack && tenantId) {
        const locked = await lockCheckoutBenefits({
          supabase,
          tenantId,
          paymentId: newPayment.id,
          code: discountCodeToTrack,
        })
        if (!locked.ok) {
          logger.warn('⚠️ Discount could not be locked, aborting booking', locked.reason)
          await abortCheckoutAfterBenefitLockFail({
            supabase,
            paymentId: newPayment.id,
            appointmentId: newAppointment.id,
          })
          throw createError(benefitLockUnavailablePayload(locked.reason))
        }
      }
    }

    let remainingDue = netAmountRappen
    if (newPayment && applyAvailableCredit && newAppointment.user_id) {
      try {
        const creditResult = await applyRequestedStudentCredit({
          supabase,
          tenantId: tenantId!,
          actorUserId: userData.id,
          studentUserId: newAppointment.user_id,
          payment: newPayment,
          apply: true,
        })
        remainingDue = creditResult.remaining_due_rappen
        if (creditResult.applied_rappen > 0) {
          logger.info('💳 Booking wallet credit applied', {
            paymentId: newPayment.id,
            appliedRappen: creditResult.applied_rappen,
            remainingDue,
          })
        }
      } catch (creditErr: any) {
        logger.error('❌ Booking wallet credit failed:', creditErr?.message)
        if (mayHoldUntilPaid) {
          await releaseUnpaidPendingAppointment({ appointmentId: newAppointment.id, tenantId })
          throw createError({
            statusCode: 500,
            statusMessage: 'Guthaben konnte nicht verrechnet werden',
          })
        }
      }
    }

    let holdUntilPaid = shouldHoldAppointmentUntilPaid({
      requirePaymentBeforeConfirm: tenantPayPolicy?.booking_policy?.require_payment_before_confirm === true,
      paymentMethod: resolvedPaymentMethod,
      amountRappen: remainingDue,
    })
    if (mayHoldUntilPaid && !holdUntilPaid) {
      await supabase
        .from('appointments')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', newAppointment.id)
        .eq('status', 'pending')
    }

    if (holdUntilPaid && !newPayment) {
      await releaseUnpaidPendingAppointment({ appointmentId: newAppointment.id, tenantId })
      throw createError({ statusCode: 500, statusMessage: 'Zahlung konnte nicht erstellt werden' })
    }

    let paymentUrl: string | undefined
    if (holdUntilPaid && newPayment) {
      if (!tenantPayPolicy?.wallee_enabled) {
        await releaseUnpaidPendingAppointment({ appointmentId: newAppointment.id, tenantId })
        throw createError({
          statusCode: 402,
          statusMessage: 'Online-Zahlung ist für dieses Unternehmen nicht aktiviert.',
        })
      }
      if (!(userData.email || '').trim()) {
        await releaseUnpaidPendingAppointment({ appointmentId: newAppointment.id, tenantId })
        throw createError({
          statusCode: 400,
          statusMessage: 'Für die Onlinezahlung ist eine E-Mail-Adresse erforderlich.',
        })
      }

      const existingMeta = (newPayment.metadata && typeof newPayment.metadata === 'object')
        ? newPayment.metadata
        : {}
      await supabase
        .from('payments')
        .update({
          metadata: { ...existingMeta, pay_before_confirm: true },
          updated_at: new Date().toISOString(),
        })
        .eq('id', newPayment.id)
        .eq('tenant_id', tenantId)

      try {
        const checkout = await createWalleeCheckoutForPayment({
          paymentId: newPayment.id,
          tenantId: tenantId!,
          customerEmail: userData.email!,
          customerName: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Kunde',
          customerId: userData.id,
          appointmentId: newAppointment.id,
          startTime: slot.start_time,
          durationMinutes: slot.duration_minutes,
        })
        paymentUrl = checkout.paymentUrl
      } catch (checkoutErr: any) {
        logger.error('❌ Pay-before-confirm checkout failed:', checkoutErr?.message)
        await releaseUnpaidPendingAppointment({ appointmentId: newAppointment.id, tenantId })
        throw createError({
          statusCode: checkoutErr?.statusCode || 502,
          statusMessage: checkoutErr?.statusMessage || 'Zahlung konnte nicht gestartet werden',
        })
      }
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

    if (!holdUntilPaid) {
      try {
        const { dispatchAppointmentConfirmation } = await import(
          '~/server/utils/dispatch-appointment-confirmation'
        )
        await dispatchAppointmentConfirmation({
          appointmentId: newAppointment.id,
          userId: userData.id,
          tenantId: tenantId,
        })
      } catch (err: any) {
        logger.warn('⚠️ Could not send appointment confirmation email (non-critical):', err?.message)
      }
    }

    // ============ LAYER 11: SERVER-SIDE GOOGLE ADS CONVERSION UPLOAD ============
    // Awaited (not fire-and-forget): Vercel freezes the isolate after the response
    // returns, which previously dropped some conversion uploads under load.
    if (marketingAttr?.gclid || marketingAttr?.gbraid || marketingAttr?.wbraid) {
      try {
        // Hash email/phone for Enhanced Conversions (improves match rate).
        const normalizedEmail = (userData.email ?? '').trim().toLowerCase()
        const normalizedPhone = (userData.phone ?? '').replace(/\s+/g, '').replace(/^00/, '+')
        const hashedEmail = normalizedEmail ? await sha256Hex(normalizedEmail) : null
        const hashedPhone = normalizedPhone.startsWith('+') ? await sha256Hex(normalizedPhone) : null

        // Conversion value: net amount after discount, fallback to gross.
        // normalizeConversionValueChf inside the uploader floors CHF 0 free bookings.
        const lessonPriceChf = (netAmountRappen > 0 ? netAmountRappen : totalAmountRappen) / 100
        const { resolveBookingConversionValue } = await import('~/server/utils/conversion-value')
        const conversionValue = await resolveBookingConversionValue({
          tenantId,
          categoryCode: body.category_code,
          eventTypeCode: body.appointment_type,
          isNewCustomer,
          lessonPriceChf,
        })

        await recordAndUploadConversion({
          appointment_id: newAppointment.id,
          tenant_id: tenantId ?? null,
          gclid: marketingAttr.gclid ?? null,
          gbraid: marketingAttr.gbraid ?? null,
          wbraid: marketingAttr.wbraid ?? null,
          conversion_value_chf: conversionValue.value_chf,
          conversion_date_time: new Date(),
          hashed_email: hashedEmail,
          hashed_phone: hashedPhone,
          is_new_customer: isNewCustomer,
        })
      } catch (err: any) {
        logger.warn('⚠️ Server-side Google Ads conversion upload failed (non-critical):', err?.message ?? err)
      }
    } else {
      logger.debug('ℹ️ Skipping Google Ads conversion upload — no click ID for this booking')
    }

    // ============ LAYER 11b: META CONVERSIONS API (CAPI) UPLOAD ============
    // Awaited: Vercel freezes the isolate after the response. Pixel still fires
    // in the browser — Meta deduplicates via event_id.
    let sentMetaPurchase = false
    try {
      const normalizedEmail = (userData.email ?? '').trim().toLowerCase()
      const normalizedPhone = (userData.phone ?? '').replace(/\s+/g, '').replace(/^00/, '+')
      const hashedEmail = normalizedEmail ? await sha256Hex(normalizedEmail) : null
      const hashedPhone = normalizedPhone.startsWith('+') ? await sha256Hex(normalizedPhone) : null

      const { maybeSendMetaBookingPurchase } = await import('~/server/utils/meta-booking-conversion')
      sentMetaPurchase = tenantId
        ? await maybeSendMetaBookingPurchase({
            supabase,
            appointmentId: newAppointment.id,
            userId: userData.id,
            tenantId,
            fbclid: marketingAttr?.fbclid,
            fbc: marketingAttr?.fbc,
            fbp: marketingAttr?.fbp,
            conversionValueChf: (netAmountRappen > 0 ? netAmountRappen : totalAmountRappen) / 100,
            hashedEmail,
            hashedPhone,
            clientIp: ipAddress ?? null,
            userAgent: getHeader(event, 'user-agent') ?? null,
            eventSourceUrl: getHeader(event, 'referer') ?? null,
            deferUntilPaid: !!holdUntilPaid,
          })
        : false
    } catch (err: any) {
      logger.warn('⚠️ Meta CAPI upload failed (non-critical):', err?.message ?? err)
    }

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

    // ============ LAYER 13: FIRST-TOUCH ON USER (never overwrite) ============
    try {
      if (tenantId) await stampFirstTouchAcquisition({
        userId: userData.id,
        tenantId,
        email: userData.email,
        phone: userData.phone,
        attribution: marketingAttr,
        marketingSessionId: body.marketing_session_id,
        fallbackSource: isNewCustomer ? 'organic/direct' : undefined,
        fallbackMedium: isNewCustomer ? 'organic' : undefined,
        lookupAttributedProposal: true,
        supabase,
      })
    } catch (err: any) {
      logger.warn('⚠️ Could not write first-touch acquisition (non-critical):', err?.message ?? err)
    }

    // ============ LAYER 10: RETURN RESPONSE ============
    return {
      success: true,
      appointment_id: newAppointment.id,
      payment_id: newPayment?.id || null,
      send_meta_purchase: sentMetaPurchase,
      requires_payment: !!holdUntilPaid,
      paymentUrl: paymentUrl || null,
      message: holdUntilPaid
        ? 'Platz reserviert. Bitte Zahlung abschliessen.'
        : 'Appointment created successfully.',
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
