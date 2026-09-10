import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { redactSensitiveUrl, urlWithoutQueryForLogs } from '~/utils/redact-sensitive-url'

const STAFF_SECRET_URL = 'https://app.simy.ch/register/staff?token=SECRET'

describe('redactSensitiveUrl', () => {
  it('redacts staff invitation tokens from absolute URLs', () => {
    const redacted = redactSensitiveUrl(STAFF_SECRET_URL)
    expect(redacted).toBe('https://app.simy.ch/register/staff?token=[REDACTED]')
    expect(redacted).not.toContain('SECRET')
    expect(redacted).toContain('/register/staff')
  })

  it('redacts relative staff invitation URLs', () => {
    const redacted = redactSensitiveUrl('/register/staff?token=SECRET')
    expect(redacted).not.toContain('SECRET')
    expect(redacted).toContain('/register/staff')
    expect(redacted).toContain('[REDACTED]')
  })

  it('preserves non-secret query params', () => {
    const redacted = redactSensitiveUrl(
      'https://app.simy.ch/register/staff?token=SECRET&step=1',
    )
    expect(redacted).not.toContain('SECRET')
    expect(redacted).toContain('step=1')
  })

  it('leaves paths without secrets unchanged', () => {
    expect(redactSensitiveUrl('https://app.simy.ch/register/staff')).toBe(
      'https://app.simy.ch/register/staff',
    )
  })

  it('redacts invitation_token aliases', () => {
    const redacted = redactSensitiveUrl(
      'https://app.simy.ch/register/staff?invitation_token=SECRET',
    )
    expect(redacted).not.toContain('SECRET')
  })
})

describe('error telemetry wiring', () => {
  it('sentry client redacts the page URL before error_logs insert', () => {
    const src = readFileSync(resolve(process.cwd(), 'plugins/sentry.client.ts'), 'utf8')
    expect(src).toContain('redactSensitiveUrl(window.location.href)')
    expect(src).not.toMatch(/url:\s*window\.location\.href/)
  })

  it('client logger redacts the page URL before /api/logs/save', () => {
    const src = readFileSync(resolve(process.cwd(), 'utils/logger.ts'), 'utf8')
    expect(src).toContain('redactSensitiveUrl(window.location.href)')
    expect(src).not.toMatch(/return window\.location\.href/)
  })

  it('does not add token to history.replaceState auth stripping (would break staff submit)', () => {
    const src = readFileSync(resolve(process.cwd(), 'utils/auth-url-session.ts'), 'utf8')
    expect(src).not.toMatch(/^\s*'token',/m)
    expect(src).toContain('token_hash')
  })

  it('current-user logs pathname-only referer, never raw search', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/auth/current-user.get.ts'), 'utf8')
    expect(src).toContain('urlWithoutQueryForLogs')
    expect(src).toContain('return new URL(referer).pathname')
    expect(src).not.toContain('url.pathname + url.search')
    expect(src).toContain('referer: refererLog')
    expect(src).toContain('referer: urlWithoutQueryForLogs(referer)')
    expect(src).not.toMatch(/^\s+referer,$/m)
  })
})

describe('urlWithoutQueryForLogs', () => {
  it('strips invite query strings from absolute URLs', () => {
    const out = urlWithoutQueryForLogs(
      'http://127.0.0.1:3999/register/staff?token=SECRET&staffInviteToken=SECRET',
    )
    expect(out).toBe('http://127.0.0.1:3999/register/staff')
    expect(out).not.toContain('SECRET')
    expect(out).not.toContain('?')
  })

  it('returns pathname only for relative URLs', () => {
    expect(urlWithoutQueryForLogs('/register/staff?token=SECRET')).toBe('/register/staff')
  })

  it('does not echo malformed referers that may contain secrets', () => {
    expect(urlWithoutQueryForLogs('not a url token=SECRET')).toBe('unknown')
  })
})
