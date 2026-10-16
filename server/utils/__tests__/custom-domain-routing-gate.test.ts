import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CUSTOM_DOMAIN_EVIDENCE_MAX_AGE_MS,
  ClientCustomDomainEvidenceError,
  customDomainActivation,
  customDomainLookupFromQuery,
  customDomainOrigin,
  decideCustomDomainRoute,
  evaluateCustomDomainRouting,
  hasAuthoritativeTlsEvidence,
  hasFreshCheckedAt,
  hasPositiveDnsEvidence,
  hasPositivePlatformEvidence,
  hasPositiveTlsEvidence,
  isAppHost,
  isCustomDomainRoutingEnabled,
  presentPublicWebsiteDomain,
  readCustomDomainClaimBody,
  type CustomDomainEvidenceRow,
  type CustomDomainLookup,
} from '../custom-domain'

const HOST = 'www.example-driving-school.ch'
const NOW = Date.parse('2026-10-16T12:00:00.000Z')

function iso(ms: number): string {
  return new Date(ms).toISOString()
}

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

function readyEvidence(checkedAt: string = iso(NOW)) {
  return {
    dns: { ok: true },
    vercel: { configured: true, verified: true },
    tls: { ok: true },
    checked_at: checkedAt,
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

  it('does not activate routing from a client-supplied tls.ok, even with fresh platform and DNS evidence', () => {
    const evidence = readyEvidence()
    expect(evidence.tls).toEqual({ ok: true })
    expect(hasPositiveTlsEvidence(evidence)).toBe(false)
    expect(hasAuthoritativeTlsEvidence()).toBe(false)
    const stored = row({ custom_domain_verification: evidence })
    expect(isCustomDomainRoutingEnabled(stored, NOW)).toBe(false)
    expect(customDomainOrigin(stored, NOW)).toBeNull()
    expect(customDomainActivation({
      domain: HOST,
      isPublished: true,
      verification: evidence,
      nowMs: NOW,
    })).toEqual({ verified: false, status: 'dns_pending' })
    expect(isCustomDomainRoutingEnabled(row({
      is_published: false,
      custom_domain_verification: evidence,
    }), NOW)).toBe(false)
    expect(decideCustomDomainRoute({
      host: HOST,
      path: '/',
      lookup: lookup({ custom_domain_verification: evidence }),
    })).toEqual({ action: 'not_found' })
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
    const earlier = decideCustomDomainRoute({
      host: HOST,
      path: '/',
      lookup: lookup({ custom_domain_verification: readyEvidence() }),
    })
    expect(earlier).toEqual({ action: 'not_found' })

    const removed = decideCustomDomainRoute({
      host: HOST,
      path: '/',
      lookup: { ok: false, reason: 'missing' },
    })
    expect(removed).toEqual({ action: 'not_found' })
  })

  it('returns not_found for a database error and does not retain an earlier row', () => {
    const failedLookup = customDomainLookupFromQuery({
      data: {
        subdomain: 'tenant-a',
        custom_domain: HOST,
        is_published: true,
        custom_domain_verification: readyEvidence(),
      },
      error: { message: 'connection failed' },
    })
    expect(failedLookup).toEqual({ ok: false, reason: 'error' })
    expect(decideCustomDomainRoute({
      host: HOST,
      path: '/',
      lookup: failedLookup,
    })).toEqual({ action: 'not_found' })

    const again = decideCustomDomainRoute({
      host: HOST,
      path: '/s/tenant-a',
      lookup: customDomainLookupFromQuery({ data: null, error: { code: 'XX000' } }),
    })
    expect(again).toEqual({ action: 'not_found' })
    expect(again).not.toHaveProperty('subdomain')
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

    const enabled = customDomainOrigin(row({ custom_domain_verification: readyEvidence() }), NOW)
    expect(enabled).toBeNull()
  })

  it('does not return stored verification JSON on the public website payload', () => {
    const presented = presentPublicWebsiteDomain({
      ...row({ custom_domain_verification: readyEvidence() }),
      seo_title: 'Example',
    })
    expect(presented.custom_domain_routing_enabled).toBe(false)
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
      expect(src).toContain('readCustomDomainClaimBody')
      expect(src).not.toMatch(/tls:\s*\{/)
      expect(src).not.toContain('vercelApiMissing')
    }
    expect(middleware).toContain('customDomainLookupFromQuery')
    expect(middleware).toContain('statusCode: 404')
    expect(middleware).not.toContain('CACHE_MS')
    expect(middleware).not.toContain('new Map')
    expect(robots).toContain('statusCode: 404')

    const builders = [
      'server/utils/website-billing.ts',
      'server/utils/website-ensure-home.ts',
      'server/utils/website-ensure-seo-pages.ts',
      'server/api/website/wizard-save.post.ts',
      'server/api/website/slots-save.post.ts',
      'server/api/website/addon/generate.post.ts',
      'server/api/admin/billing-status.get.ts',
    ]
    for (const file of builders) {
      const src = readFileSync(file, 'utf8')
      expect(src).toContain('customDomainOrigin')
      expect(src).not.toMatch(/custom_domain_verified\s*&&/)
    }

    const sql = readFileSync('sql_migrations/20261016_protect_website_custom_domain_evidence.sql', 'utf8')
    expect(sql).toContain('UNAPPLIED')
    expect(sql).toContain('custom_domain_verification')
    expect(sql).toContain('custom_domain_verified')
    expect(sql).toContain('custom_domain_status')
    expect(sql).toContain("'authenticated'")
    expect(sql).not.toContain('auth_user_id')
  })

  it('rejects tenant client fields that would mutate verification state', () => {
    expect(readCustomDomainClaimBody({ domain: HOST })).toEqual({ domain: HOST })
    expect(readCustomDomainClaimBody(undefined)).toEqual({ domain: '' })
    for (const body of [
      { domain: HOST, tls: { ok: true } },
      { domain: HOST, custom_domain_verified: true },
      { domain: HOST, custom_domain_status: 'active' },
      { domain: HOST, custom_domain_verification: { tls: { ok: true }, checked_at: iso(NOW) } },
      { verification: { tls: { ok: true } } },
    ]) {
      expect(() => readCustomDomainClaimBody(body)).toThrow(ClientCustomDomainEvidenceError)
    }
  })
})

