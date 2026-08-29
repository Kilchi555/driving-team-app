/**
 * Shared helper: notify customer about appointment cancel/reschedule via email+SMS
 * according to tenant customer_notification_channel policy.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { resolveCustomerChannels } from '~/server/utils/customer-notification-channel'
import { sendTenantSMS } from '~/server/utils/sms'
import {
  buildAppointmentCancelledSms,
  buildAppointmentRescheduledSms,
  type SmsMessageLength,
} from '~/server/utils/sms-templates'
import { getAccountAccessLink } from '~/server/utils/account-access-link'
import { DEFAULT_BOOKING_POLICY } from '~/server/api/admin/booking-policy.get'
import { allowsCustomerAccountActivation } from '~/server/utils/customer-account-activation'
import {
  parseRescheduleChangedFields,
  shouldNotifyRescheduleChange,
} from '~/utils/reschedule-email-triggers'

export async function notifyCustomerAppointmentChange(opts: {
  tenantId: string
  userId: string
  type: 'cancelled' | 'rescheduled'
  appointmentTimeIso: string
  appointmentId?: string
  /** Already formatted display string for email templates */
  appointmentTimeLabel?: string
  cancellationReason?: string | null
  /** Extra fields forwarded to send-appointment-notification email */
  emailExtras?: Record<string, any>
  /** Which customer-visible fields changed. Omitted = datetime (legacy). */
  changedFields?: string[]
}): Promise<{ emailSent: boolean; smsSent: boolean; skipped?: boolean }> {
  const supabase = getSupabaseAdmin()
  let emailSent = false
  let smsSent = false

  const [{ data: user }, { data: tenant }] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, onboarding_status, onboarding_token, onboarding_token_expires')
      .eq('id', opts.userId)
      .maybeSingle(),
    supabase
      .from('tenants')
      .select('id, name, slug, booking_policy, twilio_from_sender')
      .eq('id', opts.tenantId)
      .maybeSingle(),
  ])

  if (!user || !tenant) {
    return { emailSent, smsSent }
  }

  const policy = { ...DEFAULT_BOOKING_POLICY, ...((tenant as any).booking_policy || {}) }
  const changedFields = parseRescheduleChangedFields(opts.changedFields ?? opts.emailExtras?.changedFields)

  if (
    opts.type === 'rescheduled' &&
    !shouldNotifyRescheduleChange(policy.reschedule_email_triggers, changedFields)
  ) {
    return { emailSent, smsSent, skipped: true }
  }

  const hasEmail = !!(user.email && String(user.email).trim())
  const hasPhone = !!(user.phone && String(user.phone).trim())
  const smsToggle =
    opts.type === 'cancelled'
      ? policy.cancellation_sms_enabled !== false
      : policy.reschedule_sms_enabled !== false && changedFields.includes('datetime')

  const channels = resolveCustomerChannels({
    channel: policy.customer_notification_channel,
    hasEmail,
    hasPhone,
    emailEnabled: true,
    smsEnabled: smsToggle,
  })

  const start = new Date(opts.appointmentTimeIso)
  const appointmentTimeLabel =
    opts.appointmentTimeLabel ||
    start.toLocaleString('de-CH', {
      timeZone: 'Europe/Zurich',
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  let resourceLabels: { vehicleLabel: string | null; roomName: string | null } = {
    vehicleLabel: null,
    roomName: null,
  }
  if (opts.appointmentId) {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('type, location_id, vehicle_mode, room_id')
      .eq('id', opts.appointmentId)
      .eq('tenant_id', opts.tenantId)
      .maybeSingle()
    if (appointment) {
      const { loadAppointmentResourceLabels } = await import(
        '~/server/utils/appointment-resource-labels'
      )
      resourceLabels = await loadAppointmentResourceLabels(supabase, {
        tenantId: opts.tenantId,
        categoryCode: appointment.type,
        locationId: appointment.location_id,
        vehicleMode: appointment.vehicle_mode,
        roomId: appointment.room_id,
      })
    }
  }

  if (channels.sendEmail && user.email) {
    try {
      const { sendAppointmentNotificationEmail } = await import(
        '~/server/utils/appointment-notification-email'
      )
      await sendAppointmentNotificationEmail({
        email: user.email,
        studentName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Kunde',
        appointmentTime: appointmentTimeLabel,
        type: opts.type,
        cancellationReason: opts.cancellationReason || undefined,
        tenantName: tenant.name,
        tenantId: opts.tenantId,
        tenantSlug: tenant.slug,
        userId: user.id,
        omitAccountCta: user.onboarding_status === 'pending' && !allowsCustomerAccountActivation(policy),
        vehicleLabel: resourceLabels.vehicleLabel,
        roomName: resourceLabels.roomName,
        ...(opts.emailExtras || {}),
        changedFields,
      })
      emailSent = true
    } catch (err: any) {
      logger.warn(`⚠️ ${opts.type} email failed (non-critical):`, err?.message)
    }
  }

  if (channels.sendSms && user.phone) {
    try {
      const dateLabel = start.toLocaleDateString('de-CH', {
        timeZone: 'Europe/Zurich',
        weekday: 'short',
        day: 'numeric',
        month: 'numeric',
      })
      const timeLabel = start.toLocaleTimeString('de-CH', {
        timeZone: 'Europe/Zurich',
        hour: '2-digit',
        minute: '2-digit',
      })
      const { url: accessUrl, canAccessAccount } = await getAccountAccessLink(
        supabase,
        user,
        tenant.slug || '',
        { policy }
      )
      const length: SmsMessageLength = policy.sms_message_length === 'long' ? 'long' : 'short'
      const message =
        opts.type === 'cancelled'
          ? buildAppointmentCancelledSms(
              {
                firstName: user.first_name || 'du',
                dateLabel,
                timeLabel,
                reason: opts.cancellationReason,
                appLink: canAccessAccount ? accessUrl : undefined,
              },
              length,
            )
          : buildAppointmentRescheduledSms(
              {
                firstName: user.first_name || 'du',
                dateLabel,
                timeLabel,
                appLink: canAccessAccount ? accessUrl : undefined,
              },
              length,
            )

      await sendTenantSMS({
        tenantId: opts.tenantId,
        to: user.phone,
        message,
        purpose: opts.type === 'cancelled' ? 'appointment_cancellation' : 'appointment_reschedule',
        senderName: (tenant as any).twilio_from_sender || tenant.name,
      })
      smsSent = true
    } catch (err: any) {
      logger.warn(`⚠️ ${opts.type} SMS failed (non-critical):`, err?.message)
    }
  }

  return { emailSent, smsSent }
}
