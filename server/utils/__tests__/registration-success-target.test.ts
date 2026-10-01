import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveRegistrationSuccessAction } from '../../../utils/registration-success-target'

const SLUG = 'fahrschule-beispiel'
const HTTPS = 'https://example.com'
const HTTP = 'http://example.com'

function action(overrides: Record<string, unknown> = {}) {
  return resolveRegistrationSuccessAction({
    accountMode: 'required',
    routeSlug: SLUG,
    loadedTenantSlug: SLUG,
    registeredSlug: SLUG,
    websiteUrl: HTTPS,
    ...overrides,
  })
}

describe('registration success target', () => {
  it('keeps the login target when the account is required and a website exists', () => {
    expect(action()).toEqual({
      label: 'Zum Login',
      href: `/${SLUG}`,
      external: false,
    })
  })

  it('keeps the login target when the account is required and no website exists', () => {
    expect(action({ websiteUrl: null })).toEqual({
      label: 'Zum Login',
      href: `/${SLUG}`,
      external: false,
    })
    expect(action({ websiteUrl: null, registeredSlug: '', routeSlug: '' })).toEqual({
      label: 'Zum Login',
      href: '/login',
      external: false,
    })
  })

  it('opens a matching https website when the account step is hidden', () => {
    expect(action({ accountMode: 'hidden', websiteUrl: HTTPS })).toEqual({
      label: 'Zurück zur Website',
      href: 'https://example.com/',
      external: true,
    })
  })

  it('opens a matching http website when the account step is hidden', () => {
    expect(action({ accountMode: 'hidden', websiteUrl: `  ${HTTP}/kurse  ` })).toEqual({
      label: 'Zurück zur Website',
      href: 'http://example.com/kurse',
      external: true,
    })
  })

  it.each([
    null,
    undefined,
    '',
    '   ',
    'javascript:alert(1)',
    'data:text/html,hi',
    'vbscript:msgbox(1)',
    '//example.com',
    'https://user:password@example.com',
    'https://user@example.com',
    'not a url',
    'http://',
  ])('falls back to / for hidden mode when the website is %j', (websiteUrl) => {
    expect(action({ accountMode: 'hidden', websiteUrl })).toEqual({
      label: 'Zurück zur Startseite',
      href: '/',
      external: false,
    })
  })

  it('does not use a website when the loaded tenant slug differs from the route', () => {
    expect(action({
      accountMode: 'hidden',
      loadedTenantSlug: 'other-tenant',
      websiteUrl: HTTPS,
    })).toEqual({
      label: 'Zurück zur Startseite',
      href: '/',
      external: false,
    })
  })

  it('keeps the login target when the account mode is missing or unknown', () => {
    for (const accountMode of [undefined, null, '', 'optional', 'REQUIRED']) {
      expect(action({ accountMode, websiteUrl: HTTPS }).href).toBe(`/${SLUG}`)
      expect(action({ accountMode, websiteUrl: HTTPS }).label).toBe('Zum Login')
      expect(action({ accountMode, websiteUrl: HTTPS }).external).toBe(false)
    }
  })
})

describe('registration success page wiring', () => {
  const page = readFileSync(resolve(process.cwd(), 'pages/register/[tenant].vue'), 'utf8')

  it('branches the success button on registrationAccountMode, not the account-step flag', () => {
    expect(page).toContain("registrationAccountMode !== 'hidden'")
    expect(page).toContain('resolveRegistrationSuccessAction')
    expect(page).toContain('loadedTenantSlug: currentTenant.value?.slug')
    expect(page).toContain('websiteUrl: currentTenant.value?.website_url')
    expect(page).not.toContain('navigateTo(tenantSlug ? `/${tenantSlug}` : \'/\')')
    expect(page).toContain('Zum Login')
  })
})
