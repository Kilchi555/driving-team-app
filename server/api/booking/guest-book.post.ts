/**
 * POST /api/booking/guest-book
 *
 * Guest booking endpoint — allows customers to complete a booking without
 * creating a password-protected account upfront.
 *
 * Flow:
 *  1. Verify tenant + booking policy (registration_required must be false)
 *  2. Validate guest contact data against booking_required_fields
 *  3. Verify the slot is still reserved for this session
 *  4. Create a pending user record (no Supabase Auth account yet)
 *  5. Look up pricing + create appointment + create payment record
 *  6. Mark slot as booked
 *  7. Send onboarding SMS/email so customer can activate account later
 *
 * Security:
 *  - Rate limited by IP (5 bookings / 10 minutes)
 *  - Tenant + slot validation
 *  - No auth required (by design)
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { DEFAULT_BOOKING_POLICY } from '~/server/api/admin/booking-policy.get'
import { resolveMarketingAttribution } from '~/server/utils/resolve-marketing-attribution'
import { stampFirstTouchAcquisition } from '~/server/utils/first-touch-acquisition'
import { saveAcquisitionSelfReport } from '~/server/utils/save-acquisition-self-report'
import { sendTenantSMS } from '~/server/utils/sms'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { upsertMarketingLeadSafe, categoriesFromUserCategory } from '~/server/utils/upsert-marketing-lead'
import { getClientIP } from '~/server/utils/ip-utils'
import { sha256Hex } from '~/server/utils/google-ads-conversion'
import { sanitizeString } from '~/server/utils/validators'
import { calculateAdminFee } from '~/server/utils/admin-fee'
import { ensureClientPickupLocation } from '~/server/utils/ensure-client-pickup-location'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { quoteTravelFee } from '~/server/utils/travel-fee-quote'
import { findStaffBusyOverlap } from '~/server/utils/time-range-overlap'
import { shouldHoldAppointmentUntilPaid } from '~/server/utils/pay-before-confirm'
import {
  loadOnlineBookingPaymentPolicy,
  onlineBookingPaymentProvider,
  resolveOnlineBookingPaymentMethod,
} from '~/server/utils/resolve-online-booking-payment-method'
import { checkoutAppUrl, createWalleeCheckoutForPayment, releaseUnpaidPendingAppointment } from '~/server/utils/wallee-appointment-checkout'
import { applyRequestedStudentCredit } from '~/server/utils/apply-student-credit'
import { netAfterAppointmentDiscount, resolveAppointmentDiscount } from '~/server/utils/resolve-appointment-discount'
import { abortCheckoutAfterBenefitLockFail, benefitLockUnavailablePayload, lockCheckoutBenefits } from '~/server/utils/checkout-benefits'
import { evaluateClientEmailClaim, pendingContactMismatch } from '~/server/utils/auth-email-claim'
import { resolveVehicleSettings, calculateVehicleCost } from '~/server/utils/vehicle-availability'
import { pickAvailableRoomId, resolveRoomSettings, type RoomServiceType } from '~/server/utils/room-availability'
import { enqueueStaffAvailabilityRecalc } from '~/server/utils/queue-availability-recalc'
import {
  invalidPersistedLessonPricingReason,
  normalizeGuestSlotServiceType,
} from '~/server/utils/guest-booking-price-rule'
import { resolveOfferPrice, throwIfUnpriced } from '~/server/utils/resolve-offer-price'
import { bindPublicSlotOfferIdentity } from '~/server/utils/resolve-booking-offer-identity'
import { bookingIdentityCode } from '~/utils/booking-offer-identity'

interface GuestBookRequest {
  // Booking identifiers
  slot_id: string
  session_id: string
  tenant_slug: string
  category_code?: string
  event_type_code?: string
  appointment_type?: string
  // Guest contact info (basic)
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  // Guest contact info (extended — shown when admin configured them)
  birthdate?: string
  street?: string
  street_nr?: string
  zip?: string
  city?: string
  profession?: string
  acquisition_self_reported?: string
  acquisition_self_reported_note?: string
  // Optional booking data
  notes?: string
  /** Vehicle option key from category/location vehicle_settings */
  vehicle_mode?: string | null
  service_type?: RoomServiceType
  customer_pickup_plz?: string | null
  customer_pickup_address?: string | null
  payment_method?: 'wallee' | 'invoice' | 'cash'
  apply_available_credit?: boolean
  discount_code?: string
  discount_amount_rappen?: number
  // Marketing attribution
  marketing_session_id?: string
  marketing_attribution?: {
    gclid?: string | null
    gbraid?: string | null
    wbraid?: string | null
    fbclid?: string | null
    fbc?: string | null
    fbp?: string | null
    utm_source?: string | null
    utm_medium?: string | null
    utm_campaign?: string | null
    utm_content?: string | null
    utm_term?: string | null
  } | null
}

function formatSwissPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('41')) return `+${digits}`
  if (digits.startsWith('0')) return `+41${digits.slice(1)}`
  if (digits.length === 9) return `+41${digits}`
  return phone
}

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()
  const ip = getClientIP(event)
  const now = new Date().toISOString()

  // ── Rate limiting (IP-based, 5 attempts per 10 minutes) ──────────────────
  const { data: recentAttempts } = await supabase
    .from('audit_logs')
    .select('id')
    .eq('action', 'guest_book_attempt')
    .eq('ip_address', ip)
    .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())

  if ((recentAttempts?.length ?? 0) >= 5) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Buchungsversuche. Bitte warte ein paar Minuten.' })
  }

  // ── Input validation ─────────────────────────────────────────────────────
  const body = await readBody<GuestBookRequest>(event)

  if (!body.slot_id || !body.session_id || !body.tenant_slug || (!body.category_code && !body.event_type_code)) {
    throw createError({ statusCode: 400, statusMessage: 'slot_id, session_id, tenant_slug und category_code oder event_type_code sind erforderlich' })
  }

  // ── Resolve tenant + policy ──────────────────────────────────────────────
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, slug, booking_policy, twilio_from_sender, primary_color, logo_wide_url, logo_url, logo_square_url, business_type, wallee_enabled')
    .eq('slug', body.tenant_slug)
    .eq('is_active', true)
    .single()

  if (tenantErr || !tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Unternehmen nicht gefunden' })
  }

  const terms = await getTenantTerminology(supabase, tenant.id)

  const rawPolicy = (tenant.booking_policy as any) ?? {}
  const policy = { ...DEFAULT_BOOKING_POLICY, ...rawPolicy }

  // Guest booking is only allowed when registration is NOT required
  if (policy.registration_required) {
    throw createError({ statusCode: 403, statusMessage: `Für diese ${terms.businessNoun} ist eine Registrierung erforderlich` })
  }

  // ── Validate required fields against policy ──────────────────────────────
  const requiredFields: string[] = policy.booking_required_fields
  const missingFields = requiredFields.filter((f) => {
    const val = (body as any)[f]
    return !val || String(val).trim() === ''
  })

  if (missingFields.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Pflichtfelder fehlen: ${missingFields.join(', ')}`,
    })
  }

  const tenantId = tenant.id

  // ── Verify slot is reserved by this session ──────────────────────────────
  const { data: slot, error: slotErr } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('id', body.slot_id)
    .eq('tenant_id', tenantId)
    .single()

  if (slotErr || !slot) {
    throw createError({ statusCode: 404, statusMessage: 'Zeitslot nicht gefunden' })
  }

  const busyOverlap = await findStaffBusyOverlap(supabase, {
    staffId: slot.staff_id,
    startTime: slot.start_time,
    endTime: slot.end_time,
    tenantId: tenantId,
  })
  if (busyOverlap) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Dieser Termin liegt in einer gesperrten Zeit. Bitte wähle einen anderen Slot.',
      data: { code: 'SLOT_UNAVAILABLE' },
    })
  }

  if (!slot.is_available) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Dieser Zeitslot ist nicht mehr verfügbar',
      data: { code: 'SLOT_UNAVAILABLE' },
    })
  }

  const isReservedBySession = slot.reserved_by_session === body.session_id
  const reservationStillValid = slot.reserved_until && new Date(slot.reserved_until) > new Date()

  if (!isReservedBySession || !reservationStillValid) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Die Reservierung ist abgelaufen. Bitte wähle erneut einen Zeitslot.',
      data: { code: 'RESERVATION_EXPIRED' },
    })
  }

  const identity = await bindPublicSlotOfferIdentity(supabase, {
    tenantId,
    slotCategoryCode: slot.category_code,
    clientEventTypeCode: body.event_type_code,
    clientCategoryCode: body.category_code,
    clientAppointmentType: body.appointment_type,
    slotId: body.slot_id,
  })
  const offerCode = bookingIdentityCode(identity)

  // Slot-based guest checkout only books Fahrstunden. Theorie/Beratung use the
  // proposal flow in the UI — accepting them here lets attackers load CHF-0
  // consultation/theory rules while still creating a lesson on a reserved slot.
  const serviceTypeNorm = normalizeGuestSlotServiceType(body.service_type)
  if (!serviceTypeNorm.ok) {
    logger.warn('❌ Guest booking rejected: spoofed non-lesson service_type on slot booking', {
      reason: serviceTypeNorm.reason,
      service_type: body.service_type,
      slot_id: body.slot_id,
      category_code: body.category_code,
      tenant_id: tenantId,
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Theorie- und Beratungsanfragen können nicht über den Zeitslot-Checkout gebucht werden.',
      data: { code: 'INVALID_SERVICE_TYPE' },
    })
  }
  const roomServiceType: RoomServiceType = serviceTypeNorm.serviceType
  const categoryForAddOns = identity.categoryCode || offerCode

  // Client-supplied discount_amount_rappen is non-authoritative and ignored.
  const offer = await resolveOfferPrice(supabase, {
    tenantId,
    eventTypeCode: identity.eventTypeCode || '',
    categoryCode: identity.categoryCode,
    durationMinutes: slot.duration_minutes,
    startTime: slot.start_time,
    ruleTypeHint: 'base_price',
  })
  throwIfUnpriced(offer)

  // ── Resolve identity by phone/email match ─────────────────────────────────
  // Loads the full account (not just existence) so we can tell a REAL,
  // activated account (onboarding_status 'completed', has a password) apart
  // from a "shadow" account created by an earlier guest booking that was
  // never activated (onboarding_status 'pending', no password/login at all).
  const phone = body.phone?.trim() || null
  const email = body.email?.trim() || null

  const [phoneCheckResult, emailCheckResult] = await Promise.all([
    phone
      ? supabase.from('users').select('id, onboarding_status, category, phone, email, onboarding_token, onboarding_token_expires').eq('phone', phone).eq('tenant_id', tenantId).maybeSingle()
      : Promise.resolve({ data: null }),
    email
      ? supabase.from('users').select('id, onboarding_status, category, phone, email, onboarding_token, onboarding_token_expires').eq('email', email).eq('tenant_id', tenantId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // A match against a REAL, already-activated account is always a hard block —
  // that person has a password and must log in normally. Otherwise anyone who
  // merely knows someone else's phone/email could attach a booking to their
  // account without proving identity.
  if (phoneCheckResult.data?.onboarding_status === 'completed') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Diese Telefonnummer ist bereits mit einem Konto verbunden. Bitte melde dich an.',
      data: { code: 'DUPLICATE_PHONE' },
    })
  }

  if (emailCheckResult.data?.onboarding_status === 'completed') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Diese E-Mail-Adresse ist bereits mit einem Konto verbunden. Bitte melde dich an.',
      data: { code: 'TENANT_CLIENT_EXISTS' },
    })
  }

  // A match against a still-PENDING "shadow" account is NOT blocked. This
  // tenant explicitly allows password-less booking (registration_required =
  // false), so a repeat guest booking under the same contact details should
  // reuse that same identity instead of spawning yet another duplicate
  // account. Prefer the email match — that's the identifier the existing
  // onboarding/activation link is already tied to; the (rare) case where
  // phone and email each match a *different* pending account is an edge case
  // we don't try to reconcile automatically, we just merge into the email one.
  const existingPendingUser =
    (emailCheckResult.data?.onboarding_status === 'pending' ? emailCheckResult.data : null) ||
    (phoneCheckResult.data?.onboarding_status === 'pending' ? phoneCheckResult.data : null)

  if (existingPendingUser && pendingContactMismatch({
    storedEmail: existingPendingUser.email,
    storedPhone: existingPendingUser.phone,
    incomingEmail: email,
    incomingPhone: phone,
    matchedByEmail: emailCheckResult.data?.id === existingPendingUser.id,
    matchedByPhone: phoneCheckResult.data?.id === existingPendingUser.id,
  })) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Diese Kontaktdaten gehören zu einer offenen Anmeldung mit anderen Angaben. Bitte die ursprüngliche E-Mail und Telefonnummer verwenden oder den Link aus der Nachricht nutzen.',
      data: { code: 'CONTACT_MISMATCH' },
    })
  }

  if (email) {
    const claim = await evaluateClientEmailClaim({
      supabase,
      email,
      tenantId,
      excludeUserId: existingPendingUser?.id || null,
    })
    if (!claim.availableForGuestBooking) {
      throw createError({
        statusCode: 409,
        statusMessage: claim.message,
        data: { code: claim.code },
      })
    }
  }

  const newUserId = existingPendingUser?.id ?? uuidv4()
  const existingTokenValid = !!(
    existingPendingUser?.onboarding_token
    && existingPendingUser.onboarding_token_expires
    && new Date(existingPendingUser.onboarding_token_expires) > new Date()
  )
  const onboardingToken = existingTokenValid
    ? existingPendingUser!.onboarding_token
    : uuidv4()
  const tokenExpiry = new Date()
  tokenExpiry.setDate(tokenExpiry.getDate() + 30)

  const mergedCategories = Array.from(new Set([
    ...(existingPendingUser?.category ?? []),
    ...(offerCode ? [offerCode] : []),
  ]))

  if (existingPendingUser) {
    // Reuse the existing shadow account: refresh whichever contact/address
    // fields were actually provided this time (never clobber previously
    // saved data with a blank just because this booking's form didn't ask
    // for that field again), extend the activation window by another 30
    // days, and merge in the newly booked category.
    const updatePayload: Record<string, any> = {
      category: mergedCategories,
      onboarding_token: onboardingToken,
      onboarding_token_expires: tokenExpiry.toISOString(),
    }
    if (body.first_name?.trim()) updatePayload.first_name = body.first_name.trim()
    if (body.last_name?.trim()) updatePayload.last_name = body.last_name.trim()
    const matchedByEmail = emailCheckResult.data?.id === existingPendingUser.id
    const matchedByPhone = phoneCheckResult.data?.id === existingPendingUser.id
    if (phone && !matchedByEmail) updatePayload.phone = phone
    if (email && !matchedByPhone) updatePayload.email = email
    if (body.birthdate?.trim()) updatePayload.birthdate = body.birthdate.trim()
    if (body.street?.trim()) updatePayload.street = body.street.trim()
    if (body.street_nr?.trim()) updatePayload.street_nr = body.street_nr.trim()
    if (body.zip?.trim()) updatePayload.zip = body.zip.trim()
    if (body.city?.trim()) updatePayload.city = body.city.trim()
    if (body.profession?.trim()) updatePayload.profession = body.profession.trim()

    const { error: updateUserErr } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', newUserId)

    if (updateUserErr) {
      logger.error('❌ Guest user update (merge into existing pending account) failed:', updateUserErr)
      throw createError({ statusCode: 500, statusMessage: 'Benutzerkonto konnte nicht aktualisiert werden' })
    }

    logger.debug('✅ Reused existing pending guest account for new booking:', newUserId)
  } else {
    // ── Create guest user (pending onboarding, no Supabase Auth account) ────
    const { error: insertUserErr } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        first_name: body.first_name?.trim() || '',
        last_name: body.last_name?.trim() || '',
        phone,
        email,
        birthdate: body.birthdate?.trim() || null,
        street: body.street?.trim() || null,
        street_nr: body.street_nr?.trim() || null,
        zip: body.zip?.trim() || null,
        city: body.city?.trim() || null,
        profession: body.profession?.trim() || null,
        category: mergedCategories,
        role: 'client',
        tenant_id: tenantId,
        is_active: true,
        onboarding_status: 'pending',
        onboarding_token: onboardingToken,
        onboarding_token_expires: tokenExpiry.toISOString(),
      })

    if (insertUserErr) {
      logger.error('❌ Guest user creation failed:', insertUserErr)
      if (insertUserErr.code === '23505') {
        throw createError({
          statusCode: 409,
          statusMessage: 'Diese Kontaktdaten sind bereits registriert. Bitte melde dich an.',
          data: { code: 'DUPLICATE' },
        })
      }
      throw createError({ statusCode: 500, statusMessage: 'Benutzerkonto konnte nicht erstellt werden' })
    }

    logger.debug('✅ Guest user created:', newUserId)
  }

  // ── Parallel: marketing + location/vehicle settings (after fail-closed price) ─
  const [marketingAttr, locationResult, categorySettingsRes, adminFeeRuleResult] = await Promise.all([
    resolveMarketingAttribution(supabase, body.marketing_session_id, body.marketing_attribution),
    supabase
      .from('locations')
      .select('name, category_vehicle_settings, category_room_settings')
      .eq('id', slot.location_id)
      .maybeSingle(),
    categoryForAddOns
      ? supabase
          .from('categories')
          .select('vehicle_settings, room_settings')
          .eq('code', categoryForAddOns)
          .eq('tenant_id', tenantId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    categoryForAddOns
      ? supabase
          .from('pricing_rules')
          .select('admin_fee_rappen, admin_fee_applies_from')
          .eq('tenant_id', tenantId)
          .eq('category_code', categoryForAddOns)
          .eq('rule_type', 'admin_fee')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const location = locationResult.data
  const freePublicEvent = offer.kind === 'free'
  const usingBasePriceRule = offer.kind === 'paid' && offer.rule.rule_type === 'base_price'
  const usingEventPriceRule = offer.kind === 'paid' && offer.rule.rule_type === 'event_price'
  const vehicleSettings = resolveVehicleSettings(
    locationResult.data?.category_vehicle_settings,
    categorySettingsRes.data?.vehicle_settings,
    categoryForAddOns
  )

  try {
    await stampFirstTouchAcquisition({
      userId: newUserId,
      tenantId,
      email,
      phone,
      attribution: marketingAttr,
      marketingSessionId: body.marketing_session_id,
      fallbackSource: 'organic/direct',
      fallbackMedium: 'organic',
      lookupAttributedProposal: true,
      supabase,
    })
  } catch (err: any) {
    logger.warn('⚠️ Guest first-touch stamp failed (non-critical):', err?.message ?? err)
  }

  try {
    await saveAcquisitionSelfReport({
      userId: newUserId,
      tenantId,
      source: body.acquisition_self_reported,
      note: body.acquisition_self_reported_note,
      fillFirstTouchIfEmpty: true,
      supabase,
    })
  } catch (err: any) {
    logger.warn('⚠️ Guest self-report failed (non-critical):', err?.message ?? err)
  }

  // ── Calculate lesson price (authoritative server resolver) ───────────────
  let totalAmountRappen = offer.priceRappen
  if (body.vehicle_mode) {
    const vehicleCost = calculateVehicleCost(vehicleSettings, body.vehicle_mode, slot.duration_minutes)
    totalAmountRappen = Math.max(0, totalAmountRappen + vehicleCost)
  }

  // ── Calculate admin fee ───────────────────────────────────────────────────
  // Admin fee is a driving-school category concept — skip for event_price /
  // free public event bookings (no category admin_fee rows exist there).
  const adminFeeRuleRappen = Number(adminFeeRuleResult.data?.admin_fee_rappen || 0)
  const adminFeeAppliesFromRule = adminFeeRuleResult.data?.admin_fee_applies_from != null
    ? Number(adminFeeRuleResult.data.admin_fee_applies_from)
    : null
  const adminFeeResult = await calculateAdminFee({
    supabase,
    userId: newUserId,
    tenantId,
    categoryCode: categoryForAddOns || '',
    adminFeeRappenFromRule: usingBasePriceRule ? adminFeeRuleRappen : 0,
    adminFeeAppliesFromRule: usingBasePriceRule ? adminFeeAppliesFromRule : null,
  })
  const adminFeeRappen = usingBasePriceRule ? adminFeeResult.adminFeeRappen : 0
  const travelFee = await quoteTravelFee(tenantId, {
    locationId: slot.location_id,
    locationType: body.customer_pickup_plz || body.customer_pickup_address ? 'pickup' : null,
    destinationAddress: body.customer_pickup_address,
    pickupPlz: body.customer_pickup_plz,
  })
  const travelFeeRappen = travelFee.fee_rappen || 0
  const grossAmountRappen = totalAmountRappen + adminFeeRappen + travelFeeRappen
  const resolvedDiscount = await resolveAppointmentDiscount({
    supabase,
    tenantId,
    code: body.discount_code,
    lessonAmountRappen: totalAmountRappen,
    capAtRappen: grossAmountRappen,
    categoryCode: categoryForAddOns || undefined,
    userId: newUserId,
  })
  const validatedDiscountAmount = resolvedDiscount.amountRappen
  const netAmountRappen = netAfterAppointmentDiscount(grossAmountRappen, validatedDiscountAmount)

  const paymentPolicy = await loadOnlineBookingPaymentPolicy(supabase, tenantId, tenant.wallee_enabled)
  const paymentResolve = resolveOnlineBookingPaymentMethod({
    requested: body.payment_method,
    policy: paymentPolicy,
  })
  if (paymentResolve.rejectedRequest) {
    logger.warn('⚠️ Guest requested a payment method that is not enabled for online booking — using tenant default', {
      tenantId,
      requested: body.payment_method,
      resolved: paymentResolve.method,
    })
  }
  let resolvedPaymentMethod = paymentResolve.method

  let holdUntilPaid = shouldHoldAppointmentUntilPaid({
    requirePaymentBeforeConfirm: policy.require_payment_before_confirm === true,
    paymentMethod: resolvedPaymentMethod,
    amountRappen: netAmountRappen,
  })
  if (holdUntilPaid) {
    resolvedPaymentMethod = 'wallee'
  }

  // ── Build appointment title ───────────────────────────────────────────────
  const studentName = `${body.first_name?.trim() || ''} ${body.last_name?.trim() || ''}`.trim()
  const appointmentTitle = location?.name
    ? `${studentName} - ${location.name}`
    : studentName

  const sanitizedNotes = body.notes ? sanitizeString(body.notes) : ''

  const roomRule = resolveRoomSettings(
    locationResult.data?.category_room_settings,
    categorySettingsRes.data?.room_settings,
    categoryForAddOns || '',
    roomServiceType
  )
  let autoAssignedRoomId: string | null = null
  if (roomRule.mode !== 'none' && roomRule.allowed_room_ids.length > 0) {
    autoAssignedRoomId = await pickAvailableRoomId(supabase, {
      allowedRoomIds: roomRule.allowed_room_ids,
      startTime: slot.start_time,
      endTime: slot.end_time,
    })
  }

  // ── Create appointment ────────────────────────────────────────────────────
  // Persist event_type_code and category (type) separately. Never invent 'lesson'
  // unless that code exists as a tenant event type (identity resolver).
  const resolvedEventTypeCode = identity.eventTypeCode
  if (!resolvedEventTypeCode) {
    logger.error('❌ Guest booking aborted: event type unresolved', {
      tenant_id: tenantId,
      category_code: identity.categoryCode,
      body_category_code: body.category_code,
      event_type_code: body.event_type_code,
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Die Terminart für diese Buchung konnte nicht ermittelt werden.',
      data: { code: 'EVENT_TYPE_UNRESOLVED' },
    })
  }

  const ruleTypeUsedForGuard = usingBasePriceRule
    ? 'base_price'
    : usingEventPriceRule
      ? 'event_price'
      : 'event_price'

  const lessonPriceMismatch = invalidPersistedLessonPricingReason({
    persistedEventTypeCode: resolvedEventTypeCode,
    ruleTypeUsed: ruleTypeUsedForGuard,
  })
  if (lessonPriceMismatch) {
    logger.error('❌ Guest booking aborted: pricing rule does not match persisted lesson type', {
      reason: lessonPriceMismatch,
      resolvedEventTypeCode,
      ruleTypeUsedForGuard,
      category_code: body.category_code,
      tenant_id: tenantId,
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Der Preis für diese Fahrstunde konnte nicht ermittelt werden.',
      data: { code: 'SERVICE_TYPE_PRICE_MISMATCH' },
    })
  }

  const { data: newAppointment, error: apptErr } = await supabase
    .from('appointments')
    .insert({
      user_id: newUserId,
      tenant_id: tenantId,
      staff_id: slot.staff_id,
      location_id: slot.location_id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      duration_minutes: slot.duration_minutes,
      type: identity.categoryCode || resolvedEventTypeCode,
      event_type_code: resolvedEventTypeCode,
      title: appointmentTitle,
      description: sanitizedNotes,
      status: holdUntilPaid ? 'pending' : 'confirmed',
      original_price_rappen: totalAmountRappen,
      source: 'online',
      created_by: newUserId,
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

  if (apptErr || !newAppointment) {
    logger.error('❌ Appointment creation failed (guest):', apptErr)
    // Best-effort cleanup: only delete the user if we just created a brand-new
    // one. If we reused an existing pending account (existingPendingUser), it
    // has its own booking history — never delete it just because *this*
    // booking attempt failed.
    if (!existingPendingUser) {
      supabase.from('users').delete().eq('id', newUserId).then(({ error }) => {
        if (error) logger.warn('⚠️ Could not clean up orphaned guest user:', newUserId, error.message)
      })
    }
    throw createError({ statusCode: 500, statusMessage: 'Termin konnte nicht erstellt werden' })
  }

  logger.debug('✅ Guest appointment created:', newAppointment.id)

  const chosenVehicleOption = vehicleSettings.options?.find(o => o.key === body.vehicle_mode)
  if (body.vehicle_mode && chosenVehicleOption?.requires_school_vehicle) {
    const { error: vbErr } = await supabase
      .from('vehicle_bookings')
      .insert({
        vehicle_id: null,
        tenant_id: tenantId,
        location_id: slot.location_id,
        category_code: categoryForAddOns || resolvedEventTypeCode,
        start_time: slot.start_time,
        end_time: slot.end_time,
        purpose: 'lesson',
        appointment_id: newAppointment.id,
        booked_by: newUserId,
        status: 'confirmed',
      })
    if (vbErr) {
      logger.warn('⚠️ Guest vehicle_bookings placeholder failed (non-fatal):', vbErr.message)
    }
  }

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
      logger.warn('⚠️ Guest room conflict — clearing assigned room:', autoAssignedRoomId)
      await supabase.from('appointments').update({ room_id: null }).eq('id', newAppointment.id)
      autoAssignedRoomId = null
    } else {
      const { error: rbErr } = await supabase.from('room_bookings').insert({
        room_id: autoAssignedRoomId,
        tenant_id: tenantId,
        start_time: slot.start_time,
        end_time: slot.end_time,
        purpose: 'lesson',
        appointment_id: newAppointment.id,
        booked_by: newUserId,
        status: 'confirmed',
      })
      if (rbErr) {
        logger.warn('⚠️ Guest room_bookings creation failed (non-fatal):', rbErr.message)
        await supabase.from('appointments').update({ room_id: null }).eq('id', newAppointment.id)
        autoAssignedRoomId = null
      }
    }
  }

  // Persist pickup as reusable client location (staff LocationSelector / Treffpunkte)
  if (body.customer_pickup_address?.trim()) {
    try {
      await ensureClientPickupLocation(supabase, {
        tenantId,
        clientUserId: newUserId,
        address: body.customer_pickup_address,
        name: 'Pickup-Adresse',
        postalCode: body.customer_pickup_plz || null
      })
    } catch (pickupErr: any) {
      logger.warn('⚠️ Could not save guest pickup location (non-fatal):', pickupErr?.message)
    }
  }

  // ── Create payment record (pending invoice/wallee — never cash) ───────────
  const { data: newPayment } = await supabase
    .from('payments')
    .insert({
      appointment_id: newAppointment.id,
      user_id: newUserId,
      tenant_id: tenantId,
      staff_id: slot.staff_id,
      lesson_price_rappen: totalAmountRappen,
      admin_fee_rappen: adminFeeRappen,
      products_price_rappen: 0,
      discount_amount_rappen: validatedDiscountAmount,
      total_amount_rappen: netAmountRappen,
      payment_status: 'pending',
      payment_method: resolvedPaymentMethod,
      payment_provider: onlineBookingPaymentProvider(resolvedPaymentMethod),
      description: appointmentTitle,
      currency: 'CHF',
      created_by: newUserId,
      metadata: {
        source: 'guest_booking',
        admin_fee_reason: adminFeeResult.reason,
        ...(freePublicEvent ? { free_public_event: true, allow_zero_completion: true } : {}),
        ...(validatedDiscountAmount > 0 && netAmountRappen <= 0
          ? { allow_zero_completion: true }
          : {}),
        ...(holdUntilPaid ? { pay_before_confirm: true } : {}),
        ...(resolvedDiscount.code ? { discount_code: resolvedDiscount.code } : {}),
        ...(body.vehicle_mode ? { vehicle_mode: body.vehicle_mode, vehicle_cost_rappen: calculateVehicleCost(vehicleSettings, body.vehicle_mode, slot.duration_minutes) } : {}),
        ...(travelFeeRappen > 0 ? { travel_fee: { km: travelFee.km, billable_km: travelFee.billable_km, fee_rappen: travelFeeRappen, capped: travelFee.capped, label: travelFee.label } } : {}),
      },
    })
    .select()
    .single()

  if (newPayment?.id && resolvedDiscount.code && validatedDiscountAmount > 0) {
    const locked = await lockCheckoutBenefits({
      supabase,
      tenantId,
      paymentId: newPayment.id,
      code: resolvedDiscount.code,
    })
    if (!locked.ok) {
      logger.warn('⚠️ Guest discount could not be locked, aborting booking', locked.reason)
      await abortCheckoutAfterBenefitLockFail({
        supabase,
        paymentId: newPayment.id,
        appointmentId: newAppointment.id,
      })
      throw createError(benefitLockUnavailablePayload(locked.reason))
    }
  }

  let remainingDue = netAmountRappen
  if (newPayment && body.apply_available_credit !== false && newUserId) {
    try {
      const creditResult = await applyRequestedStudentCredit({
        supabase,
        tenantId,
        actorUserId: newUserId,
        studentUserId: newUserId,
        payment: newPayment,
        apply: true,
      })
      remainingDue = creditResult.remaining_due_rappen
    } catch (creditErr: any) {
      logger.error('❌ Guest booking wallet credit failed:', creditErr?.message)
      if (holdUntilPaid) {
        await releaseUnpaidPendingAppointment({ appointmentId: newAppointment.id, tenantId })
        throw createError({
          statusCode: 500,
          statusMessage: 'Guthaben konnte nicht verrechnet werden',
        })
      }
    }
  }

  holdUntilPaid = shouldHoldAppointmentUntilPaid({
    requirePaymentBeforeConfirm: policy.require_payment_before_confirm === true,
    paymentMethod: resolvedPaymentMethod,
    amountRappen: remainingDue,
  })
  if (!holdUntilPaid && newAppointment.status === 'pending') {
    await supabase
      .from('appointments')
      .update({ status: 'confirmed', updated_at: now })
      .eq('id', newAppointment.id)
      .eq('status', 'pending')
  }

  let paymentUrl: string | undefined
  if (holdUntilPaid) {
    if (!newPayment?.id) {
      await releaseUnpaidPendingAppointment({ appointmentId: newAppointment.id, tenantId })
      throw createError({ statusCode: 500, statusMessage: 'Zahlung konnte nicht erstellt werden' })
    }
    if (!tenant.wallee_enabled) {
      await releaseUnpaidPendingAppointment({ appointmentId: newAppointment.id, tenantId })
      throw createError({ statusCode: 402, statusMessage: 'Online-Zahlung ist für dieses Unternehmen nicht aktiviert.' })
    }
    if (!email) {
      await releaseUnpaidPendingAppointment({ appointmentId: newAppointment.id, tenantId })
      throw createError({ statusCode: 400, statusMessage: 'Für die Onlinezahlung ist eine E-Mail-Adresse erforderlich.' })
    }
    const existingMeta = (newPayment.metadata && typeof newPayment.metadata === 'object')
      ? newPayment.metadata
      : {}
    await supabase
      .from('payments')
      .update({
        metadata: { ...existingMeta, pay_before_confirm: true },
        updated_at: now,
      })
      .eq('id', newPayment.id)
      .eq('tenant_id', tenantId)
    try {
      const checkout = await createWalleeCheckoutForPayment({
        paymentId: newPayment.id,
        tenantId,
        customerEmail: email!,
        customerName: studentName || 'Kunde',
        customerId: newUserId,
        appointmentId: newAppointment.id,
        startTime: slot.start_time,
        durationMinutes: slot.duration_minutes,
        successUrl: `${checkoutAppUrl()}/booking/availability/${tenant.slug}?guest_paid=1`,
        failedUrl: `${checkoutAppUrl()}/booking/availability/${tenant.slug}?payment_failed=1`,
      })
      paymentUrl = checkout.paymentUrl
    } catch (checkoutErr: any) {
      logger.error('❌ Guest pay-before-confirm checkout failed:', checkoutErr?.message)
      await releaseUnpaidPendingAppointment({ appointmentId: newAppointment.id, tenantId })
      throw createError({
        statusCode: checkoutErr?.statusCode || 502,
        statusMessage: checkoutErr?.statusMessage || 'Zahlung konnte nicht gestartet werden',
      })
    }
  }

  // ── Mark slot as booked ───────────────────────────────────────────────────
  await supabase
    .from('availability_slots')
    .update({
      is_available: false,
      appointment_id: newAppointment.id,
      reserved_by_session: null,
      reserved_until: null,
      updated_at: now,
    })
    .eq('reserved_by_session', body.session_id)
    .eq('tenant_id', tenantId)

  // ── Audit log ─────────────────────────────────────────────────────────────
  await supabase
    .from('audit_logs')
    .insert({
      tenant_id: tenantId,
      user_id: newUserId,
      action: 'guest_book_attempt',
      resource_type: 'appointment',
      resource_id: newAppointment.id,
      status: 'success',
      ip_address: ip,
      metadata: {
        slot_id: body.slot_id,
        session_id: body.session_id,
        category_code: identity.categoryCode,
        event_type_code: resolvedEventTypeCode,
        guest_name: studentName,
      },
    })
    .then()
    .catch(() => {})

  // ── Trigger availability recalculation (fire-and-forget) ─────────────────
  await enqueueStaffAvailabilityRecalc({
    staff_id: slot.staff_id,
    tenant_id: tenantId,
    trigger: 'appointment',
  })

  // ── Send onboarding SMS + Email (fire-and-forget) ────────────────────────
  // Priority: Email > SMS (only send SMS if no email)
  const tenantName = (tenant as any).twilio_from_sender || tenant.name || `Deine ${terms.businessNoun}`
  const smsEnabled = policy.onboarding_sms_enabled !== false
  const emailEnabled = policy.onboarding_email_enabled === true
  const onboardingLink = `https://app.simy.ch/onboarding/${onboardingToken}`
  let onboardingSmsSent = false
  let onboardingEmailSent = false
  const notifyEmail = (existingPendingUser?.email || email || '').trim() || null
  const notifyPhone = (existingPendingUser?.phone || phone || '').trim() || null

  // Email has priority: if email available and enabled, send email only
  if (notifyEmail && emailEnabled) {
    const primaryColor = (tenant as any).primary_color || '#2563eb'
    const logoUrl = (tenant as any).logo_wide_url || (tenant as any).logo_url || (tenant as any).logo_square_url || null
    const customerName = `${body.first_name || ''} ${body.last_name || ''}`.trim() || terms.client
    const displayTenantName = tenant.name || `Deine ${terms.businessNoun}`
    
    // Load staff and location info for email
    let staffName = `Dein ${terms.staff}`
    let locationName = 'Dein Treffpunkt'
    
    if (slot.staff_id) {
      try {
        const { data: staffData } = await supabase.from('users').select('first_name, last_name').eq('id', slot.staff_id).single()
        if (staffData?.first_name && staffData?.last_name) {
          staffName = `${staffData.first_name} ${staffData.last_name}`
        }
      } catch (err) {
        logger.debug('⚠️ Could not load staff name for email')
      }
    }
    
    if (slot.location_id) {
      try {
        const { data: locationData } = await supabase.from('locations').select('name').eq('id', slot.location_id).single()
        if (locationData?.name) {
          locationName = locationData.name
        }
      } catch (err) {
        logger.debug('⚠️ Could not load location name for email')
      }
    }
    
    const appointmentDate = new Date(newAppointment.start_time)
    // Server (Vercel) runs in UTC — without an explicit timeZone these would render
    // the raw UTC time instead of Swiss local time (e.g. 08:30 UTC shown as "08:30"
    // instead of the correct 10:30 during CEST).
    const formattedDate = appointmentDate.toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Zurich' })
    const formattedTime = appointmentDate.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })
    
    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        ${logoUrl ? `<tr><td style="background:#fff;text-align:center;padding:20px 30px 16px;"><img src="${logoUrl}" alt="${displayTenantName}" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 auto;"></td></tr>` : ''}
        <tr><td style="background-color:${primaryColor};padding:40px 30px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:bold;">Termin bestätigt ✓</h1>
        </td></tr>
        <tr><td style="padding:40px 30px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo ${customerName},</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
            dein Termin bei <strong>${displayTenantName}</strong> wurde erfolgreich gebucht. Hier sind deine Buchungsdetails:
          </p>
          
          <!-- Appointment Details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;background-color:#f9fafb;border-radius:8px;">
            <tr><td style="padding:20px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                  <span style="color:#6b7280;font-size:13px;">Datum & Zeit</span><br>
                  <span style="color:#1f2937;font-size:15px;font-weight:bold;">${formattedDate}, ${formattedTime} Uhr</span>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                  <span style="color:#6b7280;font-size:13px;">${terms.staff}</span><br>
                  <span style="color:#1f2937;font-size:15px;font-weight:bold;">${staffName}</span>
                </td></tr>
                <tr><td style="padding:8px 0;">
                  <span style="color:#6b7280;font-size:13px;">Treffpunkt</span><br>
                  <span style="color:#1f2937;font-size:15px;font-weight:bold;">${locationName}</span>
                </td></tr>
              </table>
            </td></tr>
          </table>
          
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:30px 0 20px 0;">
            Aktiviere jetzt dein kostenloses Konto, um deine Buchungen jederzeit einzusehen und zu verwalten:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
            <tr><td align="center">
              <a href="${onboardingLink}" style="display:inline-block;background-color:${primaryColor};color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:bold;">
                Konto aktivieren
              </a>
            </td></tr>
          </table>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:20px 0 0 0;">
            Oder kopiere diesen Link:<br>
            <a href="${onboardingLink}" style="color:${primaryColor};word-break:break-all;">${onboardingLink}</a>
          </p>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:20px 0 0 0;">⏰ Dieser Link ist 30 Tage gültig.</p>
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:30px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:14px;margin:0 0 10px 0;">${displayTenantName}</p>
          <p style="color:#9ca3af;font-size:12px;margin:0;">Diese E-Mail wurde automatisch generiert. Bitte nicht antworten.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    onboardingEmailSent = true
    ;(async () => {
      try {
        await sendEmail({
          to: notifyEmail,
          subject: `Termin bestätigt — Konto aktivieren bei ${displayTenantName}`,
          html: emailHtml,
          senderName: displayTenantName,
        })
        logger.debug('✅ Onboarding email sent to guest:', notifyEmail)
      } catch (err: any) {
        logger.warn('⚠️ Onboarding email failed (non-critical):', err.message)
      }
    })()
  }
  // Send SMS only if no email or email not enabled
  else if (notifyPhone && smsEnabled) {
    // Login link lives in the welcome email after registration — keep SMS short
    const message = `Hallo ${body.first_name}! Termin bestätigt. Konto aktivieren (30 Tage): ${onboardingLink}`

    onboardingSmsSent = true
    ;(async () => {
      try {
        await sendTenantSMS({
          tenantId: tenant.id,
          to: formatSwissPhoneNumber(notifyPhone),
          message,
          purpose: 'student_onboarding',
          senderName: tenantName,
        })
        logger.debug('✅ Onboarding SMS sent to guest:', notifyPhone)
      } catch (err: any) {
        logger.warn('⚠️ Onboarding SMS failed (non-critical):', err.message)
      }
    })()
  }

  // Binding booking conversion — only when confirmed (not a pay-before-confirm hold).
  let sentMetaPurchase = false
  if (!holdUntilPaid) {
    try {
      const hashedEmail = email ? await sha256Hex(email.toLowerCase().trim()) : null
      const hashedPhone = phone ? await sha256Hex(formatSwissPhoneNumber(phone)) : null
      const { reportBindingAppointmentConversionSafely } = await import(
        '~/server/utils/binding-booking-conversion'
      )
      const conversionReport = await reportBindingAppointmentConversionSafely({
        supabase,
        appointmentId: newAppointment.id,
        userId: newUserId,
        tenantId,
        status: 'confirmed',
        previousStatus: null,
        eventTypeCode: resolvedEventTypeCode,
        categoryCode: identity.categoryCode,
        gclid: marketingAttr?.gclid ?? null,
        gbraid: marketingAttr?.gbraid ?? null,
        wbraid: marketingAttr?.wbraid ?? null,
        fbclid: marketingAttr?.fbclid ?? null,
        fbc: marketingAttr?.fbc ?? null,
        fbp: marketingAttr?.fbp ?? null,
        conversionValueChf: grossAmountRappen / 100,
        hashedEmail,
        hashedPhone,
        clientIp: ip,
        marketingSessionId: body.marketing_session_id ?? null,
      })
      sentMetaPurchase = conversionReport.meta === 'sent'
    } catch (e: any) {
      logger.warn('⚠️ Binding booking conversion failed (guest, non-critical):', e.message)
    }
  }
  // Direct dispatch (no nested HTTP). Awaits Resend; on failure queues for cron.
  try {
    if (email && !holdUntilPaid) {
      logger.debug('📧 Triggering confirmation email for guest appointment:', newAppointment.id)
      const { dispatchAppointmentConfirmation } = await import(
        '~/server/utils/dispatch-appointment-confirmation'
      )
      await dispatchAppointmentConfirmation({
        appointmentId: newAppointment.id,
        userId: newUserId,
        tenantId: tenantId,
      })
      logger.debug('✅ Confirmation email triggered for guest:', email)
    }
  } catch (err: any) {
    logger.warn('⚠️ Confirmation email trigger failed (guest, non-critical):', err.message)
  }

  if (email) {
    upsertMarketingLeadSafe({
      tenantId,
      email,
      firstName: body.first_name,
      lastName: body.last_name,
      phone,
      categories: categoriesFromUserCategory(mergedCategories),
      tags: ['client', 'booking'],
      source: 'guest_book',
      sourceLabel: 'Gastbuchung',
    })
  }

  const vehicleLabel = body.vehicle_mode
    ? (vehicleSettings.options?.find(o => o.key === body.vehicle_mode)?.label || null)
    : null
  let roomName: string | null = null
  if (autoAssignedRoomId) {
    const { data: roomRow } = await supabase
      .from('rooms')
      .select('name')
      .eq('id', autoAssignedRoomId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    roomName = roomRow?.name || null
  }

  return {
    success: true,
    appointment_id: newAppointment.id,
    payment_id: newPayment?.id || null,
    vehicle_label: vehicleLabel,
    room_id: autoAssignedRoomId,
    room_name: roomName,
    send_meta_purchase: sentMetaPurchase,
    requires_payment: !!holdUntilPaid,
    paymentUrl: paymentUrl || null,
    start_time: newAppointment.start_time,
    end_time: newAppointment.end_time,
    onboarding_sms_sent: onboardingSmsSent,
    onboarding_email_sent: onboardingEmailSent,
  }
})
