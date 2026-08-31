/**
 * Resolve which customer channels to use for appointment / payment notifications.
 *
 * Default `email_first` preserves historic behavior:
 * email if available, otherwise SMS (when SMS is enabled and phone exists).
 */

export type CustomerNotificationChannel = 'email_first' | 'sms_first' | 'both'

export type CustomerNotificationKind =
  | 'confirmation'
  | 'reminder'
  | 'cancellation'
  | 'reschedule'
  | 'payment_reminder'
  | 'course_reminder'
  | 'course_enrollment'

const NOTIFICATION_CHANNEL_KEYS: Record<
  CustomerNotificationKind,
  { email?: string; sms?: string }
> = {
  confirmation: { email: 'confirmation_email_enabled', sms: 'confirmation_sms_enabled' },
  reminder: { email: 'reminder_email_enabled', sms: 'reminder_sms_enabled' },
  cancellation: { email: 'cancellation_email_enabled', sms: 'cancellation_sms_enabled' },
  reschedule: { email: 'reschedule_email_enabled', sms: 'reschedule_sms_enabled' },
  payment_reminder: { email: 'payment_reminder_email_enabled', sms: 'payment_reminder_sms_enabled' },
  course_reminder: { email: 'course_reminder_email_enabled', sms: 'course_reminder_sms_enabled' },
  course_enrollment: { email: 'course_enrollment_email_enabled' },
}

export const VALID_CUSTOMER_NOTIFICATION_CHANNELS: CustomerNotificationChannel[] = [
  'email_first',
  'sms_first',
  'both',
]

/** Master + per-type channel switches. Missing keys default to on (legacy). */
export function policyAllowsCustomerNotification(
  policy: Record<string, any> | null | undefined,
  kind: CustomerNotificationKind,
  channel: 'email' | 'sms',
): boolean {
  if (policy?.customer_notifications_enabled === false) return false
  const key = NOTIFICATION_CHANNEL_KEYS[kind][channel]
  if (!key) return false
  return policy?.[key] !== false
}

export function resolvePolicyCustomerChannels(
  policy: Record<string, any> | null | undefined,
  kind: CustomerNotificationKind,
  dest: { hasEmail: boolean; hasPhone: boolean },
): { sendEmail: boolean; sendSms: boolean } {
  return resolveCustomerChannels({
    channel: policy?.customer_notification_channel,
    hasEmail: dest.hasEmail,
    hasPhone: dest.hasPhone,
    emailEnabled: policyAllowsCustomerNotification(policy, kind, 'email'),
    smsEnabled: policyAllowsCustomerNotification(policy, kind, 'sms'),
  })
}

export function normalizeCustomerNotificationChannel(
  value: unknown,
): CustomerNotificationChannel {
  if (VALID_CUSTOMER_NOTIFICATION_CHANNELS.includes(value as CustomerNotificationChannel)) {
    return value as CustomerNotificationChannel
  }
  return 'email_first'
}

export function resolveCustomerChannels(opts: {
  channel?: CustomerNotificationChannel | string | null
  hasEmail: boolean
  hasPhone: boolean
  /** Master switch for email for this notification type */
  emailEnabled?: boolean
  /** Master switch for SMS for this notification type */
  smsEnabled?: boolean
}): { sendEmail: boolean; sendSms: boolean } {
  const channel = normalizeCustomerNotificationChannel(opts.channel)
  const emailEnabled = opts.emailEnabled !== false
  const smsEnabled = opts.smsEnabled !== false
  const canEmail = !!opts.hasEmail && emailEnabled
  const canSms = !!opts.hasPhone && smsEnabled

  if (channel === 'both') {
    return { sendEmail: canEmail, sendSms: canSms }
  }

  if (channel === 'sms_first') {
    if (canSms) return { sendEmail: false, sendSms: true }
    return { sendEmail: canEmail, sendSms: false }
  }

  // email_first (default)
  if (canEmail) return { sendEmail: true, sendSms: false }
  return { sendEmail: false, sendSms: canSms }
}
