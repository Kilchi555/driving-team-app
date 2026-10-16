/**
 * Sanitizer failure must not leak reglement HTML. DOMPurify is mocked.
 * Does not touch production.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setTenantHtmlSanitizerLoaderForTests } from '~/utils/sanitize-tenant-html'

type Row = Record<string, unknown>
type LegalBody = { html: string; title: string; type: string; tenant: { name: string } }
type HeaderGlobal = typeof globalThis & {
  setHeader?: (event: unknown, name: string, value: string) => void
}
const websites: Row[] = []
const tenants: Row[] = []
const reglements: Row[] = []

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
    maybeSingle: async () => ({ data: rows[0] ? { ...rows[0] } : null, error: null }),
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

function makeEvent(subdomain: string, query: Record<string, string>) {
  const search = new URLSearchParams(query).toString()
  const url = `/api/public/website/${subdomain}/legal?${search}`
  return {
    context: { params: { subdomain } },
    path: url,
    node: { req: { url } },
  }
}

beforeEach(async () => {
  ;(globalThis as HeaderGlobal).setHeader = () => {}
  setTenantHtmlSanitizerLoaderForTests(() => {
    throw new Error('purify exploded SECRET_PURIFY')
  })
  websites.splice(0, websites.length, {
    id: 'website-a',
    tenant_id: 'tenant-a',
    subdomain: 'school-a',
    is_published: true,
  })
  tenants.splice(0, tenants.length, {
    id: 'tenant-a',
    name: 'School A',
    legal_company_name: 'Legal A GmbH',
    address: 'A-Strasse 1',
    contact_email: 'a@example.test',
  })
  reglements.splice(0, reglements.length, {
    tenant_id: 'tenant-a',
    type: 'datenschutz',
    is_active: true,
    title: 'Raw policy',
    content: '<p>Visible policy</p><script>alert(SECRET_PURIFY)</script><img src=x onerror=alert(1)>',
  })
})

describe('sanitizer failure fallback', () => {
  it('does not return unsanitized reglement HTML', async () => {
    const { default: handler } = await handlerPromise
    const body = await handler(makeEvent('school-a', { type: 'datenschutz' }))
    expect(body.html).not.toContain('<script')
    expect(body.html).not.toContain('onerror')
    expect(body.html).not.toContain('SECRET_PURIFY')
    expect(body.html).not.toContain('Visible policy')
    expect(body.html).toContain('Datenschutzerklärung')
    expect(body.html).toContain('School A')
  })

  it('returns escaped generator impressum when DOMPurify throws', async () => {
    tenants[0].legal_company_name = '<img src=x onerror=alert(1)>'
    const { default: handler } = await handlerPromise
    const body = await handler(makeEvent('school-a', { type: 'impressum' }))
    expect(body.html).not.toContain('<img')
    expect(body.html).toContain('&lt;img')
    expect(body.html).not.toContain('SECRET_PURIFY')
  })

  it('still answers 400 when DOMPurify cannot be used', async () => {
    const { default: handler } = await handlerPromise
    await expect(handler(makeEvent('school-a', {}))).rejects.toMatchObject({ statusCode: 400 })
  })
})
