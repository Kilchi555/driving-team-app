/**
 * Registration email heuristics.
 * Remote disposable lookups are stubbed — these tests must not call the network.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  REGISTRATION_SPAM_EMAIL_REASON,
  isDisposableEmail,
  isSpamEmail,
  validateRegistrationEmail,
} from '../email-validator'
import { validateEmail } from '../validators'

const ACCEPTED = [
  'max@example.com',
  'max.mustermann@example.com',
  'max+test@example.com',
  'max@example.ch',
  'max@example.co.uk',
  'first.last+tag@example.ch',
  'hans.19850312@bluewin.ch',
  '0791234567@sunrise.ch',
  'user123456@gmail.com',
  'rechnung202601@firma.ch',
  'max+test123456@example.com',
  'admin@example.com',
  'testing@example.com',
  'test.user@example.com',
  '123456@example.com',
]

const REJECTED = [
  'test@example.com',
  'Test@Example.com',
  'test1@example.com',
  'spam@example.com',
  'fake@example.com',
  'xxx@example.com',
  'zzz@example.com',
  'aaa@example.com',
  'bbb@example.com',
  'aaaaaa@example.com',
  'aaaaaaa@example.com',
  '111111@example.com',
]

function stubDisposableLookup(disposable: boolean) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ disposable }),
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('isSpamEmail', () => {
  it.each(ACCEPTED)('accepts %s', (email) => {
    expect(isSpamEmail(email)).toBe(false)
  })

  it.each(REJECTED)('rejects %s', (email) => {
    expect(isSpamEmail(email)).toBe(true)
  })

  it('does not reject five consecutive digits', () => {
    expect(isSpamEmail('user12345@example.com')).toBe(false)
    expect(isSpamEmail('name12345@example.ch')).toBe(false)
  })
})

describe('validateEmail format helper', () => {
  it('accepts ordinary, plus-tag, and numeric local parts', () => {
    expect(validateEmail('max@example.com')).toEqual({ valid: true })
    expect(validateEmail('user+tag@domain.co.uk')).toEqual({ valid: true })
    expect(validateEmail('hans.19850312@bluewin.ch')).toEqual({ valid: true })
    expect(validateEmail('user123456@gmail.com')).toEqual({ valid: true })
  })

  it('rejects malformed values and reports { valid }', () => {
    expect(validateEmail('not-an-email')).toEqual({ valid: false })
    expect(validateEmail('test@')).toEqual({ valid: false })
    expect(validateEmail('@example.com')).toEqual({ valid: false })
    expect(validateEmail(' test@example.com')).toEqual({ valid: false })
    expect(validateEmail('')).toEqual({ valid: false })
    expect(validateEmail(null)).toEqual({ valid: false })
    expect(validateEmail(undefined)).toEqual({ valid: false })
  })
})

describe('validateRegistrationEmail', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts a birth-date local part when the remote disposable check is clean', async () => {
    const fetchMock = stubDisposableLookup(false)
    await expect(validateRegistrationEmail('hans.19850312@bluewin.ch')).resolves.toEqual({ valid: true })
    expect(fetchMock).toHaveBeenCalled()
  })

  it('rejects exact spam local parts with the staff registration reason', async () => {
    stubDisposableLookup(false)
    await expect(validateRegistrationEmail('test@example.com')).resolves.toEqual({
      valid: false,
      reason: REGISTRATION_SPAM_EMAIL_REASON,
    })
    await expect(validateRegistrationEmail('aaaaaa@example.com')).resolves.toEqual({
      valid: false,
      reason: REGISTRATION_SPAM_EMAIL_REASON,
    })
  })

  it('still rejects the local disposable-domain list without a network call', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(isDisposableEmail('person@mailinator.com')).toBe(true)
    await expect(validateRegistrationEmail('person@mailinator.com')).resolves.toEqual({
      valid: false,
      reason: 'Bitte verwenden Sie eine echte E-Mail-Adresse',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still rejects a domain the remote disposable check flags', async () => {
    const fetchMock = stubDisposableLookup(true)
    await expect(validateRegistrationEmail('person@example.com')).resolves.toEqual({
      valid: false,
      reason: 'Bitte verwenden Sie eine echte E-Mail-Adresse',
    })
    expect(fetchMock).toHaveBeenCalled()
  })
})

describe('staff invite paths share the spam heuristic', () => {
  const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

  it('checks isSpamEmail before a staff invitation email can be locked', () => {
    for (const path of [
      'server/api/staff/invite.post.ts',
      'server/api/staff/resend-invite.post.ts',
      'server/api/staff/check-invite-email.get.ts',
      'server/api/tenants/invite-staff-batch.post.ts',
      'server/api/tenants/check-availability.get.ts',
      'server/api/admin/tenants/[id]/actions.post.ts',
    ]) {
      expect(read(path), path).toContain('isSpamEmail')
    }
    expect(read('server/api/tenants/check-availability.get.ts')).not.toContain('validateRegistrationEmail')
    expect(read('server/api/staff/check-invite-email.get.ts')).not.toContain('validateRegistrationEmail')
  })
})
