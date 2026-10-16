// GET /api/public/website/:subdomain/legal?type=impressum|datenschutz
import { createError, defineEventHandler, getQuery, getRouterParam, type H3Event } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  buildDatenschutzHtml,
  buildImpressumHtml,
} from '~/server/utils/website-premium'
import { setWebsitePublicCache } from '~/server/utils/website-public-cache'
import { authorizePublicWebsiteRead } from '~/server/utils/website-preview-access'
import { sanitizeTenantHtml } from '~/utils/sanitize-tenant-html'

const LEGAL_TYPES = ['impressum', 'datenschutz'] as const
type LegalType = (typeof LEGAL_TYPES)[number]

function isLegalType(value: string): value is LegalType {
  return (LEGAL_TYPES as readonly string[]).includes(value)
}

const GENERIC_FAILURE = 'Legal page unavailable'

function httpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object' || !('statusCode' in err)) return undefined
  const code = (err as { statusCode?: unknown }).statusCode
  return typeof code === 'number' ? code : undefined
}

function failClosed(): never {
  throw createError({ statusCode: 500, statusMessage: GENERIC_FAILURE })
}

/** True when markup still contains an executable tag. Escaped text does not match. */
function markupLooksUnsafe(html: string): boolean {
  return /<\s*script\b/i.test(html)
    || /<\s*\/\s*script/i.test(html)
    || /<[^>]*\son[a-z]+\s*=/i.test(html)
    || /<[^>]*javascript\s*:/i.test(html)
}

function sanitizeReglementHtml(html: string): string {
  let clean = ''
  try {
    clean = sanitizeTenantHtml(html)
  } catch {
    failClosed()
  }
  if (markupLooksUnsafe(clean)) failClosed()
  return clean
}

/**
 * Generator HTML interpolates tenant fields only through escapeHtml.
 * If the sanitizer cannot start, that escaped string is the response.
 * Tenant-authored reglement HTML never uses this path.
 */
function sanitizeGeneratedHtml(html: string): string {
  try {
    const clean = sanitizeTenantHtml(html)
    if (clean && !markupLooksUnsafe(clean)) return clean
  } catch {
    // Fall through to the escaped generator string.
  }
  if (markupLooksUnsafe(html)) failClosed()
  return html
}

async function handleLegal(event: H3Event) {
  const subdomain = getRouterParam(event, 'subdomain')?.trim().toLowerCase()
  const query = getQuery(event) as Record<string, unknown>
  const type = String(query.type || '').trim().toLowerCase()

  if (!subdomain || !type) {
    throw createError({ statusCode: 400, statusMessage: 'subdomain and type required' })
  }
  if (!isLegalType(type)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const supabase = getSupabaseAdmin()

  const { data: website, error: websiteError } = await supabase
    .from('website_tenants')
    .select('id, tenant_id, is_published, subdomain')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (websiteError) failClosed()
  if (!website) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }

  const access = await authorizePublicWebsiteRead(supabase, website, query, true)
  if (!access.ok) {
    setWebsitePublicCache(event, { preview: true })
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select(
      'id, name, legal_company_name, address, invoice_city, invoice_zip, contact_email, contact_phone, uid_number, mwst_obligated, handelsregister_nr, contact_person_first_name, contact_person_last_name, legal_form',
    )
    .eq('id', website.tenant_id)
    .maybeSingle()

  if (tenantError) failClosed()
  if (!tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  const tenantForLegal = {
    ...tenant,
    city: tenant.invoice_city || null,
    postal_code: tenant.invoice_zip || null,
  }

  if (type === 'datenschutz') {
    try {
      const { data: reg, error: regError } = await supabase
        .from('tenant_reglements')
        .select('content, title')
        .eq('tenant_id', tenant.id)
        .eq('type', 'datenschutz')
        .eq('is_active', true)
        .maybeSingle()
      if (regError) throw regError
      if (reg?.content) {
        const html = sanitizeReglementHtml(String(reg.content))
        setWebsitePublicCache(event, {
          preview: access.privateCache,
          sMaxAge: 600,
          swr: 3600,
          tag: `website-legal-${subdomain}`,
        })
        return {
          type,
          title: reg.title || 'Datenschutz',
          html,
          tenant: { name: tenant.name },
        }
      }
    } catch (err) {
      const status = httpStatus(err)
      if (status) throw err
      // Query failure falls through to the escaped generator, as before.
    }
  }

  const html = sanitizeGeneratedHtml(
    type === 'impressum' ? buildImpressumHtml(tenantForLegal) : buildDatenschutzHtml(tenantForLegal),
  )

  setWebsitePublicCache(event, {
    preview: access.privateCache,
    sMaxAge: 600,
    swr: 3600,
    tag: `website-legal-${subdomain}`,
  })

  return {
    type,
    title: type === 'impressum' ? 'Impressum' : 'Datenschutz',
    html,
    tenant: { name: tenant.name },
  }
}

export default defineEventHandler(async (event) => {
  try {
    return await handleLegal(event)
  } catch (err) {
    const status = httpStatus(err)
    if (status && status < 500) throw err
    const statusMessage = err && typeof err === 'object' && 'statusMessage' in err
      ? String((err as { statusMessage?: unknown }).statusMessage || '')
      : ''
    if (status === 500 && statusMessage === GENERIC_FAILURE) throw err
    throw createError({ statusCode: 500, statusMessage: GENERIC_FAILURE })
  }
})
