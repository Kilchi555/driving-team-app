/**
 * Registration email heuristics.
 * Remote disposable lookups are stubbed — these tests must not call the network.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  REGISTRATION_DISPOSABLE_EMAIL_REASON,
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

/** Per-provider stub matching production URL + parse rules (no network). */
function stubProviderDisagreement(opts: {
  mailcheck: { ok?: boolean, disposable?: boolean, mx?: boolean }
  debounce: { ok?: boolean, disposable?: boolean | string }
}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('api.mailcheck.ai')) {
      const ok = opts.mailcheck.ok !== false
      return {
        ok,
        status: ok ? 200 : 429,
        json: async () =>
          ok
            ? {
                disposable: opts.mailcheck.disposable === true,
                mx: opts.mailcheck.mx === true,
              }
            : { error: 'Too many requests' },
      }
    }
    if (url.includes('disposable.debounce.io')) {
      const ok = opts.debounce.ok !== false
      return {
        ok,
        status: ok ? 200 : 429,
        json: async () =>
          ok
            ? { disposable: opts.debounce.disposable }
            : { error: 'Too many requests' },
      }
    }
    throw new Error(`Unexpected fetch URL in test: ${url}`)
  })
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
      reason: REGISTRATION_DISPOSABLE_EMAIL_REASON,
      disposableRejection: { domain: 'mailinator.com', signal: 'local' },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still rejects a domain the remote disposable check flags', async () => {
    const fetchMock = stubDisposableLookup(true)
    await expect(validateRegistrationEmail('person@example.com')).resolves.toEqual({
      valid: false,
      reason: REGISTRATION_DISPOSABLE_EMAIL_REASON,
      disposableRejection: { domain: 'example.com', signal: 'mailcheck' },
    })
    expect(fetchMock).toHaveBeenCalled()
  })

  // A — bluemail.ch allowlist: debounce-only false positive must not reject
  it('accepts bluemail.ch when debounce says disposable and mailcheck does not', async () => {
    const fetchMock = stubProviderDisagreement({
      mailcheck: { disposable: false, mx: true },
      debounce: { disposable: 'true' },
    })
    await expect(validateRegistrationEmail('user@bluemail.ch')).resolves.toEqual({ valid: true })
    // Allowlist skips remote lookups entirely.
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // I — allowlist applies after domain lowercasing (same extraction as production)
  it('accepts case-variant bluemail.ch addresses via exact normalized domain match', async () => {
    stubProviderDisagreement({
      mailcheck: { disposable: false, mx: true },
      debounce: { disposable: 'true' },
    })
    await expect(validateRegistrationEmail('User@BLUEMAIL.CH')).resolves.toEqual({ valid: true })
  })

  // B — no global provider override: same disagreement on another domain still rejects
  it('still rejects simplelogin.co on debounce-only disposable (no global override)', async () => {
    const fetchMock = stubProviderDisagreement({
      mailcheck: { disposable: false, mx: true },
      debounce: { disposable: 'true' },
    })
    await expect(validateRegistrationEmail('user@simplelogin.co')).resolves.toEqual({
      valid: false,
      reason: REGISTRATION_DISPOSABLE_EMAIL_REASON,
      disposableRejection: { domain: 'simplelogin.co', signal: 'debounce' },
    })
    expect(fetchMock).toHaveBeenCalled()
  })

  // C — classic disposable with mailcheck disposable true remains invalid
  it('rejects yopmail.com when mailcheck marks disposable even if mx is true', async () => {
    stubProviderDisagreement({
      mailcheck: { disposable: true, mx: true },
      debounce: { disposable: true },
    })
    await expect(validateRegistrationEmail('user@yopmail.com')).resolves.toEqual({
      valid: false,
      reason: REGISTRATION_DISPOSABLE_EMAIL_REASON,
      disposableRejection: { domain: 'yopmail.com', signal: 'local' },
    })
  })

  // D covered above via mailinator local-list test

  // E — fail-open: debounce HTTP failure must not reject when mailcheck is clean
  it('fails open when debounce returns HTTP error and mailcheck is clean', async () => {
    stubProviderDisagreement({
      mailcheck: { disposable: false, mx: true },
      debounce: { ok: false, disposable: 'true' },
    })
    await expect(validateRegistrationEmail('person@example.com')).resolves.toEqual({ valid: true })
  })

  // F — debounce string "false" with clean mailcheck → valid
  it('accepts when debounce returns disposable string false and mailcheck is clean', async () => {
    stubProviderDisagreement({
      mailcheck: { disposable: false, mx: true },
      debounce: { disposable: 'false' },
    })
    await expect(validateRegistrationEmail('person@example.com')).resolves.toEqual({ valid: true })
  })

  // H — bluemail exception must not spill to other legitimate domains
  it('does not allowlist bluewin.ch: debounce-only disposable still rejects', async () => {
    stubProviderDisagreement({
      mailcheck: { disposable: false, mx: true },
      debounce: { disposable: 'true' },
    })
    await expect(validateRegistrationEmail('hans@bluewin.ch')).resolves.toEqual({
      valid: false,
      reason: REGISTRATION_DISPOSABLE_EMAIL_REASON,
      disposableRejection: { domain: 'bluewin.ch', signal: 'debounce' },
    })
  })

  it('does not match suffix lookalikes of bluemail.ch', async () => {
    stubProviderDisagreement({
      mailcheck: { disposable: false, mx: true },
      debounce: { disposable: 'true' },
    })
    await expect(validateRegistrationEmail('user@notbluemail.ch')).resolves.toEqual({
      valid: false,
      reason: REGISTRATION_DISPOSABLE_EMAIL_REASON,
      disposableRejection: { domain: 'notbluemail.ch', signal: 'debounce' },
    })
    await expect(validateRegistrationEmail('user@sub.bluemail.ch')).resolves.toEqual({
      valid: false,
      reason: REGISTRATION_DISPOSABLE_EMAIL_REASON,
      disposableRejection: { domain: 'sub.bluemail.ch', signal: 'debounce' },
    })
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
