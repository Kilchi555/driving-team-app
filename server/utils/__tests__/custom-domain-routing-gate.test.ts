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
import type { TlsProbeDeps } from '../custom-domain-tls'

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

function validTls(host: string = HOST): TlsProbeDeps & { calls: { resolve: number; connect: number } } {
  const calls = { resolve: 0, connect: 0 }
  return {
    calls,
    now: new Date(NOW),
    resolve4: async () => {
      calls.resolve += 1
      return ['8.8.8.8']
    },
    connect: async () => {
      calls.connect += 1
      return {
        authorized: true,
        cert: {
          subject: { CN: host },
          subjectaltname: `DNS:${host}`,
          valid_from: 'Jan  1 00:00:00 2026 GMT',
          valid_to: 'Jan  1 00:00:00 2028 GMT',
        },
      }
    },
  }
}

function refusedTls(): TlsProbeDeps & { calls: { resolve: number; connect: number } } {
  const calls = { resolve: 0, connect: 0 }
  return {
    calls,
    now: new Date(NOW),
    resolve4: async () => {
      calls.resolve += 1
      throw Object.assign(new Error('dns'), { code: 'ENOTFOUND' })
    },
    connect: async () => {
      calls.connect += 1
      throw new Error('connect must not run')
    },
  }
}

describe('isCustomDomainRoutingEnabled', () => {
  it('fails closed when DNS matches but the Vercel API is missing', async () => {
    const verification = { dns: { ok: true }, vercel: { configured: false, verified: false } }
    const probe = validTls()
    expect(hasPositiveDnsEvidence(verification)).toBe(true)
    expect(hasPositivePlatformEvidence(verification)).toBe(false)
    expect(await isCustomDomainRoutingEnabled(row({
      custom_domain_verified: true,
      custom_domain_status: 'active',
      custom_domain_verification: verification,
    }), NOW, probe)).toBe(false)
    expect(await customDomainActivation({
      domain: HOST,
      isPublished: true,
      verification,
      tls: probe,
    })).toEqual({ verified: false, status: 'dns_pending' })
    expect(probe.calls.resolve).toBe(0)
  })

  it('fails closed on Vercel failure or a missing project association', async () => {
    const verification = {
      dns: { ok: true },
      vercel: { configured: false, verified: false, error: 'project mismatch' },
      tls: { ok: true },
    }
    const probe = validTls()
    expect(hasPositivePlatformEvidence(verification)).toBe(false)
    expect(await isCustomDomainRoutingEnabled(row({ custom_domain_verification: verification }), NOW, probe)).toBe(false)
    expect(probe.calls.resolve).toBe(0)
  })

  it('fails closed when the live certificate is missing or failed', async () => {
    const missing = { dns: { ok: true }, vercel: { configured: true, verified: true }, checked_at: iso(NOW) }
    const failed = { ...missing, tls: { ok: false } }
    const probe = refusedTls()
    expect(hasPositiveTlsEvidence(missing)).toBe(false)
    expect(hasPositiveTlsEvidence(failed)).toBe(false)
    expect(await isCustomDomainRoutingEnabled(row({ custom_domain_verification: missing }), NOW, probe)).toBe(false)
    expect(await isCustomDomainRoutingEnabled(row({ custom_domain_verification: failed }), NOW, probe)).toBe(false)
    expect((await customDomainActivation({
      domain: HOST,
      isPublished: true,
      verification: missing,
      nowMs: NOW,
      tls: probe,
    })).verified).toBe(false)
  })

  it('does not treat verified=true or status=active as proof when evidence is incomplete', async () => {
    const probe = validTls()
    expect(await isCustomDomainRoutingEnabled(row({
      custom_domain_verified: true,
      custom_domain_status: 'active',
      custom_domain_verification: { dns: { ok: true } },
    }), NOW, probe)).toBe(false)
    expect(await customDomainOrigin(row({
      custom_domain_verified: true,
      custom_domain_status: 'active',
    }), NOW, probe)).toBeNull()
    expect(probe.calls.resolve).toBe(0)
  })

  it('does not activate routing from a client-supplied tls.ok when the handshake fails', async () => {
    const evidence = readyEvidence()
    const probe = refusedTls()
    expect(evidence.tls).toEqual({ ok: true })
    expect(hasPositiveTlsEvidence(evidence)).toBe(false)
    expect(hasAuthoritativeTlsEvidence()).toBe(false)
    const stored = row({ custom_domain_verification: evidence })
    expect(await isCustomDomainRoutingEnabled(stored, NOW, probe)).toBe(false)
    expect(await customDomainOrigin(stored, NOW, probe)).toBeNull()
    expect(await customDomainActivation({
      domain: HOST,
      isPublished: true,
      verification: evidence,
      nowMs: NOW,
      tls: probe,
    })).toEqual({ verified: false, status: 'dns_pending' })
    expect(await isCustomDomainRoutingEnabled(row({
      is_published: false,
      custom_domain_verification: evidence,
    }), NOW, probe)).toBe(false)
    expect(await decideCustomDomainRoute({
      host: HOST,
      path: '/',
      lookup: lookup({ custom_domain_verification: evidence }),
      nowMs: NOW,
      tls: probe,
    })).toEqual({ action: 'not_found' })
    expect(probe.calls.connect).toBe(0)
  })

  it('enables routing only when the live certificate matches the stored hostname', async () => {
    const evidence = readyEvidence()
    const probe = validTls()
    const stored = row({ custom_domain_verification: evidence })
    expect(await isCustomDomainRoutingEnabled(stored, NOW, probe)).toBe(true)
    expect(await customDomainOrigin(stored, NOW, probe)).toBe(`https://${HOST}`)
    expect(await customDomainActivation({
      domain: HOST,
      isPublished: true,
      verification: evidence,
      nowMs: NOW,
      tls: probe,
    })).toEqual({ verified: true, status: 'active' })
    expect(await decideCustomDomainRoute({
      host: HOST,
      path: '/',
      lookup: lookup({ custom_domain_verification: evidence }),
      nowMs: NOW,
      tls: probe,
    })).toEqual({ action: 'rewrite', subdomain: 'tenant-a', suffix: '' })
    expect(probe.calls.connect).toBeGreaterThan(0)
  })

  it('ignores truthy non-booleans', async () => {
    const probe = validTls()
    expect(await isCustomDomainRoutingEnabled(row({
      custom_domain_verification: {
        dns: { ok: 'true' },
        vercel: { configured: 1, verified: 'yes' },
        tls: { ok: 'true' },
      },
    }), NOW, probe)).toBe(false)
    expect(probe.calls.resolve).toBe(0)
  })
})