describe('checked_at freshness', () => {
  it('fails closed for missing, invalid, future, and older-than-60-minute timestamps', () => {
    const missing = { dns: { ok: true }, vercel: { configured: true, verified: true }, tls: { ok: true } }
    const invalid = readyEvidence('not-a-date')
    const blank = readyEvidence('   ')
    const future = readyEvidence(iso(NOW + 1))
    const stale = readyEvidence(iso(NOW - CUSTOM_DOMAIN_EVIDENCE_MAX_AGE_MS - 1))
    for (const verification of [missing, invalid, blank, future, stale]) {
      expect(hasFreshCheckedAt(verification, NOW)).toBe(false)
      expect(isCustomDomainRoutingEnabled(row({ custom_domain_verification: verification }), NOW)).toBe(false)
      // true is a test double for the missing TLS reader. It is not a certificate.
      expect(evaluateCustomDomainRouting(
        row({ custom_domain_verification: verification }),
        NOW,
        true,
      )).toBe(false)
    }
  })

  it('does not treat a fresh timestamp as DNS, TLS, or an active route', () => {
    const onlyFresh = { checked_at: iso(NOW) }
    expect(hasFreshCheckedAt(onlyFresh, NOW)).toBe(true)
    expect(isCustomDomainRoutingEnabled(row({ custom_domain_verification: onlyFresh }), NOW)).toBe(false)
    expect(evaluateCustomDomainRouting(row({ custom_domain_verification: onlyFresh }), NOW, true)).toBe(false)
    expect(customDomainOrigin(row({ custom_domain_verification: onlyFresh }), NOW)).toBeNull()
  })

  it('accepts an age of exactly 60 minutes as freshness only', () => {
    const verification = readyEvidence(iso(NOW - CUSTOM_DOMAIN_EVIDENCE_MAX_AGE_MS))
    expect(hasFreshCheckedAt(verification, NOW)).toBe(true)
    expect(isCustomDomainRoutingEnabled(row({ custom_domain_verification: verification }), NOW)).toBe(false)
    expect(evaluateCustomDomainRouting(
      row({ custom_domain_verification: verification }),
      NOW,
      true,
    )).toBe(true)
    expect(evaluateCustomDomainRouting(
      row({ custom_domain_verification: verification }),
      NOW,
      false,
    )).toBe(false)
  })
})
