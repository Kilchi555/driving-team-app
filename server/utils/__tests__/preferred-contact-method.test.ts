import { describe, expect, it } from 'vitest'
import {
  customerPreferredContactIntro,
  isPreferredContactMethod,
  parsePreferredContactFromNotes,
  preferredContactNoteLine,
  upsertPreferredContactNote,
} from '~/utils/preferred-contact-method'

describe('preferred-contact-method', () => {
  it('writes and parses the notes tag', () => {
    const line = preferredContactNoteLine('whatsapp')
    expect(line).toBe('Bevorzugter Kontakt: WhatsApp')
    expect(parsePreferredContactFromNotes(`Rückruf erwünscht\n${line}\nGeburtsdatum: 01.01.2000`)).toBe('WhatsApp')
  })

  it('rejects unknown methods', () => {
    expect(isPreferredContactMethod('fax')).toBe(false)
    expect(isPreferredContactMethod('sms')).toBe(true)
  })

  it('builds the customer email intro from the chosen channel', () => {
    expect(customerPreferredContactIntro('WhatsApp')).toContain('WhatsApp')
    expect(customerPreferredContactIntro('')).toBe('')
  })

  it('lets a validated method win over a spoofed notes line', () => {
    const notes = upsertPreferredContactNote(
      'Bitte abends\nBevorzugter Kontakt: E-Mail',
      'whatsapp',
    )
    expect(notes).toBe('Bitte abends\nBevorzugter Kontakt: WhatsApp')
    expect(parsePreferredContactFromNotes(notes)).toBe('WhatsApp')
  })
})
