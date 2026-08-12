/**
 * Process-step copy for booking confirmation channel.
 * Source of truth: tenants.booking_policy (same as real confirmation sends).
 */
import { normalizeCustomerNotificationChannel } from '~/server/utils/customer-notification-channel'

export function buildConfirmationProcessStep(
  policy: Record<string, any> | null | undefined,
  formal: 'du' | 'sie' = 'sie',
): { title: string; text: string } {
  const emailOn = policy?.confirmation_email_enabled !== false
  const smsOn = policy?.confirmation_sms_enabled !== false
  const channel = normalizeCustomerNotificationChannel(policy?.customer_notification_channel)

  let mode: 'email' | 'sms' | 'both' | 'generic'
  if (emailOn && smsOn) {
    if (channel === 'both') mode = 'both'
    else if (channel === 'sms_first') mode = 'sms'
    else mode = 'email' // email_first (default)
  } else if (smsOn) {
    mode = 'sms'
  } else if (emailOn) {
    mode = 'email'
  } else {
    mode = 'generic'
  }

  const titles: Record<typeof mode, string> = {
    email: 'Bestätigung per E-Mail',
    sms: 'Bestätigung per SMS',
    both: 'Bestätigung per SMS & E-Mail',
    generic: 'Bestätigung erhalten',
  }

  const textsDu: Record<typeof mode, string> = {
    email: 'Du erhältst Erinnerungen per E-Mail — damit nichts verloren geht.',
    sms: 'Du erhältst Erinnerungen per SMS — damit nichts verloren geht.',
    both: 'Du erhältst Erinnerungen per SMS und E-Mail — damit nichts verloren geht.',
    generic: 'Du erhältst Erinnerungen — damit nichts verloren geht.',
  }
  const textsSie: Record<typeof mode, string> = {
    email: 'Sie erhalten Erinnerungen per E-Mail — damit nichts verloren geht.',
    sms: 'Sie erhalten Erinnerungen per SMS — damit nichts verloren geht.',
    both: 'Sie erhalten Erinnerungen per SMS und E-Mail — damit nichts verloren geht.',
    generic: 'Sie erhalten Erinnerungen — damit nichts verloren geht.',
  }

  return {
    title: titles[mode],
    text: (formal === 'du' ? textsDu : textsSie)[mode],
  }
}
