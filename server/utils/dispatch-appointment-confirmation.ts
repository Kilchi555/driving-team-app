/**
 * Durable appointment confirmation dispatch.
 * - Sends email directly via Resend (no nested HTTP $fetch)
 * - On failure: queues to outbound_messages_queue for cron retry
 * - Tracks confirmation_email_sent_at / confirmation_email_status on appointments
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { sendPushToUser } from '~/server/utils/push'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import {
  sendAppointmentNotificationEmail,
  renderAppointmentNotificationEmail,
  type AppointmentNotificationBody,
} from '~/server/utils/appointment-notification-email'

const CUSTOMER_PORTAL_BASE_URL = (process.env.CUSTOMER_PORTAL_BASE_URL || 'https://app.simy.ch').replace(/\/$/, '')

export type DispatchAppointmentConfirmationOpts = {
  appointmentId: string
  userId: string
  tenantId: string
  skipStaffNotification?: boolean
}

export type DispatchAppointmentConfirmationResult = {
  success: boolean
  skipped?: boolean
  reason?: string
  smsSent?: boolean
  emailSent?: boolean
  emailQueued?: boolean
  message?: string
  error?: string
}

async function markConfirmationStatus(
  appointmentId: string,
  status: 'sent' | 'queued' | 'skipped' | 'failed',
  sentAt: boolean
) {
  const supabase = getSupabaseAdmin()
  const patch: Record<string, any> = {
    confirmation_email_status: status,
    updated_at: new Date().toISOString(),
  }
  if (sentAt) patch.confirmation_email_sent_at = new Date().toISOString()
  const { error } = await supabase.from('appointments').update(patch).eq('id', appointmentId)
  if (error) {
    logger.warn('⚠️ Could not update confirmation_email_status:', error.message)
  }
}

async function queueEmail(opts: {
  tenantId: string
  to: string
  subject: string
  html: string
  appointmentId: string
  tenantName?: string
  stage: string
}) {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()
  const { error } = await supabase.from('outbound_messages_queue').insert({
    tenant_id: opts.tenantId,
    channel: 'email',
    recipient_email: opts.to,
    subject: opts.subject,
    body: opts.html,
    status: 'pending',
    send_at: now,
    context_data: {
      stage: opts.stage,
      appointment_id: opts.appointmentId,
      tenant_name: opts.tenantName,
    },
  })
  if (error) throw error
}

export async function dispatchAppointmentConfirmation(
  opts: DispatchAppointmentConfirmationOpts
): Promise<DispatchAppointmentConfirmationResult> {
  const { appointmentId, userId, tenantId, skipStaffNotification } = opts
  if (!appointmentId || !userId || !tenantId) {
    return { success: false, error: 'Missing appointmentId, userId, or tenantId' }
  }

  const supabase = getSupabaseAdmin()

  // Idempotent: already delivered
  const { data: existingAppt } = await supabase
    .from('appointments')
    .select('confirmation_email_sent_at, confirmation_email_status')
    .eq('id', appointmentId)
    .maybeSingle()

  if (
    existingAppt?.confirmation_email_status === 'sent'
    || existingAppt?.confirmation_email_sent_at
    || existingAppt?.confirmation_email_status === 'queued'
  ) {
    return {
      success: true,
      skipped: true,
      reason: existingAppt?.confirmation_email_status === 'queued' ? 'already_queued' : 'already_sent',
      emailSent: existingAppt?.confirmation_email_status === 'sent' || !!existingAppt?.confirmation_email_sent_at,
      emailQueued: existingAppt?.confirmation_email_status === 'queued',
      message: existingAppt?.confirmation_email_status === 'queued'
        ? 'Confirmation already queued'
        : 'Confirmation already sent',
    }
  }

  logger.debug('📧 Dispatching appointment confirmation:', { appointmentId, userId, tenantId })

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('first_name, last_name, email, phone, onboarding_status')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    await markConfirmationStatus(appointmentId, 'skipped', true)
    return { success: true, skipped: true, reason: 'user_not_found' }
  }

  const { data: tenantForPolicy } = await supabase
    .from('tenants')
    .select('booking_policy')
    .eq('id', tenantId)
    .maybeSingle()

  const policy = (tenantForPolicy?.booking_policy as any) || {}
  const confirmationEmailEnabled = policy.confirmation_email_enabled !== false
  const confirmationEmailMode: 'always' | 'after_registration' | 'never' =
    policy.confirmation_email_mode === 'after_registration' || policy.confirmation_email_mode === 'never'
      ? policy.confirmation_email_mode
      : 'always'
  const confirmationSmsEnabled = policy.confirmation_sms_enabled !== false

  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .select(`
      id, title, start_time, end_time, duration_minutes, event_type_code, type,
      staff_id, confirmation_token, location_id, customer_pickup_address, source, created_by,
      payments ( id, total_amount_rappen, lesson_price_rappen, admin_fee_rappen, products_price_rappen, discount_amount_rappen, payment_status )
    `)
    .eq('id', appointmentId)
    .single()

  if (appointmentError || !appointment) {
    await markConfirmationStatus(appointmentId, 'skipped', true)
    return { success: true, skipped: true, reason: 'appointment_not_found' }
  }

  // Internal calendar blocks (Sonstiges/Admin etc.): staff is both assignee and "customer".
  // No confirmation email/SMS — the creator already knows.
  if (appointment.staff_id && appointment.staff_id === userId) {
    await markConfirmationStatus(appointmentId, 'skipped', true)
    logger.debug('⏭️ Skipping confirmation — user_id === staff_id (self-booking)')
    return {
      success: true,
      skipped: true,
      reason: 'self_booking',
      message: 'Confirmation skipped (staff self-booking)',
    }
  }

  // Reject obvious typos / incomplete domains (e.g. outlook.con, icloud.c)
  const emailRaw = String(user.email || '').trim()
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(emailRaw)
  const hasEmail = !!(emailRaw && emailLooksValid)
  if (emailRaw && !emailLooksValid) {
    logger.warn('⚠️ Confirmation skipped — invalid email format:', emailRaw)
  }
  const hasPhone = !!(user.phone && String(user.phone).trim())
  const holdForRegistration =
    confirmationEmailMode === 'after_registration' && user.onboarding_status === 'pending'

  const { resolveCustomerChannels, normalizeCustomerNotificationChannel } = await import(
    '~/server/utils/customer-notification-channel'
  )
  const notifChannel = normalizeCustomerNotificationChannel(policy.customer_notification_channel)
  const channels = resolveCustomerChannels({
    channel: notifChannel,
    hasEmail,
    hasPhone,
    emailEnabled:
      confirmationEmailEnabled &&
      confirmationEmailMode !== 'never' &&
      !holdForRegistration,
    smsEnabled: confirmationSmsEnabled,
  })
  if (holdForRegistration && notifChannel === 'email_first') {
    channels.sendSms = false
  }

  const skipCustomerEmail = !channels.sendEmail
  const skipCustomerEmailReason = !hasEmail
    ? (emailRaw && !emailLooksValid ? 'invalid_email' : 'user_email_missing')
    : holdForRegistration
      ? 'waiting_for_registration'
      : !confirmationEmailEnabled || confirmationEmailMode === 'never'
        ? 'policy_disabled'
        : notifChannel === 'sms_first'
          ? 'sms_preferred'
          : undefined

  const terms = await getTenantTerminology(supabase, tenantId)

  const { data: staff } = await supabase
    .from('users')
    .select('first_name, last_name, email, phone')
    .eq('id', appointment.staff_id)
    .single()

  const staffName = staff ? `${staff.first_name} ${staff.last_name}` : terms.staff
  const staffPhone = (staff as any)?.phone || null

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('name, slug, primary_color, business_type, twilio_from_sender')
    .eq('id', tenantId)
    .single()

  if (tenantError || !tenant) {
    await markConfirmationStatus(appointmentId, 'failed', false)
    return { success: false, error: 'tenant_not_found' }
  }

  const { data: location } = await supabase
    .from('locations')
    .select('name, address, city')
    .eq('id', appointment.location_id)
    .single()

  const pickupAddress = (appointment as any).customer_pickup_address as string | null
  const locationDisplay = pickupAddress ? 'Pickup-Adresse' : location?.name
  const locationAddressDisplay =
    pickupAddress || [location?.address, location?.city].filter(Boolean).join(', ') || undefined

  const EVENT_TYPE_LABELS: Record<string, string> = {
    lesson: terms.appointment,
    exam: 'Prüfung',
    theory: 'Theorie',
    other: 'Termin',
  }
  let eventTypeName: string | undefined
  if (appointment.event_type_code) {
    const { data: etRow } = await supabase
      .from('event_types')
      .select('name')
      .eq('code', appointment.event_type_code)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    eventTypeName =
      etRow?.name || EVENT_TYPE_LABELS[appointment.event_type_code] || appointment.event_type_code
  }

  const BILLABLE_TYPES = new Set(['lesson', 'exam', 'theory'])
  const LESSON_TYPES = new Set(['lesson', 'exam', 'theory'])
  const showPrice = !appointment.event_type_code || BILLABLE_TYPES.has(appointment.event_type_code)
  const isLessonType = !appointment.event_type_code || LESSON_TYPES.has(appointment.event_type_code)

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

  const payment = Array.isArray(appointment.payments) ? appointment.payments[0] : appointment.payments
  const startTime = new Date(appointment.start_time)
  const endTime = appointment.end_time ? new Date(appointment.end_time) : null
  const appointmentDateTime = startTime.toLocaleString('de-CH', {
    timeZone: 'Europe/Zurich',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const durationMinutes: number | undefined =
    appointment.duration_minutes ||
    (endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 60000) : undefined)

  const customerDashboard = `${CUSTOMER_PORTAL_BASE_URL}/${tenant.slug}`
  const amount = payment ? `CHF ${(payment.total_amount_rappen / 100).toFixed(2)}` : 'CHF 0.00'

  let emailSent = false
  let emailQueued = false

  const customerPayload: AppointmentNotificationBody = {
    email: user.email || '',
    studentName: `${user.first_name} ${user.last_name}`,
    appointmentTime: appointmentDateTime,
    type: 'appointment_confirmation',
    staffName,
    staffPhone,
    location: meeting_type === 'phone' || meeting_type === 'online' ? undefined : locationDisplay,
    locationAddress:
      meeting_type === 'phone' || meeting_type === 'online' ? undefined : locationAddressDisplay,
    tenantName: tenant.name,
    tenantId,
    tenantSlug: tenant.slug,
    amount,
    confirmationLink: customerDashboard,
    customerDashboard,
    userId,
    eventTypeName,
    durationMinutes,
    showPrice,
    isLessonType,
    meeting_type,
    meeting_link,
  }

  if (!skipCustomerEmail) {
    try {
      await sendAppointmentNotificationEmail(customerPayload)
      emailSent = true
      await markConfirmationStatus(appointmentId, 'sent', true)
    } catch (emailError: any) {
      logger.error('EmailNotification', 'Direct confirmation send failed, queueing:', emailError?.message || emailError)
      try {
        const rendered = await renderAppointmentNotificationEmail(customerPayload)
        await queueEmail({
          tenantId,
          to: customerPayload.email,
          subject: rendered.subject,
          html: rendered.html,
          appointmentId,
          tenantName: tenant.name,
          stage: 'appointment_confirmation',
        })
        emailQueued = true
        await markConfirmationStatus(appointmentId, 'queued', false)
      } catch (queueErr: any) {
        logger.error('EmailNotification', 'Queue fallback also failed:', queueErr?.message || queueErr)
        await markConfirmationStatus(appointmentId, 'failed', false)
      }
    }

    sendPushToUser(userId, {
      title: '✅ Buchung bestätigt',
      body: `Deine ${terms.appointment} am ${appointmentDateTime} wurde bestätigt.`,
      data: { path: '/customer-dashboard' },
    }).catch((err: any) => {
      logger.warn('⚠️ Push notification failed (non-critical):', err.message)
    })
  } else {
    // Terminal skip (policy / no email / waiting registration) — don't retry forever
    if (skipCustomerEmailReason !== 'waiting_for_registration') {
      await markConfirmationStatus(appointmentId, 'skipped', true)
    }
    logger.debug(`⏭️ Skipping customer confirmation email (${skipCustomerEmailReason})`)
  }

  let smsSent = false
  const smsLength = policy.sms_message_length === 'long' ? 'long' : 'short'
  if (channels.sendSms) {
    try {
      const { sendTenantSMS } = await import('~/server/utils/sms')
      const { buildAppointmentConfirmationSms } = await import('~/server/utils/sms-templates')
      const { getAccountAccessLink } = await import('~/server/utils/account-access-link')
      const dateLabel = startTime.toLocaleDateString('de-CH', {
        timeZone: 'Europe/Zurich',
        weekday: 'short',
        day: 'numeric',
        month: 'numeric',
      })
      const timeLabel = startTime.toLocaleTimeString('de-CH', {
        timeZone: 'Europe/Zurich',
        hour: '2-digit',
        minute: '2-digit',
      })
      const { url: accessUrl } = await getAccountAccessLink(supabase, user, tenant.slug || '')
      const smsMessage = buildAppointmentConfirmationSms(
        {
          firstName: user.first_name || 'du',
          dateLabel,
          timeLabel,
          locationLabel:
            meeting_type === 'phone' || meeting_type === 'online'
              ? undefined
              : locationAddressDisplay || undefined,
          appLink: accessUrl,
        },
        smsLength,
      )
      await sendTenantSMS({
        tenantId,
        to: user.phone,
        message: smsMessage,
        purpose: 'appointment_confirmation',
        senderName: (tenant as any).twilio_from_sender || tenant.name,
      })
      smsSent = true
    } catch (smsErr: any) {
      logger.warn('⚠️ Appointment confirmation SMS failed (non-critical):', smsErr?.message)
    }
  }

  const isOnlineBooking = appointment.source === 'online' && appointment.created_by === userId
  const staffNotificationEnabled = policy.staff_booking_notification_enabled !== false
  if (staff?.email && isOnlineBooking && !skipStaffNotification && staffNotificationEnabled) {
    const staffPayload: AppointmentNotificationBody = {
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
    try {
      await sendAppointmentNotificationEmail(staffPayload)
    } catch (err: any) {
      logger.warn('⚠️ Staff notification direct send failed, queueing:', err?.message)
      try {
        const rendered = await renderAppointmentNotificationEmail(staffPayload)
        await queueEmail({
          tenantId,
          to: staff.email,
          subject: rendered.subject,
          html: rendered.html,
          appointmentId,
          tenantName: tenant.name,
          stage: 'staff_new_booking',
        })
      } catch (queueErr: any) {
        logger.warn('⚠️ Staff notification queue failed:', queueErr?.message)
      }
    }
  }

  return {
    success: true,
    skipped: skipCustomerEmail && !smsSent && !emailSent && !emailQueued,
    reason: skipCustomerEmail && !smsSent && !emailSent && !emailQueued ? skipCustomerEmailReason : undefined,
    smsSent,
    emailSent,
    emailQueued,
    message: emailSent
      ? 'Appointment confirmation email sent'
      : emailQueued
        ? 'Appointment confirmation queued for retry'
        : smsSent
          ? 'Appointment confirmation SMS sent (no email)'
          : skipCustomerEmail
            ? `Customer email skipped (${skipCustomerEmailReason})`
            : 'Processed',
  }
}
