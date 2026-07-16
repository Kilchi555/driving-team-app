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
import { sendSMS } from '~/server/utils/sms'
import { sendEmail } from '~/server/utils/email'
import { roundToNearest5Rappen } from '~/utils/rounding'
import { logger } from '~/utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { getClientIP } from '~/server/utils/ip-utils'
import { recordAndUploadConversion, sha256Hex } from '~/server/utils/google-ads-conversion'
import { recordAndSendCapiEvent } from '~/server/utils/meta-capi'
import { sanitizeString } from '~/server/utils/validators'
import { calculateAdminFee } from '~/server/utils/admin-fee'

interface GuestBookRequest {
  // Booking identifiers
  slot_id: string
  session_id: string
  tenant_slug: string
  category_code: string
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
  // Optional booking data
  notes?: string
  vehicle_mode?: 'school' | 'own' | null
  room_id?: string | null
  customer_pickup_plz?: string | null
  customer_pickup_address?: string | null
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

  if (!body.slot_id || !body.session_id || !body.tenant_slug || !body.category_code) {
    throw createError({ statusCode: 400, statusMessage: 'slot_id, session_id, tenant_slug und category_code sind erforderlich' })
  }

  // ── Resolve tenant + policy ──────────────────────────────────────────────
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, slug, booking_policy, twilio_from_sender, primary_color, logo_wide_url, logo_url, logo_square_url')
    .eq('slug', body.tenant_slug)
    .eq('is_active', true)
    .single()

  if (tenantErr || !tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Fahrschule nicht gefunden' })
  }

  const rawPolicy = (tenant.booking_policy as any) ?? {}
  const policy = { ...DEFAULT_BOOKING_POLICY, ...rawPolicy }

