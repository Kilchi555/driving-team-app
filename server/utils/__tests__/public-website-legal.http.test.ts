import { beforeEach, describe, expect, it, vi } from 'vitest'

type EventHandler = (event: unknown) => Promise<unknown>

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const RAW_SCRIPT = '<script>TENANT-SECRET</script>'
const RAW_HANDLER = '<img src=x onerror=alert(1)>'

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  getRouterParam: vi.fn(),
  getQuery: vi.fn(),
  sanitizeTenantHtml: vi.fn((html: string) => html),
  setWebsitePublicCache: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    getRouterParam: mocks.getRouterParam,
    getQuery: mocks.getQuery,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/website-public-cache', () => ({
  setWebsitePublicCache: mocks.setWebsitePublicCache,
}))

vi.mock('~/utils/sanitize-tenant-html', () => ({
  sanitizeTenantHtml: (html: string) => mocks.sanitizeTenantHtml(html),
}))

type RowResult = { data: Record<string, unknown> | null; error: { message: string } | null }

function createSupabase(opts: {
  website?: RowResult | null
  tenant?: RowResult | null
  reglementFor?: (tenantId: unknown) => RowResult
  explodeTable?: string
}) {
  const queries: Array<{ table: string; filters: Record<string, unknown> }> = []
  const client = {
    queries,
    from(table: string) {
      const filters: Record<string, unknown> = {}
      const chain = {
        select: () => chain,
        eq: (col: string, val: unknown) => {
          filters[col] = val
          return chain
        },
        maybeSingle: async () => {
          const snapshot = { ...filters }
          queries.push({ table, filters: snapshot })
          if (opts.explodeTable === table) {
            throw new Error(`db exploded: ${table} secret-token`)
          }
          if (table === 'website_tenants') return opts.website ?? { data: null, error: null }
          if (table === 'tenants') return opts.tenant ?? { data: null, error: null }
          if (table === 'tenant_reglements') {
            return opts.reglementFor?.(snapshot.tenant_id) ?? { data: null, error: null }
          }
          return { data: null, error: null }
        },
      }
      return chain
    },
  }
  return client
}

const publishedWebsite = {
  data: {
    id: 'website-sara',
    tenant_id: TENANT_A,
    is_published: true,
    subdomain: 'fahrschule-sara',
  },
  error: null,
}

const tenantRow = {
  data: {
    id: TENANT_A,
    name: `Name ${RAW_SCRIPT}`,
    legal_company_name: `Legal ${RAW_HANDLER}`,
    address: 'Teststrasse 1',
    invoice_city: 'Reinach',
    invoice_zip: '4153',
    contact_email: 'a"onmouseover="alert(1)@example.test',
    contact_phone: '+41000000000',
    uid_number: null,
    mwst_obligated: false,
    handelsregister_nr: null,
    contact_person_first_name: 'Ada',
    contact_person_last_name: 'Lovelace',
    legal_form: 'einzelfirma',
  },
  error: null,
}

function usePublishedTenant() {
  const client = createSupabase({
    website: publishedWebsite,
    tenant: tenantRow,
    reglementFor: (tenantId) => {
      if (tenantId === TENANT_B) {
        return { data: { title: 'Other', content: 'OTHER-TENANT-SECRET' }, error: null }
      }
      return { data: null, error: null }
    },
  })
  mocks.getSupabaseAdmin.mockReturnValue(client)
  return client
}

async function loadHandler(): Promise<EventHandler> {
  const mod = await import('../../api/public/website/[subdomain]/legal.get')
  return mod.default as EventHandler
}

function setRequest(subdomain: string | undefined, query: Record<string, unknown>) {
  mocks.getRouterParam.mockImplementation((_event: unknown, name: string) => (
    name === 'subdomain' ? subdomain : undefined
  ))
  mocks.getQuery.mockReturnValue(query)
}

