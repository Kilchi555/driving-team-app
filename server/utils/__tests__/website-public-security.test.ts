import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { setWebsitePublicCache } from '../website-public-cache'
import {
  authorizePublicWebsiteRead,
  generatePreviewToken,
  hashPreviewToken,
  issueWebsitePreviewToken,
  previewQueryRequestsPrivateCache,
  previewTokenExpired,
  previewTokensMatch,
  readPreviewToken,
} from '../website-preview-access'
import {
  isPublicWebsiteTenantResponseKey,
  projectPublicWebsiteTenant,
  PUBLIC_WEBSITE_TENANT_RESPONSE_FIELDS,
  PUBLIC_WEBSITE_TENANT_SELECT,
} from '../website-public-tenant-select'
import { previewDataKey, readRoutePreviewToken } from '../../../utils/website-preview-query'

const FORBIDDEN = [
  'stripe_customer_id',
  'stripe_subscription_id',
  'stripe_price_id',
  'stripe_connect_account_id',
  'qr_iban',
  'iban',
  'sari_client_id',
  'sari_client_secret',
  'sari_username',
  'sari_password',
  'wallee_secret_key',
  'wallee_space_id',
  'wallee_user_id',
  'subscription_plan',
  'is_trial',
  'trial_ends_at',
  'website_notes',
  'website_setup_paid_at',
  'website_hosting_plan',
  'website_only',
  'booking_policy',
  'id',
]

const PUBLIC_HANDLERS = [
  'server/api/public/website/[subdomain].get.ts',
  'server/api/public/website/[subdomain]/[slug].get.ts',
  'server/api/public/website/[subdomain]/legal.get.ts',
  'server/api/public/website/[subdomain]/reviews.get.ts',
  'server/api/public/website/[subdomain]/lead.post.ts',
  'server/api/public/website/[subdomain]/next-slots.get.ts',
  'server/api/public/website/[subdomain]/pickup-check.post.ts',
  'server/api/public/website/[subdomain]/og.png.get.ts',
]

function readRepo(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), 'utf8')
}

function memorySupabase() {
  const rows = new Map<string, Record<string, unknown>>()
  return {
    rows,
    from(table: string) {
      return {
        select() {
          return {
            eq(_col: string, id: string) {
              return {
                maybeSingle: async () => ({
                  data: rows.get(`${table}:${id}`) || null,
                  error: null,
                }),
              }
            },
          }
        },
        update(patch: Record<string, unknown>) {
          return {
            eq: async (_col: string, id: string) => {
              const key = `${table}:${id}`
              rows.set(key, { ...(rows.get(key) || {}), ...patch })
              return { error: null }
            },
          }
        },
      }
    },
  }
}

