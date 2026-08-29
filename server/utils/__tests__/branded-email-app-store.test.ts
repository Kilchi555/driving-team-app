import { describe, expect, it } from 'vitest'
import {
  buildSimyPlatformEmail,
  emailAppStoreBlock,
  emailAppointmentAppStoreBlock,
  SIMY_LOGO_URL,
} from '../branded-email'

describe('emailAppStoreBlock', () => {
  it('renders the App Store CTA by default', () => {
    const html = emailAppStoreBlock()
    expect(html).toContain('Laden im App Store')
    expect(html).toContain('https://apps.apple.com/ch/app/simy/id6766244063')
  })

  it('returns empty when customer accounts / onboarding are off', () => {
    expect(emailAppStoreBlock('Simy auch als iPhone-App verfügbar', false)).toBe('')
    expect(emailAppointmentAppStoreBlock(false)).toBe('')
  })

  it('keeps the appointment caption when enabled', () => {
    expect(emailAppointmentAppStoreBlock(true)).toContain('Mitteilungen und Termine in der iPhone-App')
  })
})

describe('buildSimyPlatformEmail', () => {
  it('uses the Simy logo, purple header and eyebrow', () => {
    const html = buildSimyPlatformEmail({
      eyebrow: 'Simy · Termin',
      title: 'Termin verschoben',
      bodyHtml: '<p>Hallo</p>',
    })
    expect(html).toContain(SIMY_LOGO_URL)
    expect(html).toContain('Simy · Termin')
    expect(html).toContain('Termin verschoben')
    expect(html).toContain('#6000BD')
  })
})
