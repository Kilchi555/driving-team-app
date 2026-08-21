import { describe, expect, it } from 'vitest'
import {
  duplicateEmailMessage,
  duplicatePhoneMessage,
  formatPersonName,
  messageForUniqueConstraint
} from '../student-contact-conflict'

describe('student-contact-conflict', () => {
  it('formats a full name', () => {
    expect(formatPersonName({ first_name: 'Antonella', last_name: 'Martino' })).toBe('Antonella Martino')
  })

  it('falls back when the name is missing', () => {
    expect(formatPersonName({})).toBe('einem anderen Konto')
  })

  it('names the other customer for a phone conflict', () => {
    expect(duplicatePhoneMessage({ first_name: 'Antonella', last_name: 'Martino' }))
      .toBe('Diese Telefonnummer ist bereits bei Antonella Martino hinterlegt.')
  })

  it('marks pending and deactivated accounts', () => {
    expect(duplicatePhoneMessage({
      first_name: 'Martino',
      last_name: 'Antonella',
      onboarding_status: 'pending'
    })).toContain('Onboarding noch offen')

    expect(duplicateEmailMessage({
      first_name: 'Max',
      last_name: 'Muster',
      is_active: false
    })).toContain('deaktiviertes Konto')
  })

  it('maps the postgres unique constraint to a German message', () => {
    expect(messageForUniqueConstraint(
      'duplicate key value violates unique constraint "users_phone_tenant_unique"',
      { first_name: 'Antonella', last_name: 'Martino' }
    )).toBe('Diese Telefonnummer ist bereits bei Antonella Martino hinterlegt.')

    expect(messageForUniqueConstraint(
      'duplicate key value violates unique constraint "users_email_tenant_unique"'
    )).toBe('Diese E-Mail-Adresse ist bereits einem anderen Kunden zugeordnet.')

    expect(messageForUniqueConstraint('some other error')).toBeNull()
  })
})