describe('decideCustomDomainRoute', () => {
  it('keeps app.simy.ch on the normal app, including /s/{tenant}', async () => {
    const probe = validTls()
    expect(isAppHost('app.simy.ch')).toBe(true)
    expect(await decideCustomDomainRoute({
      host: 'app.simy.ch',
      path: '/s/tenant-b',
      lookup: { ok: false, reason: 'conflict' },
      tls: probe,
    })).toEqual({ action: 'app' })
    expect(await decideCustomDomainRoute({
      host: 'app.simy.ch',
      path: '/s/fahrschule-sara',
      lookup: null,
      tls: probe,
    })).toEqual({ action: 'app' })
    expect(probe.calls.resolve).toBe(0)
  })

  it('does not let an unknown host open /s/{other-tenant}', async () => {
    const probe = validTls()
    expect(await decideCustomDomainRoute({
      host: 'unknown.example',
      path: '/s/tenant-b',
      lookup: { ok: false, reason: 'missing' },
      tls: probe,
    })).toEqual({ action: 'not_found' })
    expect(probe.calls.resolve).toBe(0)
  })

  it('does not route a duplicate or conflicting assignment to either tenant', async () => {
    const probe = validTls()
    const decision = await decideCustomDomainRoute({
      host: HOST,
      path: '/',
      lookup: { ok: false, reason: 'conflict' },
      tls: probe,
    })
    expect(decision).toEqual({ action: 'not_found' })
    expect(decision).not.toHaveProperty('subdomain')
    expect(probe.calls.resolve).toBe(0)
  })

  it('does not serve a host header that differs from the stored domain', async () => {
    const probe = validTls()
    const decision = await decideCustomDomainRoute({
      host: 'other.example-driving-school.ch',
      path: '/',
      lookup: lookup({ custom_domain_verification: readyEvidence() }),
      nowMs: NOW,
      tls: probe,
    })
    expect(decision).toEqual({ action: 'not_found' })
    expect(probe.calls.resolve).toBe(0)
  })

  it('does not keep a previous allow after the domain is removed', async () => {
    const probe = validTls()
    const earlier = await decideCustomDomainRoute({
      host: HOST,
      path: '/',
      lookup: lookup({ custom_domain_verification: readyEvidence() }),
      nowMs: NOW,
      tls: probe,
    })
    expect(earlier).toEqual({ action: 'rewrite', subdomain: 'tenant-a', suffix: '' })

    const removed = await decideCustomDomainRoute({
      host: HOST,
      path: '/',
      lookup: { ok: false, reason: 'missing' },
      nowMs: NOW,
      tls: probe,
    })
    expect(removed).toEqual({ action: 'not_found' })
  })

  it('returns not_found for a database error and does not retain an earlier row', async () => {
    const probe = validTls()
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
    expect(await decideCustomDomainRoute({
      host: HOST,
      path: '/',
      lookup: failedLookup,
      tls: probe,
    })).toEqual({ action: 'not_found' })

    const again = await decideCustomDomainRoute({
      host: HOST,
      path: '/s/tenant-a',
      lookup: customDomainLookupFromQuery({ data: null, error: { code: 'XX000' } }),
      tls: probe,
    })
    expect(again).toEqual({ action: 'not_found' })
    expect(again).not.toHaveProperty('subdomain')
    expect(probe.calls.resolve).toBe(0)
  })

  it('does not rewrite when the stored flag is true but TLS is absent', async () => {
    const probe = validTls()
    expect(await decideCustomDomainRoute({
      host: HOST,
      path: '/s/tenant-b',
      lookup: lookup({
        custom_domain_verified: true,
        custom_domain_status: 'active',
        custom_domain_verification: { dns: { ok: true }, vercel: { configured: true, verified: true } },
      }),
      nowMs: NOW,
      tls: probe,
    })).toEqual({ action: 'not_found' })
    expect(probe.calls.resolve).toBe(0)
  })
})

