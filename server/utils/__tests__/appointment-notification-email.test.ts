import { describe, expect, it } from 'vitest'
import { renderAppointmentDetailHtml, renderAppointmentNotificationEmail } from '../appointment-notification-email'

describe('renderAppointmentDetailHtml', () => {
  it('mentions vehicle and room only when they are set', () => {
    const withResources = renderAppointmentDetailHtml({
      email: 'a@b.ch',
      studentName: 'Max Muster',
      type: 'appointment_confirmation',
      appointmentTime: 'Freitag, 28.08.2026, 10:00',
      vehicleLabel: 'Schulfahrzeug',
      roomName: 'Theoriezimmer 1',
    })
    expect(withResources).toContain('Fahrzeug:')
    expect(withResources).toContain('Schulfahrzeug')
    expect(withResources).toContain('Raum:')
    expect(withResources).toContain('Theoriezimmer 1')

    const withoutResources = renderAppointmentDetailHtml({
      email: 'a@b.ch',
      studentName: 'Max Muster',
      type: 'appointment_confirmation',
      appointmentTime: 'Freitag, 28.08.2026, 10:00',
    })
    expect(withoutResources).not.toContain('Fahrzeug:')
    expect(withoutResources).not.toContain('Raum:')
  })
})

describe('cancelled appointment email branding', () => {
  it('uses tenant color and tenant name in the header, not a hardcoded red block', async () => {
    const { html } = await renderAppointmentNotificationEmail({
      email: 'a@b.ch',
      studentName: 'Max Muster',
      type: 'cancelled',
      appointmentTime: 'Freitag, 28.08.2026, 10:00',
      tenantName: 'Fahrschule Driving Team',
      cancellationReason: 'Krankheit',
    })
    expect(html).toContain('background-color: #2563eb')
    expect(html).toContain('Fahrschule Driving Team')
    expect(html).not.toContain('Simy · Termin')
    expect(html).not.toMatch(/background-color:\s*#dc2626;\s*padding:\s*40px/)
  })

  it('keeps reschedule mail on tenant branding too', async () => {
    const { html } = await renderAppointmentNotificationEmail({
      email: 'a@b.ch',
      studentName: 'Max Muster',
      type: 'rescheduled',
      oldTime: 'Freitag, 28.08.2026, 10:00',
      newTime: 'Samstag, 29.08.2026, 11:00',
      tenantName: 'Fahrschule Driving Team',
    })
    expect(html).toContain('background-color: #2563eb')
    expect(html).toContain('Fahrschule Driving Team')
    expect(html).not.toContain('Simy · Termin')
  })
})
