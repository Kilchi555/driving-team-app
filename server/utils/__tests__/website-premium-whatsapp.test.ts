import { describe, expect, it } from 'vitest'
import {
  isWhatsAppCapablePhone,
  resolveWhatsAppPhone,
  whatsappUrlForTenant,
  whatsappUrlFromPhone,
} from '../website-premium'

describe('WhatsApp phone', () => {
  it('treats Swiss mobiles as WhatsApp-capable and landlines as not', () => {
    expect(isWhatsAppCapablePhone('+41 79 123 45 67')).toBe(true)
    expect(isWhatsAppCapablePhone('079 123 45 67')).toBe(true)
    expect(isWhatsAppCapablePhone('+41 44 450 22 22')).toBe(false)
    expect(isWhatsAppCapablePhone('044 450 22 22')).toBe(false)
  })

  it('prefers the dedicated WhatsApp number over a landline', () => {
    expect(resolveWhatsAppPhone('+41 79 111 22 33', '044 450 22 22')).toBe('+41 79 111 22 33')
    expect(resolveWhatsAppPhone('', '044 450 22 22')).toBe(null)
    expect(resolveWhatsAppPhone(null, '079 123 45 67')).toBe('079 123 45 67')
  })

  it('builds wa.me from the tenant WhatsApp number, not the landline', () => {
    expect(whatsappUrlFromPhone('044 450 22 22')).toBe('https://wa.me/41444502222')
    expect(
      whatsappUrlForTenant({
        whatsapp_phone: '+41 79 123 45 67',
        contact_phone: '044 450 22 22',
      }),
    ).toBe('https://wa.me/41791234567')
    expect(
      whatsappUrlForTenant({
        whatsapp_phone: null,
        contact_phone: '044 450 22 22',
      }),
    ).toBe(null)
  })
})