  // Guest booking is only allowed when registration is NOT required
  if (policy.registration_required) {
    throw createError({ statusCode: 403, statusMessage: 'Für diese Fahrschule ist eine Registrierung erforderlich' })
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

  if (!slot.is_available) {
    throw createError({ statusCode: 409, statusMessage: 'Dieser Zeitslot ist nicht mehr verfügbar' })
  }

  const isReservedBySession = slot.reserved_by_session === body.session_id
  const reservationStillValid = slot.reserved_until && new Date(slot.reserved_until) > new Date()

  if (!isReservedBySession || !reservationStillValid) {
    throw createError({ statusCode: 409, statusMessage: 'Die Reservierung ist abgelaufen. Bitte wähle erneut einen Zeitslot.' })
  }

  // ── Check for duplicate phone/email in parallel ──────────────────────────
  const phone = body.phone?.trim() || null
  const email = body.email?.trim() || null

  const [phoneCheckResult, emailCheckResult] = await Promise.all([
    phone
      ? supabase.from('users').select('id').eq('phone', phone).eq('tenant_id', tenantId).maybeSingle()
      : Promise.resolve({ data: null }),
    email
      ? supabase.from('users').select('id').eq('email', email).eq('tenant_id', tenantId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (phoneCheckResult.data) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Diese Telefonnummer ist bereits mit einem Konto verbunden. Bitte melde dich an.',
      data: { code: 'DUPLICATE_PHONE' },
    })
  }

  if (emailCheckResult.data) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Diese E-Mail-Adresse ist bereits mit einem Konto verbunden. Bitte melde dich an.',
      data: { code: 'DUPLICATE_EMAIL' },
    })
  }

  // ── Create guest user (pending onboarding, no Supabase Auth account) ──────
  const newUserId = uuidv4()
  const onboardingToken = uuidv4()
  const tokenExpiry = new Date()
  tokenExpiry.setDate(tokenExpiry.getDate() + 30)

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
      category: [body.category_code],
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

  // ── Parallel: pricing + marketing attribution + location name ────────────
  const [pricingResult, attrResult, locationResult] = await Promise.all([
    supabase
      .from('pricing_rules')
      .select('price_per_minute_rappen, duration_multiplier, weekend_multiplier, evening_multiplier, admin_fee_rappen, admin_fee_applies_from')
      .eq('tenant_id', tenantId)
      .eq('category_code', body.category_code)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    body.marketing_attribution
      ? Promise.resolve({ data: null })
      : body.marketing_session_id
        ? supabase
            .from('marketing_attributions')
            .select('gclid, gbraid, wbraid, fbclid, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term')
            .eq('session_id', body.marketing_session_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),

    supabase
      .from('locations')
      .select('name')
      .eq('id', slot.location_id)
      .maybeSingle(),
  ])

  const pricingRule = pricingResult.data
  const marketingAttr = body.marketing_attribution ?? attrResult.data ?? null
  const location = locationResult.data

  // ── Calculate lesson price ────────────────────────────────────────────────
  let totalAmountRappen = 0

  if (pricingRule) {
    let price = Number(pricingRule.price_per_minute_rappen) * slot.duration_minutes

    if (pricingRule.duration_multiplier && pricingRule.duration_multiplier !== '1.00') {
      price *= parseFloat(pricingRule.duration_multiplier)
      price = Math.round(price)
    }

    const apptStart = new Date(slot.start_time)
    const dayOfWeek = apptStart.getDay()
    if ((dayOfWeek === 0 || dayOfWeek === 6) && pricingRule.weekend_multiplier && pricingRule.weekend_multiplier !== '1.00') {
      price *= parseFloat(pricingRule.weekend_multiplier)
      price = Math.round(price)
    }

    const hour = apptStart.getHours()
    if (hour >= 18 && pricingRule.evening_multiplier && pricingRule.evening_multiplier !== '1.00') {
      price *= parseFloat(pricingRule.evening_multiplier)
      price = Math.round(price)
    }

    totalAmountRappen = roundToNearest5Rappen(Math.round(price))
  }

  // ── Calculate admin fee ───────────────────────────────────────────────────
  const adminFeeResult = await calculateAdminFee({
    supabase,
    userId: newUserId,
    tenantId,
    categoryCode: body.category_code,
    adminFeeRappenFromRule: pricingRule?.admin_fee_rappen ?? undefined,
    adminFeeAppliesFromRule: pricingRule?.admin_fee_applies_from ?? undefined,
  })
  const adminFeeRappen = adminFeeResult.adminFeeRappen
  const grossAmountRappen = totalAmountRappen + adminFeeRappen

  // ── Build appointment title ───────────────────────────────────────────────
  const studentName = `${body.first_name?.trim() || ''} ${body.last_name?.trim() || ''}`.trim()
  const appointmentTitle = location?.name
    ? `${studentName} - ${location.name}`
    : studentName

  const sanitizedNotes = body.notes ? sanitizeString(body.notes) : ''

  // ── Create appointment ────────────────────────────────────────────────────
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
      type: body.category_code,
      event_type_code: 'lesson',
      title: appointmentTitle,
      description: sanitizedNotes,
      status: 'confirmed',
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
      room_id: body.room_id ?? null,
    })
    .select()
    .single()

  if (apptErr || !newAppointment) {
    logger.error('❌ Appointment creation failed (guest):', apptErr)
    // Best-effort cleanup: delete the user we just created
    supabase.from('users').delete().eq('id', newUserId).then(({ error }) => {
      if (error) logger.warn('⚠️ Could not clean up orphaned guest user:', newUserId, error.message)
    })
    throw createError({ statusCode: 500, statusMessage: 'Termin konnte nicht erstellt werden' })
  }

  logger.debug('✅ Guest appointment created:', newAppointment.id)

  // ── Create payment record (pending cash/invoice) ──────────────────────────
  await supabase
    .from('payments')
    .insert({
      appointment_id: newAppointment.id,
      user_id: newUserId,
      tenant_id: tenantId,
      staff_id: slot.staff_id,
      lesson_price_rappen: totalAmountRappen,
      admin_fee_rappen: adminFeeRappen,
      products_price_rappen: 0,
      discount_amount_rappen: 0,
      total_amount_rappen: grossAmountRappen,
      payment_status: 'pending',
      payment_method: 'cash',
      payment_provider: null,
      description: appointmentTitle,
      currency: 'CHF',
      created_by: newUserId,
      metadata: {
        source: 'guest_booking',
        admin_fee_reason: adminFeeResult.reason,
      },
    })

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
        category_code: body.category_code,
        guest_name: studentName,
      },
    })
    .then()
    .catch(() => {})

  // ── Trigger availability recalculation (fire-and-forget) ─────────────────
  $fetch('/api/availability/queue-recalc', {
    method: 'POST',
    body: { staff_id: slot.staff_id, tenant_id: tenantId, trigger: 'appointment' },
  }).catch(() => {})

  // ── Send onboarding SMS + Email (fire-and-forget) ────────────────────────
  // Priority: Email > SMS (only send SMS if no email)
  const tenantName = (tenant as any).twilio_from_sender || tenant.name || 'Deine Fahrschule'
  const smsEnabled = policy.onboarding_sms_enabled !== false
  const emailEnabled = policy.onboarding_email_enabled === true
  const onboardingLink = `https://app.simy.ch/onboarding/${onboardingToken}`
  let onboardingSmsSent = false
  let onboardingEmailSent = false

  // Email has priority: if email available and enabled, send email only
  if (email && emailEnabled) {
    const primaryColor = (tenant as any).primary_color || '#2563eb'
    const logoUrl = (tenant as any).logo_wide_url || (tenant as any).logo_url || (tenant as any).logo_square_url || null
    const customerName = `${body.first_name || ''} ${body.last_name || ''}`.trim() || 'Kunde'
    const displayTenantName = tenant.name || 'Deine Fahrschule'
    
    // Load staff and location info for email
    let staffName = 'Dein Fahrlehrer'
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
    const formattedDate = appointmentDate.toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const formattedTime = appointmentDate.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
    
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
                  <span style="color:#6b7280;font-size:13px;">Fahrlehrer</span><br>
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
          to: email,
          subject: `Termin bestätigt — Konto aktivieren bei ${displayTenantName}`,
          html: emailHtml,
          senderName: displayTenantName,
        })
        logger.debug('✅ Onboarding email sent to guest:', email)
      } catch (err: any) {
        logger.warn('⚠️ Onboarding email failed (non-critical):', err.message)
      }
    })()
  }
  // Send SMS only if no email or email not enabled
  else if (phone && smsEnabled) {
    const loginLink = `https://app.simy.ch/${tenant.slug}`
    const message = `Hallo ${body.first_name}!\n\nDein Termin wurde bestätigt. Aktiviere jetzt dein kostenloses Konto um deine Buchungen zu verwalten:\n${onboardingLink}\n\nAnmeldung: ${loginLink}\n\n(Link 30 Tage gültig)\n${tenantName}`

    onboardingSmsSent = true
    ;(async () => {
      try {
        await sendSMS({ to: formatSwissPhoneNumber(phone), message, senderName: tenantName })
        logger.debug('✅ Onboarding SMS sent to guest:', phone)
      } catch (err: any) {
        logger.warn('⚠️ Onboarding SMS failed (non-critical):', err.message)
      }
    })()
  }

  // ── Google Ads + Meta CAPI conversion (fire-and-forget) ──────────────────
  ;(async () => {
    try {
      const hashedEmail = email ? await sha256Hex(email.toLowerCase().trim()) : null
      const hashedPhone = phone ? await sha256Hex(formatSwissPhoneNumber(phone)) : null

      await recordAndUploadConversion({
        appointment_id: newAppointment.id,
        tenant_id: tenantId,
        gclid: marketingAttr?.gclid ?? null,
        gbraid: marketingAttr?.gbraid ?? null,
        wbraid: marketingAttr?.wbraid ?? null,
        conversion_date_time: new Date(),
        conversion_value_chf: grossAmountRappen / 100,
        hashed_email: hashedEmail,
        hashed_phone: hashedPhone,
      })
    } catch (e: any) {
      logger.warn('⚠️ Google Ads conversion upload failed (guest):', e.message)
    }
  })()

  ;(async () => {
    try {
      const hashedEmail = email ? await sha256Hex(email.toLowerCase().trim()) : null
      const hashedPhone = phone ? await sha256Hex(formatSwissPhoneNumber(phone)) : null

      await recordAndSendCapiEvent({
        appointment_id: newAppointment.id,
        tenant_id: tenantId,
        event_name: 'Purchase',
        conversion_date_time: new Date(),
        fbclid: marketingAttr?.fbclid ?? null,
        fbc: marketingAttr?.fbc ?? null,
        fbp: marketingAttr?.fbp ?? null,
        conversion_value_chf: grossAmountRappen / 100,
        hashed_email: hashedEmail,
        hashed_phone: hashedPhone,
        client_ip: ip,
      })
    } catch (e: any) {
      logger.warn('⚠️ Meta CAPI event failed (guest):', e.message)
    }
  })()

  // ── Send appointment confirmation email (customer) + new-booking notification
  // (staff). AWAITED on purpose: Vercel freezes the serverless function right
  // after the response is returned, so a fire-and-forget call here was
  // frequently cut off before either email actually went out — same root
  // cause that broke staff "new online booking" notifications.
  try {
    if (email) {
      logger.debug('📧 Triggering confirmation email for guest appointment:', newAppointment.id)
      await $fetch('/api/reminders/send-appointment-confirmation', {
        method: 'POST',
        body: {
          appointmentId: newAppointment.id,
          userId: newUserId,
          tenantId: tenantId
        }
      })
      logger.debug('✅ Confirmation email triggered for guest:', email)
    }
  } catch (err: any) {
    logger.warn('⚠️ Confirmation email trigger failed (guest, non-critical):', err.message)
  }

  return {
    success: true,
    appointment_id: newAppointment.id,
    start_time: newAppointment.start_time,
    end_time: newAppointment.end_time,
    onboarding_sms_sent: onboardingSmsSent,
    onboarding_email_sent: onboardingEmailSent,
  }
})