describe('public website legal route', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.getSupabaseAdmin.mockReset()
    mocks.getRouterParam.mockReset()
    mocks.getQuery.mockReset()
    mocks.setWebsitePublicCache.mockReset()
    mocks.sanitizeTenantHtml.mockReset()
    mocks.sanitizeTenantHtml.mockImplementation((html: string) => html)
  })

  it('returns escaped Impressum HTML for a published tenant', async () => {
    usePublishedTenant()
    setRequest('fahrschule-sara', { type: 'impressum' })
    const handler = await loadHandler()
    const body = await handler({}) as { type: string; title: string; html: string }

    expect(body.type).toBe('impressum')
    expect(body.title).toBe('Impressum')
    expect(body.html).toContain('Impressum')
    expect(body.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(body.html).toContain('mailto:a&quot;onmouseover=&quot;alert(1)@example.test')
    expect(body.html).not.toContain(RAW_HANDLER)
    expect(body.html).not.toContain('<script')
    expect(mocks.sanitizeTenantHtml).toHaveBeenCalled()
  })

  it('returns escaped Datenschutz HTML when no tenant reglement exists', async () => {
    usePublishedTenant()
    setRequest('fahrschule-sara', { type: 'datenschutz' })
    const handler = await loadHandler()
    const body = await handler({}) as { type: string; html: string; tenant: { name: string } }

    expect(body.type).toBe('datenschutz')
    expect(body.html).toContain('Datenschutzerklärung')
    expect(body.html).toContain('&lt;script&gt;TENANT-SECRET&lt;/script&gt;')
    expect(body.html).not.toContain(RAW_SCRIPT)
    expect(body.tenant.name).toContain('Name')
  })

  it('returns 400 when type is missing and does not touch the sanitizer', async () => {
    mocks.sanitizeTenantHtml.mockImplementation(() => {
      throw new Error('JSDOM exploded at init')
    })
    setRequest('fahrschule-sara', {})
    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'subdomain and type required',
    })
    expect(mocks.sanitizeTenantHtml).not.toHaveBeenCalled()
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown type before database or sanitizer access', async () => {
    mocks.sanitizeTenantHtml.mockImplementation(() => {
      throw new Error('JSDOM exploded at init')
    })
    setRequest('fahrschule-sara', { type: 'agb' })
    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404, statusMessage: 'Not found' })
    expect(mocks.sanitizeTenantHtml).not.toHaveBeenCalled()
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown subdomain', async () => {
    const client = createSupabase({ website: { data: null, error: null } })
    mocks.getSupabaseAdmin.mockReturnValue(client)
    setRequest('missing-school', { type: 'impressum' })
    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404, statusMessage: 'Website not found' })
    expect(mocks.sanitizeTenantHtml).not.toHaveBeenCalled()
    expect(client.queries.some((query) => query.table === 'tenants')).toBe(false)
  })

  it('returns 404 when the website tenant row is missing', async () => {
    const client = createSupabase({
      website: publishedWebsite,
      tenant: { data: null, error: null },
    })
    mocks.getSupabaseAdmin.mockReturnValue(client)
    setRequest('fahrschule-sara', { type: 'impressum' })
    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404, statusMessage: 'Tenant not found' })
    expect(mocks.sanitizeTenantHtml).not.toHaveBeenCalled()
  })

  it('keeps validation working when sanitizer initialization throws', async () => {
    mocks.sanitizeTenantHtml.mockImplementation(() => {
      throw new Error('JSDOM exploded at init')
    })
    setRequest(undefined, { type: '' })
    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.sanitizeTenantHtml).not.toHaveBeenCalled()
  })

  it('does not return unsanitized tenant reglement HTML when sanitization fails', async () => {
    const client = createSupabase({
      website: publishedWebsite,
      tenant: tenantRow,
      reglementFor: (tenantId) => (
        tenantId === TENANT_A
          ? { data: { title: 'Datenschutz', content: `<p>Policy</p>${RAW_SCRIPT}` }, error: null }
          : { data: { title: 'Other', content: 'OTHER-TENANT-SECRET' }, error: null }
      ),
    })
    mocks.getSupabaseAdmin.mockReturnValue(client)
    mocks.sanitizeTenantHtml.mockImplementation(() => {
      throw new Error('JSDOM exploded at init')
    })
    setRequest('fahrschule-sara', { type: 'datenschutz' })
    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Legal page unavailable',
    })
    expect(JSON.stringify(mocks.sanitizeTenantHtml.mock.calls)).toContain('TENANT-SECRET')
    await expect(handler({})).rejects.toMatchObject({ statusMessage: 'Legal page unavailable' })
    try {
      await handler({})
    } catch (err) {
      expect(JSON.stringify(err)).not.toContain('TENANT-SECRET')
      expect(JSON.stringify(err)).not.toContain('<script')
    }
  })

  it('uses escaped generator HTML when the sanitizer returns an empty string', async () => {
    usePublishedTenant()
    mocks.sanitizeTenantHtml.mockReturnValue('')
    setRequest('fahrschule-sara', { type: 'impressum' })
    const handler = await loadHandler()
    const body = await handler({}) as { html: string }

    expect(body.html).toContain('<h1>Impressum</h1>')
    expect(body.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(body.html).not.toContain(RAW_HANDLER)
  })

  it('falls back to escaped generator HTML when the sanitizer cannot start', async () => {
    usePublishedTenant()
    mocks.sanitizeTenantHtml.mockImplementation(() => {
      throw new Error('JSDOM exploded at init')
    })
    setRequest('fahrschule-sara', { type: 'impressum' })
    const handler = await loadHandler()
    const body = await handler({}) as { html: string }

    expect(body.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(body.html).not.toContain(RAW_HANDLER)
    expect(body.html).not.toContain('<script')
    expect(mocks.setWebsitePublicCache).toHaveBeenCalled()
  })

  it('returns a controlled 500 without internal details when the tenant query throws', async () => {
    const client = createSupabase({
      website: publishedWebsite,
      explodeTable: 'tenants',
    })
    mocks.getSupabaseAdmin.mockReturnValue(client)
    setRequest('fahrschule-sara', { type: 'impressum' })
    const handler = await loadHandler()
    try {
      await handler({})
      throw new Error('expected the handler to throw')
    } catch (err) {
      expect(err).toMatchObject({ statusCode: 500, statusMessage: 'Legal page unavailable' })
      expect(JSON.stringify(err)).not.toContain('secret-token')
      expect(JSON.stringify(err)).not.toContain('db exploded')
    }
  })

  it('reads reglement HTML only for the website tenant and still escapes it', async () => {
    const client = createSupabase({
      website: publishedWebsite,
      tenant: tenantRow,
      reglementFor: (tenantId) => {
        if (tenantId === TENANT_B) {
          return { data: { title: 'Other', content: 'OTHER-TENANT-SECRET<script>x</script>' }, error: null }
        }
        if (tenantId === TENANT_A) {
          return {
            data: { title: 'Datenschutz', content: `<p>Only A</p>${RAW_SCRIPT}` },
            error: null,
          }
        }
        return { data: null, error: null }
      },
    })
    mocks.getSupabaseAdmin.mockReturnValue(client)
    mocks.sanitizeTenantHtml.mockImplementation((html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, ''))
    setRequest('fahrschule-sara', { type: 'datenschutz' })
    const handler = await loadHandler()
    const body = await handler({}) as { html: string; title: string }

    expect(body.title).toBe('Datenschutz')
    expect(body.html).toContain('<p>Only A</p>')
    expect(body.html).not.toContain('TENANT-SECRET')
    expect(body.html).not.toContain('OTHER-TENANT-SECRET')
    expect(body.html).not.toContain('<script')
    const reglementQuery = client.queries.find((query) => query.table === 'tenant_reglements')
    expect(reglementQuery?.filters.tenant_id).toBe(TENANT_A)
    expect(reglementQuery?.filters.tenant_id).not.toBe(TENANT_B)
  })

  it('rejects sanitizer output that still contains tenant script markup', async () => {
    const client = createSupabase({
      website: publishedWebsite,
      tenant: tenantRow,
      reglementFor: () => ({
        data: { title: 'Datenschutz', content: `<p>Policy</p>${RAW_SCRIPT}` },
        error: null,
      }),
    })
    mocks.getSupabaseAdmin.mockReturnValue(client)
    mocks.sanitizeTenantHtml.mockImplementation((html: string) => html)
    setRequest('fahrschule-sara', { type: 'datenschutz' })
    const handler = await loadHandler()
    try {
      await handler({})
      throw new Error('expected the handler to throw')
    } catch (err) {
      expect(err).toMatchObject({ statusCode: 500, statusMessage: 'Legal page unavailable' })
      expect(JSON.stringify(err)).not.toContain('TENANT-SECRET')
    }
  })
})
