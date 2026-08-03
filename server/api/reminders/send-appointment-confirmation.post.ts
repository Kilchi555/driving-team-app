// ============================================
// Send Appointment Confirmation Email
// ============================================
// Sendet die Bestätigungs-Email sofort nach Termin-Erstellung
// Mit Bestätigungs-Link und Zahlungsdetails

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { sendPushToUser } from '~/server/utils/push'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'

const CUSTOMER_PORTAL_BASE_URL = (process.env.CUSTOMER_PORTAL_BASE_URL || 'https://app.simy.ch').replace(/\/$/, '')

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId, userId, tenantId, skipStaffNotification } = body

    if (!appointmentId || !userId || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: appointmentId, userId, tenantId'
      })
    }

    logger.debug('📧 Sending appointment confirmation email:', { appointmentId, userId, tenantId })

    const supabase = getSupabaseAdmin()

    // 1. Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone, onboarding_status')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      logger.warn('⚠️ User not found:', userId)
      return {
        success: true,
        skipped: true,
        reason: 'user_not_found',
        message: 'User not found, skipping email'
      }
    }

    // 2. Load booking policy for this tenant
    const { data: tenantForPolicy } = await supabase
      .from('tenants')
      .select('booking_policy')
      .eq('id', tenantId)
      .maybeSingle()

    const policy = (tenantForPolicy?.booking_policy as any) || {}
    const confirmationEmailEnabled = policy.confirmation_email_enabled !== false
    // Tenant-controlled: when to send the customer confirmation.
    // Default 'always' — registration/login is optional unless registration_required.
    const confirmationEmailMode: 'always' | 'after_registration' | 'never' =
      policy.confirmation_email_mode === 'after_registration' || policy.confirmation_email_mode === 'never'
        ? policy.confirmation_email_mode
        : 'always'

    // 2a. Admin disabled confirmation emails entirely
    if (!confirmationEmailEnabled || confirmationEmailMode === 'never') {
      logger.debug('⏭️ Confirmation emails disabled by tenant policy', {
        confirmationEmailEnabled,
        confirmationEmailMode
      })
      return {
        success: true,
        skipped: true,
        reason: confirmationEmailMode === 'never' ? 'policy_mode_never' : 'policy_disabled',
        message: 'Confirmation emails disabled by admin'
      }
    }

    // 4. Get appointment data with payment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        event_type_code,
        type,
        staff_id,
        confirmation_token,
        location_id,
        customer_pickup_address,
        source,
        created_by,
        payments (
          id,
          total_amount_rappen,
          lesson_price_rappen,
          admin_fee_rappen,
          products_price_rappen,
          discount_amount_rappen,
          payment_status
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      logger.warn('⚠️ Appointment not found:', appointmentError)
      return {
        success: true,
        skipped: true,
        reason: 'appointment_not_found',
        message: 'Appointment not found'
      }
    }

    // 2b/3. Customer-facing confirmation skip rules (tenant policy driven):
    // - Always skip when no email address (nothing to send to)
    // - If mode === 'after_registration': hold until onboarding_status is completed
    //   (backfilled in students/complete-onboarding.post.ts)
    // - mode === 'always' (default): send even for pending guests — login/registration
    //   is optional unless the tenant sets registration_required / after_registration
    const hasEmail = !!(user.email && user.email.trim())
    const holdForRegistration =
      confirmationEmailMode === 'after_registration' &&
      user.onboarding_status === 'pending'
    const skipCustomerEmail = !hasEmail || holdForRegistration
    const skipCustomerEmailReason = !hasEmail
      ? 'user_email_missing'
      : holdForRegistration
        ? 'waiting_for_registration'
        : undefined

    if (holdForRegistration) {
      logger.debug('⏭️ Holding confirmation until customer completes registration', {
        appointmentId,
        userId,
        confirmationEmailMode,
        source: appointment.source
      })
    }

    // 5. Get staff data + terminology
    const terms = await getTenantTerminology(supabase, tenantId)

    const { data: staff, error: staffError } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone')
      .eq('id', appointment.staff_id)
      .single()

    const staffName = staff
      ? `${staff.first_name} ${staff.last_name}`
      : terms.staff
    const staffPhone = (staff as any)?.phone || null

    // 6. Get tenant data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, slug, primary_color, business_type')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      logger.warn('⚠️ Tenant not found:', tenantId)
      return {
        success: true,
        skipped: true,
        reason: 'tenant_not_found',
        message: 'Tenant not found'
      }
    }

    // 7. Get location data
    const { data: location } = await supabase
      .from('locations')
      .select('name, address, city')
      .eq('id', appointment.location_id)
      .single()

    // If this is a pickup booking, use the customer's pickup address as the location display
    const pickupAddress = (appointment as any).customer_pickup_address as string | null
    const locationDisplay = pickupAddress ? 'Pickup-Adresse' : location?.name
    const locationAddressDisplay = pickupAddress || [location?.address, location?.city].filter(Boolean).join(', ') || undefined

    // 7b. Get event type label from DB (fallback to code-based map)
    const EVENT_TYPE_LABELS: Record<string, string> = {
      lesson: terms.appointment, exam: 'Prüfung', theory: 'Theorie', other: 'Termin'
    }
    let eventTypeName: string | undefined
    if (appointment.event_type_code) {
      const { data: etRow } = await supabase
        .from('event_types')
        .select('name')
        .eq('code', appointment.event_type_code)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      eventTypeName = etRow?.name
        || EVENT_TYPE_LABELS[appointment.event_type_code]
        || appointment.event_type_code
    }

    // Price is only relevant for standard billable event types
    const BILLABLE_TYPES = new Set(['lesson', 'exam', 'theory'])
    const LESSON_TYPES = new Set(['lesson', 'exam', 'theory'])
    const showPrice = !appointment.event_type_code
      || BILLABLE_TYPES.has(appointment.event_type_code)
    const isLessonType = !appointment.event_type_code
      || LESSON_TYPES.has(appointment.event_type_code)

    // 7c. Look up meeting_type from invited_customers (for non-lesson types like meetings)
    let meeting_type: 'in_person' | 'phone' | 'online' | undefined
    let meeting_link: string | undefined
    if (!isLessonType && user.email) {
      const { data: invite } = await supabase
        .from('invited_customers')
        .select('meeting_type, meeting_link')
        .eq('appointment_id', appointmentId)
        .ilike('email', user.email)
        .maybeSingle()
      if (invite) {
        meeting_type = (invite as any).meeting_type || undefined
        meeting_link = (invite as any).meeting_link || undefined
      }
    }

    // 8. Get payment data
    const payment = Array.isArray(appointment.payments)
      ? appointment.payments[0]
      : appointment.payments

    // 9. Format data for email
    const startTime = new Date(appointment.start_time)
    const endTime   = appointment.end_time ? new Date(appointment.end_time) : null
    const appointmentDateTime = startTime.toLocaleString('de-CH', {
      timeZone: 'Europe/Zurich',
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Duration: prefer stored value, fall back to start/end diff
    const durationMinutes: number | undefined =
      appointment.duration_minutes
      || (endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 60000) : undefined)

    const customerDashboard = `${CUSTOMER_PORTAL_BASE_URL}/${tenant.slug}`
    const confirmationLink  = customerDashboard
    const amount = payment ? `CHF ${(payment.total_amount_rappen / 100).toFixed(2)}` : 'CHF 0.00'

    // 10. Send email using centralized appointment notification endpoint
    // (skipped for guests still pending onboarding / without an email — see note above;
    // this does NOT skip the staff notification in step 12)
    if (!skipCustomerEmail) {
      logger.debug('📧 Calling send-appointment-notification endpoint...')

      try {
        const emailResponse = await $fetch('/api/email/send-appointment-notification', {
          method: 'POST',
          body: {
            email: user.email,
            studentName: `${user.first_name} ${user.last_name}`,
            appointmentTime: appointmentDateTime,
            type: 'appointment_confirmation',
            staffName,
            staffPhone,
            location: meeting_type === 'phone' || meeting_type === 'online' ? undefined : locationDisplay,
            locationAddress: meeting_type === 'phone' || meeting_type === 'online' ? undefined : locationAddressDisplay,
            tenantName: tenant.name,
            tenantId,
            tenantSlug: tenant.slug,
            amount,
            confirmationLink,
            customerDashboard,
            userId,
            eventTypeName,
            durationMinutes,
            showPrice,
            isLessonType,
            meeting_type,
            meeting_link,
          }
        })

        logger.debug('✅ Appointment confirmation email sent:', emailResponse)
      } catch (emailError: any) {
        logger.error('EmailNotification', 'Failed to send appointment confirmation email:', emailError)
        // Don't fail the whole endpoint if email fails - log and continue
      }

      // Push notification to the student (fire-and-forget, non-blocking)
      sendPushToUser(userId, {
        title: '✅ Buchung bestätigt',
        body: `Deine ${terms.appointment} am ${appointmentDateTime} wurde bestätigt.`,
        data: { path: '/customer-dashboard' },
      }).catch((err: any) => {
        logger.warn('⚠️ Push notification failed (non-critical):', err.message)
      })
    } else {
      logger.debug(`⏭️ Skipping customer confirmation email (${skipCustomerEmailReason}) — staff notification still proceeds`)
    }

    // 12. Send staff notification – only for online bookings made by the customer (not manual).
    // AWAITED (see note on step 10 above): Vercel freezes the lambda right after this
    // function returns, so an un-awaited fire-and-forget call here was silently dropped
    // most of the time — this is why staff stopped receiving new-booking notifications.
    // skipStaffNotification is set by students/complete-onboarding.post.ts's backfill call,
    // which re-triggers this endpoint purely to send the (until-then-skipped) customer email
    // — staff were already notified immediately at booking time and must not be pinged twice.
    const isOnlineBooking = appointment.source === 'online' && appointment.created_by === userId
    const staffNotificationEnabled = policy.staff_booking_notification_enabled !== false
    if (staff?.email && isOnlineBooking && !skipStaffNotification && staffNotificationEnabled) {
      try {
        await $fetch('/api/email/send-appointment-notification', {
          method: 'POST',
          body: {
            email: staff.email,
            studentName: `${user.first_name} ${user.last_name}`,
            appointmentTime: appointmentDateTime,
            type: 'staff_new_booking',
            staffName,
            location: locationDisplay,
            locationAddress: locationAddressDisplay,
            tenantName: tenant.name,
            tenantId,
            tenantSlug: tenant.slug,
            amount,
            eventTypeName,
            durationMinutes,
            showPrice,
          }
        })
        logger.debug('✅ Staff new booking notification sent to:', staff.email)
      } catch (err: any) {
        logger.warn('⚠️ Could not send staff new booking notification (non-critical):', err.message)
      }
    } else if (staff?.email && !staffNotificationEnabled) {
      logger.debug('⏭️ Skipping staff notification – disabled by tenant policy')
    } else if (staff?.email && !isOnlineBooking) {
      logger.debug('⏭️ Skipping staff notification – manual appointment (source:', appointment.source, ')')
    }

    logger.debug('✅ Appointment confirmation email processed successfully')

    return {
      success: true,
      skipped: skipCustomerEmail,
      reason: skipCustomerEmail ? skipCustomerEmailReason : undefined,
      message: skipCustomerEmail
        ? `Customer email skipped (${skipCustomerEmailReason}), staff notification still attempted`
        : 'Appointment confirmation email sent successfully'
    }
  } catch (error: any) {
    logger.error('AppointmentConfirmation', 'Unexpected error:', error)

    return {
      success: false,
      error: error.message,
      message: 'Failed to send appointment confirmation (non-critical)'
    }
  }
})