describe('public URL and response', () => {
  it('keeps sitemap and robots on the platform origin until the certificate activates the domain', async () => {
    const probe = validTls()
    const incomplete = row({ custom_domain_verified: true, custom_domain_status: 'active' })
    const standard = (await customDomainOrigin(incomplete, NOW, probe)) || 'https://app.simy.ch/s/tenant-a'
    expect(standard).toBe('https://app.simy.ch/s/tenant-a')
    expect(standard).not.toContain(HOST)

    const refused = refusedTls()
    const pending = await customDomainOrigin(row({ custom_domain_verification: readyEvidence() }), NOW, refused)
    expect(pending).toBeNull()
    const pendingUrl = pending || 'https://app.simy.ch/s/tenant-a'
    expect(pendingUrl).toBe('https://app.simy.ch/s/tenant-a')

    const enabled = await customDomainOrigin(row({ custom_domain_verification: readyEvidence() }), NOW, probe)
    expect(enabled).toBe(`https://${HOST}`)
    expect(probe.calls.resolve).toBe(1)
  })

  it('does not return stored verification JSON on the public website payload', async () => {
    const pending = await presentPublicWebsiteDomain({
      ...row({ custom_domain_verification: readyEvidence() }),
      seo_title: 'Example',
    }, NOW, refusedTls())
    expect(pending.custom_domain_routing_enabled).toBe(false)
    expect(pending).not.toHaveProperty('custom_domain_verification')
    expect(pending).not.toHaveProperty('custom_domain_status')

    const active = await presentPublicWebsiteDomain({
      ...row({ custom_domain_verification: readyEvidence() }),
      seo_title: 'Example',
    }, NOW, validTls())
    expect(active.custom_domain_routing_enabled).toBe(true)
    expect(active).not.toHaveProperty('custom_domain_verification')
  })
})

