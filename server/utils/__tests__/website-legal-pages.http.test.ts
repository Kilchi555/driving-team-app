/**
 * Unit tests for the public legal handler.
 * Supabase is an in-memory double. DOMPurify runs for real unless a test says otherwise.
 * This file does not call production and is not an integration test.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generatePreviewToken, hashPreviewToken } from '~/server/utils/website-preview-access'
import { buildImpressumHtml } from '~/server/utils/website-premium'
import { resetTenantHtmlSanitizerForTests, sanitizeTenantHtml } from '~/utils/sanitize-tenant-html'

type Row = Record<string, unknown>
type LegalBody = {
  html: string
  title: string
  type: string
  tenant: { name: string }
}
type HeaderGlobal = typeof globalThis & {
  setHeader?: (event: unknown, name: string, value: string) => void
}

const websites: Row[] = []
const tenants: Row[] = []
const reglements: Row[] = []
let supabaseThrows = false

function chain(table: string) {
  let rows = table === 'website_tenants' ? websites : table === 'tenants' ? tenants : reglements
  const api = {
    select() {
      return api
    },
    eq(col: string, val: unknown) {
      rows = rows.filter((row) => row[col] === val)
      return api
    },
    maybeSingle: async () => {
      if (supabaseThrows) throw new Error('db exploded SECRET_STACK')
      return { data: rows[0] ? { ...rows[0] } : null, error: null }
    },
  }
  return api
}

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from(table: string) {
      return chain(table)
    },
  }),
}))

const handlerPromise = import('~/server/api/public/website/[subdomain]/legal.get') as Promise<{
  default: (event: object) => Promise<LegalBody>
}>

function makeEvent(subdomain: string, query: Record<string, string> = {}) {
  const search = new URLSearchParams(query).toString()
  const url = `/api/public/website/${encodeURIComponent(subdomain)}/legal${search ? `?${search}` : ''}`
  return {
    context: { params: { subdomain } },
    path: url,
    node: { req: { url } },
  }
}

async function call(subdomain: string, query: Record<string, string> = {}) {
  const { default: handler } = await handlerPromise
  try {
    const body = await handler(makeEvent(subdomain, query))
    return { status: 200 as const, body }
  } catch (err: unknown) {
    const error = err && typeof err === 'object'
      ? err as { statusCode?: number; statusMessage?: string; message?: string }
      : {}
    return {
      status: Number(error.statusCode || 500),
      message: String(error.statusMessage || error.message || ''),
      body: null,
    }
  }
}

const tokenA = generatePreviewToken()
const tokenB = generatePreviewToken()

beforeEach(() => {
  supabaseThrows = false
  resetTenantHtmlSanitizerForTests()
  ;(globalThis as HeaderGlobal).setHeader = () => {}
  websites.splice(0, websites.length,
    {
      id: 'website-a',
      tenant_id: 'tenant-a',
      subdomain: 'school-a',
      is_published: true,
      preview_token_hash: hashPreviewToken(tokenA),
      preview_token_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    },
    {
      id: 'website-b',
      tenant_id: 'tenant-b',
      subdomain: 'school-b',
      is_published: false,
      preview_token_hash: hashPreviewToken(tokenB),
      preview_token_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    },
  )
  tenants.splice(0, tenants.length,
    {
      id: 'tenant-a',
      name: 'School A',
      legal_company_name: 'Legal A GmbH',
      address: 'A-Strasse 1',
      invoice_city: 'Aarau',
      invoice_zip: '5000',
      contact_email: 'a@example.test',
      contact_phone: '+41000000001',
      legal_form: 'gmbh',
    },
    {
      id: 'tenant-b',
      name: 'School B',
      legal_company_name: 'Legal B AG',
      address: 'B-Weg 9',
      invoice_city: 'Bern',
      invoice_zip: '3000',
      contact_email: 'b@example.test',
      contact_phone: '+41000000002',
      legal_form: 'ag',
    },
  )
  reglements.splice(0, reglements.length)
})

describe('legal route module', () => {
  it('keeps the shared sanitizer free of Node-only static imports', () => {
    const src = readFileSync(resolve(process.cwd(), 'utils/sanitize-tenant-html.ts'), 'utf8')
    expect(src).not.toMatch(/from\s+['"]node:module['"]/)
    expect(src).not.toMatch(/from\s+['"]node:/)
    expect(src).not.toMatch(/from\s+['"]jsdom['"]/)
    expect(src).not.toMatch(/from\s+['"]isomorphic-dompurify['"]/)
    expect(src.split('\n').filter((line) => /^\s*import\s/.test(line)).join('\n')).not.toMatch(/isomorphic-dompurify|jsdom|node:module/)
    expect(src).toContain('getBuiltinModule')
    expect(src).toMatch(/getBuiltin\?\.\(\s*['"]module['"]\s*\)/)
    expect(src).toMatch(/nodeRequire\(\s*['"]isomorphic-dompurify['"]\s*\)/)
    const clients = [
      'pages/onboarding/[token].vue',
      'pages/register/[tenant].vue',
      'pages/booking/availability/[slug].vue',
      'pages/admin/marketing/aktion.vue',
      'components/TenantLogo.vue',
      'components/ConfirmationDialog.vue',
      'components/admin/ReglementeManager.vue',
      'server/api/public/website/[subdomain]/legal.get.ts',
    ]
    for (const rel of clients) {
      const caller = readFileSync(resolve(process.cwd(), rel), 'utf8')
      expect(caller).toMatch(/sanitize-tenant-html/)
      expect(caller).not.toMatch(/node:module/)
      expect(caller).not.toMatch(/isomorphic-dompurify/)
    }
  })

  it('returns 400 before any tenant lookup when type is missing', async () => {
    const result = await call('school-a')
    expect(result.status).toBe(400)
    expect(result.message).toBe('subdomain and type required')
    expect(result.message).not.toMatch(/SECRET_STACK/)
  })

  it('returns 400 for an unknown type', async () => {
    const result = await call('school-a', { type: 'nope' })
    expect(result.status).toBe(400)
    expect(result.message).toBe('subdomain and type required')
    expect(result.message).not.toMatch(/SECRET_STACK/)
  })

  it('returns 400 when the subdomain parameter is empty', async () => {
    const result = await call('', { type: 'impressum' })
    expect(result.status).toBe(400)
    expect(result.message).toBe('subdomain and type required')
  })
})

describe('legal pages for fixture tenants', () => {
  it('renders impressum for tenant A and does not include tenant B', async () => {
    const result = await call('school-a', { type: 'impressum' })
    expect(result.status).toBe(200)
    expect(result.body.html).toContain('Legal A GmbH')
    expect(result.body.html).toContain('a@example.test')
    expect(result.body.html).not.toContain('Legal B AG')
    expect(result.body.html).not.toContain('b@example.test')
    expect(result.body.html).not.toContain('B-Weg')
    expect(result.body.tenant.name).toBe('School A')
  })

  it('renders the short privacy template when no reglement is stored', async () => {
    const result = await call('school-a', { type: 'datenschutz' })
    expect(result.status).toBe(200)
    expect(result.body.html).toContain('Datenschutzerklärung')
    expect(result.body.html).toContain('School A')
    expect(result.body.html).not.toContain('Legal B AG')
    expect(result.body.html).not.toContain('<script')
  })

  it('escapes tenant-controlled markup in the impressum', async () => {
    tenants[0].legal_company_name = '<img src=x onerror=alert(1)>'
    const result = await call('school-a', { type: 'impressum' })
    expect(result.status).toBe(200)
    expect(result.body.html).not.toContain('<img')
    expect(result.body.html).toContain('&lt;img')
  })

  it('strips script from a stored reglement and keeps the surrounding text', async () => {
    reglements.push({
      tenant_id: 'tenant-a',
      type: 'datenschutz',
      is_active: true,
      title: 'Privacy A',
      content: '<p>Only A policy</p><script>alert(1)</script>',
    })
    const result = await call('school-a', { type: 'datenschutz' })
    expect(result.status).toBe(200)
    expect(result.body.html).toContain('Only A policy')
    expect(result.body.html).not.toContain('<script')
    expect(result.body.html).not.toContain('alert(1)')
    expect(result.body.title).toBe('Privacy A')
  })

  it('ignores a non-string reglement and uses the generated privacy text', async () => {
    reglements.push({
      tenant_id: 'tenant-a',
      type: 'datenschutz',
      is_active: true,
      title: 'Broken',
      content: { html: '<script>alert(1)</script>Visible policy' },
    })
    const result = await call('school-a', { type: 'datenschutz' })
    expect(result.status).toBe(200)
    expect(result.body.title).toBe('Datenschutz')
    expect(result.body.html).toContain('Datenschutzerklärung')
    expect(result.body.html).not.toContain('<script')
    expect(result.body.html).not.toContain('Visible policy')
  })

  it('returns 404 when the website exists but the tenant row is missing', async () => {
    tenants.splice(0, tenants.length)
    const result = await call('school-a', { type: 'impressum' })
    expect(result.status).toBe(404)
    expect(result.message).toBe('Tenant not found')
    expect(JSON.stringify(result)).not.toContain('SECRET_STACK')
  })

  it('returns 404 for an unknown subdomain', async () => {
    const result = await call('missing-school', { type: 'impressum' })
    expect(result.status).toBe(404)
  })

  it('returns 404 for an unpublished site without a token', async () => {
    const result = await call('school-b', { type: 'impressum' })
    expect(result.status).toBe(404)
  })

  it('does not accept tenant B preview token for tenant A', async () => {
    websites[0].is_published = false
    const result = await call('school-a', { type: 'impressum', preview_token: tokenB })
    expect(result.status).toBe(404)
    expect(JSON.stringify(result)).not.toContain('Legal A GmbH')
  })

  it('returns a controlled 500 without the internal exception text', async () => {
    supabaseThrows = true
    const result = await call('school-a', { type: 'impressum' })
    expect(result.status).toBe(500)
    expect(result.message).toBe('Server Error')
    expect(result.message).not.toContain('SECRET_STACK')
    expect(JSON.stringify(result)).not.toContain('SECRET_STACK')
  })
})

describe('generator escaping stays independent of the route', () => {
  it('escapes an image payload in the impressum builder', () => {
    const html = buildImpressumHtml({
      legal_company_name: '<img src=x onerror=alert(1)>',
      contact_email: 'a@example.test" onclick="alert(1)',
    })
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
    // The quote is escaped, so the payload stays inside the mailto value.
    expect(html).toContain('mailto:a@example.test&quot;')
    expect(html).not.toContain('" onclick=')
  })

  it('still strips scripts when DOMPurify can run', () => {
    expect(sanitizeTenantHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>')
  })
})
