import { describe, expect, it } from 'vitest'
import { buildConfirmationProcessStep } from '../website-confirmation-copy'

describe('buildConfirmationProcessStep', () => {
  it('uses generic copy when the master switch is off', () => {
    const step = buildConfirmationProcessStep({
      customer_notifications_enabled: false,
      confirmation_email_enabled: true,
      confirmation_sms_enabled: true,
    })
    expect(step.title).toBe('Bestätigung erhalten')
    expect(step.text).toContain('Erinnerungen')
  })

  it('keeps email copy when only confirmation email is on', () => {
    const step = buildConfirmationProcessStep({
      confirmation_email_enabled: true,
      confirmation_sms_enabled: false,
      customer_notification_channel: 'both',
    })
    expect(step.title).toBe('Bestätigung per E-Mail')
  })
})
