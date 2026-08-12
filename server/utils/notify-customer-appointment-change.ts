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

export async function notifyCustomerAppointmentChange(opts: {
  tenantId: string
  userId: string
  type: 'cancelled' | 'rescheduled'
  appointmentTimeIso: string
  /** Already formatted display string for email templates */
  appointmentTimeLabel?: string
  cancellationReason?: string | null
  /** Extra fields forwarded to send-appointment-notification email */
  emailExtras?: Record<string, any>
}): Promise<{ emailSent: boolean; smsSent: boolean }> {
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
  const hasEmail = !!(user.email && String(user.email).trim())
  const hasPhone = !!(user.phone && String(user.phone).trim())
  const smsToggle =
    opts.type === 'cancelled'
      ? policy.cancellation_sms_enabled !== false
      : policy.reschedule_sms_enabled !== false

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
        ...(opts.emailExtras || {}),
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
      const { url: accessUrl } = await getAccountAccessLink(supabase, user, tenant.slug || '')
      const length: SmsMessageLength = policy.sms_message_length === 'long' ? 'long' : 'short'
      const message =
        opts.type === 'cancelled'
          ? buildAppointmentCancelledSms(
              {
                firstName: user.first_name || 'du',
                dateLabel,
                timeLabel,
                reason: opts.cancellationReason,
                appLink: accessUrl,
              },
              length,
            )
          : buildAppointmentRescheduledSms(
              {
                firstName: user.first_name || 'du',
                dateLabel,
                timeLabel,
                appLink: accessUrl,
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
