import { describe, expect, it } from 'vitest'
import { emailAppStoreBlock, emailAppointmentAppStoreBlock } from '../branded-email'

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
