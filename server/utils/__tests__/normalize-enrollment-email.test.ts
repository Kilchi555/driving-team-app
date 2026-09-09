import { describe, expect, it } from 'vitest'
import { normalizeEnrollmentEmail } from '../normalize-enrollment-email'

describe('normalizeEnrollmentEmail', () => {
  it('returns null for blank / missing values', () => {
    expect(normalizeEnrollmentEmail(null)).toBeNull()
    expect(normalizeEnrollmentEmail(undefined)).toBeNull()
    expect(normalizeEnrollmentEmail('')).toBeNull()
    expect(normalizeEnrollmentEmail('   ')).toBeNull()
  })

  it('trims and lowercases real addresses', () => {
    expect(normalizeEnrollmentEmail('  Foo@Example.CH ')).toBe('foo@example.ch')
  })
})
