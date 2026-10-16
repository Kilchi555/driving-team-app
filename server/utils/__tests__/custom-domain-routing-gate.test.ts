import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  customDomainActivation,
  customDomainOrigin,
  decideCustomDomainRoute,
  hasPositiveDnsEvidence,
  hasPositivePlatformEvidence,
  hasPositiveTlsEvidence,
  isAppHost,
  isCustomDomainRoutingEnabled,
  presentPublicWebsiteDomain,
  type CustomDomainEvidenceRow,
  type CustomDomainLookup,
} from '../custom-domain'

const HOST = 'www.example-driving-school.ch'

function row(overrides: Partial<CustomDomainEvidenceRow> = {}): CustomDomainEvidenceRow {
  return {
    custom_domain: HOST,
    is_published: true,
    custom_domain_verified: false,
    custom_domain_status: 'dns_pending',
    custom_domain_verification: null,
    ...overrides,
  }
}

function readyEvidence() {
  return {
    dns: { ok: true },
    vercel: { configured: true, verified: true },
    tls: { ok: true },
  }
}

function lookup(overrides: Partial<CustomDomainEvidenceRow> = {}): CustomDomainLookup {
  return {
    ok: true,
    row: { ...row(overrides), subdomain: 'tenant-a' },
  }
}

describe('isCustomDomainRoutingEnabled', () => {
  it('fails closed when DNS matches but the Vercel API is missing', () => {
    const verification = { dns: { ok: true }, vercel: { configured: false, verified: false } }
    expect(hasPositiveDnsEvidence(verification)).toBe(true)
    expect(hasPositivePlatformEvidence(verification)).toBe(false)
    expect(isCustomDomainRoutingEnabled(row({
      custom_domain_verified: true,
      custom_domain_status: 'active',
      custom_domain_verification: verification,
    }))).toBe(false)
    expect(customDomainActivation({
      domain: HOST,
      isPublished: true,
      verification,
    })).toEqual({ verified: false, status: 'dns_pending' })
  })

  it('fails closed on Vercel failure or a missing project association', () => {
    const verification = {
      dns: { ok: true },
      vercel: { configured: false, verified: false, error: 'project mismatch' },
      tls: { ok: true },
    }
    expect(hasPositivePlatformEvidence(verification)).toBe(false)
    expect(isCustomDomainRoutingEnabled(row({ custom_domain_verification: verification }))).toBe(false)
  })

  it('fails closed when TLS evidence is missing or failed', () => {
    const missing = { dns: { ok: true }, vercel: { configured: true, verified: true } }
    const failed = { ...missing, tls: { ok: false } }
    expect(hasPositiveTlsEvidence(missing)).toBe(false)
    expect(hasPositiveTlsEvidence(failed)).toBe(false)
    expect(isCustomDomainRoutingEnabled(row({ custom_domain_verification: missing }))).toBe(false)
    expect(isCustomDomainRoutingEnabled(row({ custom_domain_verification: failed }))).toBe(false)
    expect(customDomainActivation({ domain: HOST, isPublished: true, verification: missing }).verified).toBe(false)
  })

  it('does not treat verified=true or status=active as proof when evidence is incomplete', () => {
    expect(isCustomDomainRoutingEnabled(row({
      custom_domain_verified: true,
      custom_domain_status: 'active',
      custom_domain_verification: { dns: { ok: true } },
    }))).toBe(false)
    expect(customDomainOrigin(row({
      custom_domain_verified: true,
      custom_domain_status: 'active',
    }))).toBeNull()
  })

  it('allows routing only when platform, DNS, TLS and publish are all true', () => {
    const enabled = row({ custom_domain_verification: readyEvidence() })
    expect(isCustomDomainRoutingEnabled(enabled)).toBe(true)
    expect(customDomainOrigin(enabled)).toBe(`https://${HOST}`)
    expect(isCustomDomainRoutingEnabled(row({
      is_published: false,
      custom_domain_verification: readyEvidence(),
    }))).toBe(false)
  })

  it('ignores truthy non-booleans', () => {
    expect(isCustomDomainRoutingEnabled(row({
      custom_domain_verification: {
        dns: { ok: 'true' },
        vercel: { configured: 1, verified: 'yes' },
        tls: { ok: 'true' },
      },
    }))).toBe(false)
  })
})

