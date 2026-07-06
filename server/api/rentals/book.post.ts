/**
 * POST /api/rentals/book
 * Book a rental vehicle. Requires an active Simy session.
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getRentalUser } from '~/server/utils/rental-auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendTenantEmail } from '~/server/utils/email'

export default defineEventHandler(async (event) => {
  const rentalUser = await getRentalUser(event)
  const { vehicle_id, tenant_slug, start_time, end_time, notes, pricing_tier_type } = await readBody(event)
  const tierType: string = pricing_tier_type || 'hourly'

  if (!vehicle_id || !start_time || !end_time) {
    throw createError({ statusCode: 400, statusMessage: 'vehicle_id, start_time and end_time are required' })
  }

  const start = new Date(start_time)
  const end = new Date(end_time)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid time range' })
  }
  if (start < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Buchungen in der Vergangenheit sind nicht möglich.' })
  }

  const supabase = getSupabaseAdmin()

  // Resolve user's full profile (needed for payment method resolution + role check)
  const { data: renterProfile } = await supabase
    .from('users')
    .select('role, rental_payment_method')
    .eq('id', rentalUser.id)
    .maybeSingle()

  // Resolve tenant
  let tenantId: string
  if (tenant_slug) {
    const { data: t } = await supabase
      .from('tenants')
      .select('id, name, vehicle_rental_settings')
      .or(`slug.eq.${tenant_slug},rental_portal_slug.eq.${tenant_slug}`)
      .maybeSingle()
    if (!t) throw createError({ statusCode: 404, statusMessage: 'Fahrschule nicht gefunden' })
    tenantId = t.id
  } else {
    tenantId = rentalUser.tenant_id
  }

  // Verify vehicle is rentable by this user
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id, name, marke, modell, hourly_rate_rappen, pricing_tiers, location_id, rental_access, rental_requires_lesson, rental_requires_course, rental_lesson_category_codes, rental_course_category_codes')
    .eq('id', vehicle_id)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .gt('hourly_rate_rappen', 0)
    .in('rental_access', ['public', 'invite_only'])
    .maybeSingle()

  if (!vehicle) {
    throw createError({ statusCode: 404, statusMessage: 'Fahrzeug nicht gefunden oder nicht verfügbar.' })
  }

  // ── Booking requirement check ────────────────────────────────────────────────
  const requiresLesson = vehicle.rental_requires_lesson ?? false
  const requiresCourse = vehicle.rental_requires_course ?? false

  if (requiresLesson || requiresCourse) {
    const startDate = start.toISOString().slice(0, 10)
    let lessonOk = !requiresLesson
    let courseOk = !requiresCourse

    // Check lesson requirement
    if (requiresLesson) {
      const lessonCodes: string[] = vehicle.rental_lesson_category_codes ?? []
      let apptQuery = supabase
        .from('appointments')
        .select('id')
        .eq('user_id', rentalUser.id)
        .eq('tenant_id', tenantId)
        .gte('start_time', `${startDate}T00:00:00`)
        .lt('start_time', `${startDate}T23:59:59`)
        .not('status', 'in', '("cancelled","deleted","aborted")')
        .is('deleted_at', null)
        .limit(1)

      if (lessonCodes.length > 0) apptQuery = apptQuery.in('type', lessonCodes)
      const { data: lessons } = await apptQuery
      lessonOk = !!(lessons && lessons.length > 0)
    }

    // Check course enrollment requirement
    if (requiresCourse) {
      const courseCodes: string[] = vehicle.rental_course_category_codes ?? []
      let enrollQuery = supabase
        .from('course_participants')
        .select('id')
        .eq('user_id', rentalUser.id)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .limit(1)

      if (courseCodes.length > 0) {
        // Resolve course_category_ids from course_categories.code
        const { data: courseCategories } = await supabase
          .from('course_categories')
          .select('id')
          .eq('tenant_id', tenantId)
          .in('code', courseCodes)
        const catIds = (courseCategories ?? []).map((c: any) => c.id)

        if (catIds.length > 0) {
          const { data: courses } = await supabase
            .from('courses')
            .select('id')
            .eq('tenant_id', tenantId)
            .in('course_category_id', catIds)
          const courseIds = (courses ?? []).map((c: any) => c.id)
          if (courseIds.length > 0) {
            enrollQuery = enrollQuery.in('course_id', courseIds)
          } else {
            courseOk = false
          }
        } else {
          courseOk = false
        }
      }
      if (courseOk !== false) {
        const { data: enrollment } = await enrollQuery
        courseOk = !!(enrollment && enrollment.length > 0)
      }
    }

    // Both conditions must be met if both are enabled
    if (!lessonOk || !courseOk) {
      const parts: string[] = []
      if (requiresLesson && !lessonOk) {
        const codes = vehicle.rental_lesson_category_codes ?? []
        parts.push(`eine Fahrlektion${codes.length ? ` (${codes.join(', ')})` : ''} am selben Tag`)
      }
      if (requiresCourse && !courseOk) {
        const codes = vehicle.rental_course_category_codes ?? []
        parts.push(`eine aktive Kurseinschreibung${codes.length ? ` (${codes.join(', ')})` : ''}`)
      }
      throw createError({
        statusCode: 422,
        statusMessage: `Dieses Fahrzeug erfordert: ${parts.join(' und ')}.`,
      })
    }
  }

  // Conflict check: vehicle_bookings
  const { data: existingBookings } = await supabase
    .from('vehicle_bookings')
    .select('id')
    .eq('vehicle_id', vehicle_id)
    .neq('status', 'cancelled')
    .lt('start_time', end.toISOString())
    .gt('end_time', start.toISOString())

  if (existingBookings && existingBookings.length > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Das Fahrzeug ist in diesem Zeitraum bereits belegt.' })
  }

  // Conflict check: vehicle_rentals
  const { data: existingRentals } = await supabase
    .from('vehicle_rentals')
    .select('id')
    .eq('vehicle_id', vehicle_id)
    .neq('status', 'cancelled')
    .lt('start_time', end.toISOString())
    .gt('end_time', start.toISOString())

  if (existingRentals && existingRentals.length > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Das Fahrzeug ist in diesem Zeitraum bereits gebucht.' })
  }

  // Load tenant settings for approval flag
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('name, vehicle_rental_settings')
    .eq('id', tenantId)
    .maybeSingle()

  const rentalSettings = (tenantRow?.vehicle_rental_settings as any) ?? {}
  const requiresApproval = rentalSettings.booking_requires_approval !== false

  // Determine payment method:
  // 1. Per-user override (rental_payment_method on users)
  // 2. Tenant default per role (client vs staff)
  // 3. Fallback: invoice
  const isStaff = ['staff', 'admin', 'superadmin', 'external_partner'].includes(renterProfile?.role ?? '')
  const tenantDefault = isStaff
    ? (rentalSettings.default_payment_method_staff ?? 'invoice')
    : (rentalSettings.default_payment_method_client ?? 'invoice')
  const paymentMethod: string = renterProfile?.rental_payment_method ?? tenantDefault

  // Create vehicle_bookings placeholder (blocks the calendar)
  const { data: vehicleBooking } = await supabase
    .from('vehicle_bookings')
    .insert({
      tenant_id: tenantId,
      vehicle_id: vehicle_id,
      location_id: vehicle.location_id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      purpose: 'external_rental',
      status: requiresApproval ? 'pending' : 'confirmed',
      booked_by: rentalUser.id,
    })
    .select('id')
    .single()

  // Resolve the rate for the selected tier
  const pricingTiers: any[] = vehicle.pricing_tiers ?? []
  const selectedTier = pricingTiers.find((t: any) => t.type === tierType && t.enabled)
  const durationMs = end.getTime() - start.getTime()
  const durationHrs = durationMs / 3_600_000
  let effectiveRateRappen = vehicle.hourly_rate_rappen
  let totalRappen: number
  if (selectedTier) {
    effectiveRateRappen = selectedTier.rate_rappen
    // Flat tiers: lesson / half_day / full_day → one fixed amount
    totalRappen = ['lesson', 'half_day', 'full_day'].includes(tierType)
      ? selectedTier.rate_rappen
      : Math.round(selectedTier.rate_rappen * durationHrs)
  } else {
    totalRappen = Math.round(vehicle.hourly_rate_rappen * durationHrs)
  }

  // Create vehicle_rental record
  const { data: rental, error: rentalError } = await supabase
    .from('vehicle_rentals')
    .insert({
      tenant_id: tenantId,
      vehicle_id: vehicle_id,
      renter_user_id: rentalUser.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      hourly_rate_rappen: effectiveRateRappen,
      total_amount_rappen: totalRappen,
      pricing_tier_type: tierType,
      status: requiresApproval ? 'pending' : 'confirmed',
      payment_status: 'unpaid',
      payment_method: paymentMethod,
      vehicle_booking_id: vehicleBooking?.id ?? null,
      notes: notes || null,
    })
    .select('id')
    .single()

  if (rentalError) {
    // Rollback booking placeholder
    if (vehicleBooking?.id) {
      await supabase.from('vehicle_bookings').delete().eq('id', vehicleBooking.id)
    }
    throw createError({ statusCode: 500, statusMessage: 'Buchung konnte nicht gespeichert werden.' })
  }

  // ── Prepare notification content ────────────────────────────────────────────
  const vehicleLabel = [vehicle.marke, vehicle.modell].filter(Boolean).join(' ') || vehicle.name || 'Fahrzeug'
  const totalChf = (totalRappen / 100).toFixed(2)
  const dateLabel = start.toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeLabel = `${start.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`

  // ── Admin notification in DB ─────────────────────────────────────────────────
  const adminMessage = requiresApproval
    ? `Neue Fahrzeugmiet-Anfrage von ${rentalUser.name} (${rentalUser.email}): ${vehicleLabel}, ${dateLabel} ${timeLabel}`
    : `Fahrzeugmiete bestätigt: ${rentalUser.name} (${rentalUser.email}), ${vehicleLabel}`

  await supabase.from('admin_notifications').insert({
    tenant_id: tenantId,
    type: 'vehicle_rental_request',
    message: adminMessage,
    data: { rental_id: rental.id, user_id: rentalUser.id },
  }).then(() => {})  // non-blocking

  // ── Email to renter (confirmation or pending notice) ─────────────────────────
  sendTenantEmail(tenantId, {
    to: rentalUser.email,
    subject: requiresApproval
      ? `Buchungsanfrage eingegangen – ${vehicleLabel}`
      : `✅ Buchung bestätigt – ${vehicleLabel}`,
    html: buildRenterEmail({
      renterName: rentalUser.name || rentalUser.email,
      vehicleLabel,
      dateLabel,
      timeLabel,
      totalChf,
      requiresApproval,
      tenantName: tenantRow?.name || '',
    }),
  }).catch(() => {})

  // ── Email to admin (new request notification) ────────────────────────────────
  if (requiresApproval) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('contact_email, name')
      .eq('id', tenantId)
      .maybeSingle()

    if (tenant?.contact_email) {
      sendTenantEmail(tenantId, {
        to: tenant.contact_email,
        subject: `🚗 Neue Fahrzeugbuchungsanfrage von ${rentalUser.name}`,
        html: buildAdminNotificationEmail({
          renterName: rentalUser.name || rentalUser.email,
          renterEmail: rentalUser.email,
          vehicleLabel,
          dateLabel,
          timeLabel,
          totalChf,
          tenantName: tenant.name || '',
        }),
      }).catch(() => {})
    }
  }

  return {
    success: true,
    rental_id: rental.id,
    status: requiresApproval ? 'pending' : 'confirmed',
    message: requiresApproval
      ? 'Buchungsanfrage gesendet! Du erhältst eine Bestätigung sobald die Fahrschule sie genehmigt.'
      : 'Buchung bestätigt!',
  }
})

function bookingDetailBox(p: { vehicleLabel: string; dateLabel: string; timeLabel: string; totalChf: string }): string {
  return `<div style="background:#f9fafb;border-radius:10px;padding:18px 22px;margin:20px 0">
    <div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:2px">Fahrzeug</div><div style="font-size:15px;color:#111827">${p.vehicleLabel}</div></div>
    <div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:2px">Datum</div><div style="font-size:15px;color:#111827">${p.dateLabel}</div></div>
    <div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:2px">Zeit</div><div style="font-size:15px;color:#111827">${p.timeLabel}</div></div>
    <div><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:2px">Betrag (geschätzt)</div><div style="font-size:15px;color:#111827">CHF ${p.totalChf}</div></div>
  </div>`
}

function buildRenterEmail(p: {
  renterName: string
  vehicleLabel: string
  dateLabel: string
  timeLabel: string
  totalChf: string
  requiresApproval: boolean
  tenantName: string
}): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,sans-serif">
<div style="max-width:540px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)">
  <div style="background:${p.requiresApproval ? '#2563eb' : '#059669'};padding:28px 32px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">${p.requiresApproval ? 'Buchungsanfrage eingegangen' : '✅ Buchung bestätigt'}</h1>
  </div>
  <div style="padding:32px">
    <p style="font-size:15px;color:#374151;margin:0 0 16px">Hallo ${p.renterName},</p>
    <p style="font-size:15px;color:#374151;margin:0 0 20px">${p.requiresApproval
      ? 'deine Buchungsanfrage ist eingegangen. Die Fahrschule wird sie so schnell wie möglich bearbeiten und du erhältst eine Bestätigung per E-Mail.'
      : 'deine Buchung ist bestätigt. Das Fahrzeug steht dir zur vereinbarten Zeit zur Verfügung.'}</p>
    ${bookingDetailBox(p)}
    ${p.requiresApproval ? `<p style="font-size:13px;color:#6b7280;margin:16px 0 0">Bitte warte auf die Bestätigung, bevor du das Fahrzeug abholst.</p>` : ''}
  </div>
  <div style="border-top:1px solid #f3f4f6;padding:18px 32px;font-size:12px;color:#9ca3af;text-align:center">${p.tenantName} · Powered by Simy.ch</div>
</div></body></html>`
}

function buildAdminNotificationEmail(p: {
  renterName: string
  renterEmail: string
  vehicleLabel: string
  dateLabel: string
  timeLabel: string
  totalChf: string
  tenantName: string
}): string {
  const baseUrl = process.env.APP_URL || 'https://app.simy.ch'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,sans-serif">
<div style="max-width:540px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)">
  <div style="background:#f59e0b;padding:28px 32px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">🚗 Neue Buchungsanfrage</h1>
  </div>
  <div style="padding:32px">
    <p style="font-size:15px;color:#374151;margin:0 0 16px">Hallo,</p>
    <p style="font-size:15px;color:#374151;margin:0 0 20px">
      <strong>${p.renterName}</strong> (${p.renterEmail}) hat eine Buchungsanfrage für ein Fahrzeug gestellt.
    </p>
    ${bookingDetailBox(p)}
    <div style="text-align:center;margin:24px 0">
      <a href="${baseUrl}/admin/vehicle-rentals"
        style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
        Anfrage bearbeiten →
      </a>
    </div>
  </div>
  <div style="border-top:1px solid #f3f4f6;padding:18px 32px;font-size:12px;color:#9ca3af;text-align:center">${p.tenantName} · Powered by Simy.ch</div>
</div></body></html>`
}