describe('public tenant allowlist', () => {
  it('projects only explicit response keys and drops secrets', () => {
    const row: Record<string, unknown> = {
      name: 'Fahrschule Beispiel',
      business_type: 'driving_school',
      slug: 'beispiel',
      address: 'Strasse 1',
      invoice_zip: '8000',
      invoice_city: 'Zürich',
      contact_phone: '044',
      contact_email: 'a@b.ch',
      whatsapp_phone: '079',
      working_days_template: {},
      facebook_url: 'https://facebook.com/x',
      instagram_url: 'https://instagram.com/x',
      social_facebook: null,
      social_instagram: null,
      social_linkedin: null,
      social_twitter: null,
      logo_url: null,
      legal_company_name: 'Beispiel GmbH',
      uid_number: 'CHE-1',
      website_url: 'https://beispiel.ch',
      id: 'tenant-secret-id',
      website_only: true,
      booking_policy: 'internal',
      minimum_booking_lead_time_hours: 24,
    }
    for (const key of FORBIDDEN) row[key] = `secret-${key}`

    const tenant = projectPublicWebsiteTenant(row)
    expect(tenant).toBeTruthy()
    for (const key of Object.keys(tenant || {})) {
      expect(isPublicWebsiteTenantResponseKey(key)).toBe(true)
    }
    expect(Object.keys(tenant || {}).sort()).toEqual([...PUBLIC_WEBSITE_TENANT_RESPONSE_FIELDS].sort())
    for (const key of FORBIDDEN) {
      expect(tenant?.[key]).toBeUndefined()
    }
    expect(tenant?.stripe_customer_id).toBeUndefined()
    expect(tenant?.stripe_subscription_id).toBeUndefined()
    expect(tenant?.stripe_price_id).toBeUndefined()
    expect(tenant?.stripe_connect_account_id).toBeUndefined()
    expect(tenant?.qr_iban).toBeUndefined()
    expect(tenant?.sari_client_id).toBeUndefined()
    expect(tenant?.sari_client_secret).toBeUndefined()
    expect(tenant?.sari_username).toBeUndefined()
    expect(tenant?.sari_password).toBeUndefined()
  })

  it('selects an allowlist and never star', () => {
    expect(PUBLIC_WEBSITE_TENANT_SELECT.includes('*')).toBe(false)
    const fields = PUBLIC_WEBSITE_TENANT_SELECT.split(',')
    for (const key of FORBIDDEN) {
      if (key === 'id' || key === 'website_only' || key === 'booking_policy') continue
      expect(fields).not.toContain(key)
    }
    expect(fields).toContain('name')
    expect(fields).toContain('invoice_city')
    expect(fields).toContain('id')
    expect(fields).toContain('minimum_booking_lead_time_hours')
  })
})

describe('preview token access', () => {
  it('is random, hashed, expiring, and tenant-bound', async () => {
    const a = generatePreviewToken()
    const b = generatePreviewToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(43)
    expect(hashPreviewToken(a)).toBe(createHash('sha256').update(a, 'utf8').digest('hex'))
    expect(hashPreviewToken(a)).not.toBe(a)
    expect(previewTokensMatch(hashPreviewToken(a), a)).toBe(true)
    expect(previewTokensMatch(hashPreviewToken(a), b)).toBe(false)
    expect(previewTokenExpired(new Date(Date.now() - 1000).toISOString())).toBe(true)
    expect(previewTokenExpired(new Date(Date.now() + 60_000).toISOString())).toBe(false)
    expect(previewTokenExpired(null)).toBe(true)

    const db = memorySupabase()
    const issuedA = await issueWebsitePreviewToken(db, 'website-a')
    const issuedB = await issueWebsitePreviewToken(db, 'website-b')
    expect(issuedA?.token).toBeTruthy()
    expect(issuedB?.token).toBeTruthy()
    const storedA = db.rows.get('website_tenants:website-a')
    expect(storedA?.preview_token_hash).toBe(hashPreviewToken(issuedA!.token))
    expect(JSON.stringify(storedA)).not.toContain(issuedA!.token)

    const published = { id: 'website-a', is_published: true }
    const draftA = { id: 'website-a', is_published: false }
    const draftB = { id: 'website-b', is_published: false }

    expect((await authorizePublicWebsiteRead(db, published, {}, true)).ok).toBe(true)
    expect((await authorizePublicWebsiteRead(db, { id: 'website-live', is_published: true }, { preview: '1' }, true))).toMatchObject({
      ok: true,
      draft: false,
      privateCache: true,
    })

    expect((await authorizePublicWebsiteRead(db, draftA, {}, true)).ok).toBe(false)
    expect((await authorizePublicWebsiteRead(db, draftA, { preview: '1' }, true)).ok).toBe(false)
    expect((await authorizePublicWebsiteRead(db, draftA, { preview_token: 'not-a-token' }, true)).ok).toBe(false)
    expect((await authorizePublicWebsiteRead(db, draftA, { preview_token: issuedB!.token }, true)).ok).toBe(false)

    const valid = await authorizePublicWebsiteRead(db, draftA, { preview_token: issuedA!.token }, true)
    expect(valid).toMatchObject({ ok: true, draft: true, privateCache: true })

    db.rows.set('website_tenants:website-a', {
      ...storedA,
      preview_token_expires_at: new Date(Date.now() - 5000).toISOString(),
    })
    expect((await authorizePublicWebsiteRead(db, draftA, { preview_token: issuedA!.token }, true)).ok).toBe(false)

    const publishedWithToken = await authorizePublicWebsiteRead(
      db,
      published,
      { preview_token: issuedA!.token },
      true,
    )
    expect(publishedWithToken).toMatchObject({ ok: true, draft: false, privateCache: true })

    expect((await authorizePublicWebsiteRead(db, draftB, { preview_token: issuedA!.token }, true)).ok).toBe(false)
    expect((await authorizePublicWebsiteRead(db, draftB, { preview_token: issuedB!.token }, true)).ok).toBe(true)
  })

  it('does not treat preview=1 as a token and keeps tokens out of data keys', () => {
    expect(readPreviewToken({ preview: '1' })).toBe('')
    expect(readRoutePreviewToken({ preview: '1' })).toBe('')
    expect(previewQueryRequestsPrivateCache({ preview: '1' })).toBe(true)
    const token = generatePreviewToken()
    const key = previewDataKey(token)
    expect(key).not.toContain(token)
    expect(key.startsWith('d')).toBe(true)
  })
})