describe('decideCustomDomainRoute', () => {
  it('keeps app.simy.ch on the normal app, including /s/{tenant}', () => {
    expect(isAppHost('app.simy.ch')).toBe(true)
    expect(decideCustomDomainRoute({
      host: 'app.simy.ch',
      path: '/s/tenant-b',
      lookup: { ok: false, reason: 'conflict' },
    })).toEqual({ action: 'app' })
    expect(decideCustomDomainRoute({
      host: 'app.simy.ch',
      path: '/s/fahrschule-sara',
      lookup: null,
    })).toEqual({ action: 'app' })
  })

  it('does not let an unknown host open /s/{other-tenant}', () => {
    expect(decideCustomDomainRoute({
      host: 'unknown.example',
      path: '/s/tenant-b',
      lookup: { ok: false, reason: 'missing' },
    })).toEqual({ action: 'not_found' })
  })

  it('does not route a duplicate or conflicting assignment to either tenant', () => {
    const decision = decideCustomDomainRoute({
      host: HOST,
      path: '/',
      lookup: { ok: false, reason: 'conflict' },
    })
    expect(decision).toEqual({ action: 'not_found' })
    expect(decision).not.toHaveProperty('subdomain')
  })

  it('does not keep a previous allow after the domain is removed', () => {
    const allowed = decideCustomDomainRoute({
      host: HOST,
      path: '/',
      lookup: lookup({ custom_domain_verification: readyEvidence() }),
    })
    expect(allowed).toMatchObject({ action: 'rewrite', subdomain: 'tenant-a' })

    const removed = decideCustomDomainRoute({
      host: HOST,
      path: '/',
      lookup: { ok: false, reason: 'missing' },
    })
    expect(removed).toEqual({ action: 'not_found' })
  })

  it('does not rewrite when the stored flag is true but TLS is absent', () => {
    expect(decideCustomDomainRoute({
      host: HOST,
      path: '/s/tenant-b',
      lookup: lookup({
        custom_domain_verified: true,
        custom_domain_status: 'active',
        custom_domain_verification: { dns: { ok: true }, vercel: { configured: true, verified: true } },
      }),
    })).toEqual({ action: 'not_found' })
  })
})

describe('public URL and response', () => {
  it('uses the path host for sitemap and robots until routing is enabled', () => {
    const incomplete = row({ custom_domain_verified: true, custom_domain_status: 'active' })
    const standard = customDomainOrigin(incomplete) || 'https://app.simy.ch/s/tenant-a'
    expect(standard).toBe('https://app.simy.ch/s/tenant-a')
    expect(standard).not.toContain(HOST)

    const enabled = customDomainOrigin(row({ custom_domain_verification: readyEvidence() }))
    expect(enabled).toBe(`https://${HOST}`)
  })

  it('does not return stored verification JSON on the public website payload', () => {
    const presented = presentPublicWebsiteDomain({
      ...row({ custom_domain_verification: readyEvidence() }),
      seo_title: 'Example',
    })
    expect(presented.custom_domain_routing_enabled).toBe(true)
    expect(presented).not.toHaveProperty('custom_domain_verification')
    expect(presented).not.toHaveProperty('custom_domain_status')
  })
})

describe('writers cannot invent an active domain', () => {
  it('claim and verify do not record TLS success or the old DNS-only activation', () => {
    const post = readFileSync('server/api/website/custom-domain.post.ts', 'utf8')
    const verify = readFileSync('server/api/website/custom-domain/verify.post.ts', 'utf8')
    const middleware = readFileSync('server/middleware/02.custom-domain.ts', 'utf8')
    const robots = readFileSync('server/routes/robots.txt.ts', 'utf8')
    for (const src of [post, verify]) {
      expect(src).toContain('customDomainActivation')
      expect(src).not.toMatch(/tls:\s*\{/)
      expect(src).not.toContain('vercelApiMissing')
    }
    expect(middleware).not.toContain('CACHE_MS')
    expect(middleware).not.toContain('new Map')
    expect(robots).toContain('statusCode: 404')
  })
})