describe('writers cannot invent an active domain', () => {
  it('claim and verify do not record TLS success or the old DNS-only activation', () => {
    const post = readFileSync('server/api/website/custom-domain.post.ts', 'utf8')
    const verify = readFileSync('server/api/website/custom-domain/verify.post.ts', 'utf8')
    const middleware = readFileSync('server/middleware/02.custom-domain.ts', 'utf8')
    const robots = readFileSync('server/routes/robots.txt.ts', 'utf8')
    for (const src of [post, verify]) {
      expect(src).toContain('await customDomainActivation')
      expect(src).toContain('readCustomDomainClaimBody')
      expect(src).not.toMatch(/tls:\s*\{/)
      expect(src).not.toContain('vercelApiMissing')
    }
    expect(middleware).toContain('customDomainLookupFromQuery')
    expect(middleware).toContain('await decideCustomDomainRoute')
    expect(middleware).toContain('maybeSingle')
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
      expect(src).toContain('await customDomainOrigin')
      expect(src).not.toMatch(/custom_domain_verified\s*&&/)
    }
    const billing = readFileSync('server/api/admin/billing-status.get.ts', 'utf8')
    expect(billing).toContain('custom_domain_verification')
    for (const file of [
      'server/routes/s/[subdomain]/robots.txt.ts',
      'server/routes/s/[subdomain]/sitemap.xml.ts',
      'server/routes/s/[subdomain]/llms.txt.ts',
      'server/utils/website-seo-context.ts',
    ]) {
      expect(readFileSync(file, 'utf8')).toContain('await customDomainOrigin')
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
  it('fails closed for missing, invalid, future, and older-than-60-minute timestamps', async () => {
    const missing = { dns: { ok: true }, vercel: { configured: true, verified: true }, tls: { ok: true } }
    const invalid = readyEvidence('not-a-date')
    const blank = readyEvidence('   ')
    const future = readyEvidence(iso(NOW + 1))
    const stale = readyEvidence(iso(NOW - CUSTOM_DOMAIN_EVIDENCE_MAX_AGE_MS - 1))
    const probe = validTls()
    for (const verification of [missing, invalid, blank, future, stale]) {
      expect(hasFreshCheckedAt(verification, NOW)).toBe(false)
      expect(await isCustomDomainRoutingEnabled(row({ custom_domain_verification: verification }), NOW, probe)).toBe(false)
      // true only exercises the non-TLS gates. It is not a certificate.
      expect(evaluateCustomDomainRouting(
        row({ custom_domain_verification: verification }),
        NOW,
        true,
      )).toBe(false)
    }
    expect(probe.calls.resolve).toBe(0)
  })

  it('does not treat a fresh timestamp as DNS, TLS, or an active route', async () => {
    const onlyFresh = { checked_at: iso(NOW) }
    const probe = validTls()
    expect(hasFreshCheckedAt(onlyFresh, NOW)).toBe(true)
    expect(await isCustomDomainRoutingEnabled(row({ custom_domain_verification: onlyFresh }), NOW, probe)).toBe(false)
    expect(evaluateCustomDomainRouting(row({ custom_domain_verification: onlyFresh }), NOW, true)).toBe(false)
    expect(await customDomainOrigin(row({ custom_domain_verification: onlyFresh }), NOW, probe)).toBeNull()
    expect(probe.calls.resolve).toBe(0)
  })

  it('accepts an age of exactly 60 minutes as freshness only until the handshake succeeds', async () => {
    const verification = readyEvidence(iso(NOW - CUSTOM_DOMAIN_EVIDENCE_MAX_AGE_MS))
    const refused = refusedTls()
    expect(hasFreshCheckedAt(verification, NOW)).toBe(true)
    expect(await isCustomDomainRoutingEnabled(row({ custom_domain_verification: verification }), NOW, refused)).toBe(false)
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
    expect(await isCustomDomainRoutingEnabled(
      row({ custom_domain_verification: verification }),
      NOW,
      validTls(),
    )).toBe(true)
  })
})
