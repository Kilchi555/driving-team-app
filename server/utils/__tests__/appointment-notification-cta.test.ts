import { describe, expect, it } from 'vitest'
import { resolveAppointmentEmailCta } from '../appointment-notification-cta'

describe('resolveAppointmentEmailCta', () => {
  it('keeps pay / account buttons when customer login is allowed', () => {
    expect(resolveAppointmentEmailCta({
      type: 'appointment_confirmation',
      tenantSlug: 'demo',
      showPrice: true,
    })).toMatchObject({
      href: 'https://app.simy.ch/demo',
      label: 'Jetzt bezahlen',
    })

    expect(resolveAppointmentEmailCta({
      type: 'cancelled',
      tenantSlug: 'demo',
    })?.label).toBe('Zum Kundenkonto')
  })

  it('uses the public booking page when customer login is off', () => {
    expect(resolveAppointmentEmailCta({
      type: 'appointment_confirmation',
      omitAccountCta: true,
      tenantSlug: 'fahrschule-gemperli',
      appointmentNoun: 'Termin',
    })).toEqual({
      href: 'https://app.simy.ch/booking/availability/fahrschule-gemperli',
      label: 'Weiteren Termin buchen',
      leadIn: 'Weitere Termine kannst du online buchen.',
    })

    expect(resolveAppointmentEmailCta({
      type: 'cancelled',
      omitAccountCta: true,
      tenantSlug: 'fahrschule-gemperli',
    })?.label).toBe('Neuen Termin buchen')

    expect(resolveAppointmentEmailCta({
      type: 'rescheduled',
      omitAccountCta: true,
      tenantSlug: 'fahrschule-gemperli',
    })?.label).toBe('Weiteren Termin buchen')
  })

  it('returns no CTA without a tenant slug when login is off', () => {
    expect(resolveAppointmentEmailCta({
      type: 'cancelled',
      omitAccountCta: true,
    })).toBeNull()
  })
})
