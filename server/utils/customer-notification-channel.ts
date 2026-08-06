/**
 * Resolve which customer channels to use for appointment / payment notifications.
 *
 * Default `email_first` preserves historic behavior:
 * email if available, otherwise SMS (when SMS is enabled and phone exists).
 */

export type CustomerNotificationChannel = 'email_first' | 'sms_first' | 'both'

export const VALID_CUSTOMER_NOTIFICATION_CHANNELS: CustomerNotificationChannel[] = [
  'email_first',
  'sms_first',
  'both',
]

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