describe('preview cache headers', () => {
  it('stores nothing for preview and allows public cache for published', () => {
    const headers = new Map<string, string>()
    const event = {}
    const g = globalThis as { setHeader?: (event: unknown, name: string, value: string) => void }
    g.setHeader = (_event: unknown, name: string, value: string) => {
      headers.set(name, value)
    }
    setWebsitePublicCache(event, { preview: true, sMaxAge: 120 })
    expect(headers.get('Cache-Control')).toBe('private, no-store')
    headers.clear()
    setWebsitePublicCache(event, { preview: false, sMaxAge: 120, swr: 600 })
    expect(headers.get('Cache-Control')).toContain('public')
    expect(headers.get('Cache-Control')).toContain('s-maxage=120')
    expect(headers.get('Cache-Control')).not.toContain('no-store')
  })
})

describe('public handler source contract', () => {
  it('never selects star from tenants and does not grant preview=1', () => {
    for (const rel of PUBLIC_HANDLERS) {
      const src = readRepo(rel)
      expect(src).not.toMatch(/from\(['"]tenants['"]\)[\s\S]{0,180}?select\(\s*['"`]\*/)
      expect(src).not.toMatch(/preview\s*===?\s*['"]1['"]/)
      expect(src).not.toMatch(/body\?\.preview/)
    }
    const home = readRepo('server/api/public/website/[subdomain].get.ts')
    const slug = readRepo('server/api/public/website/[subdomain]/[slug].get.ts')
    expect(home).toContain('PUBLIC_WEBSITE_TENANT_SELECT')
    expect(slug).toContain('PUBLIC_WEBSITE_TENANT_SELECT')
    expect(home).toContain('projectPublicWebsiteTenant')
    expect(slug).toContain('projectPublicWebsiteTenant')

    const reviews = readRepo('server/api/public/website/[subdomain]/reviews.get.ts')
    expect(reviews).toContain('getKey: (subdomain: string, limit: number) => `${subdomain}:${limit}`')
    expect(reviews).not.toContain('preview_token')

    const customer = readRepo('server/api/website/preview-link.post.ts')
    expect(customer).toContain(".eq('tenant_id', user.tenant_id)")
    expect(customer).not.toContain('body.tenant_id')
    expect(customer).not.toContain('body?.tenant_id')

    const admin = readRepo('server/api/tenant-admin/websites/[id]/preview-link.post.ts')
    expect(admin).toContain('requireSuperAdmin')
    expect(admin).toContain(".eq('tenant_id', tenantId)")
  })
})
