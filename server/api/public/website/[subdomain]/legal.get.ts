// GET /api/public/website/:subdomain/legal?type=impressum|datenschutz
import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  buildDatenschutzHtml,
  buildImpressumHtml,
} from '~/server/utils/website-premium'
import { setWebsitePublicCache } from '~/server/utils/website-public-cache'
import { authorizePublicWebsiteRead } from '~/server/utils/website-preview-access'
import { trySanitizeTenantHtml } from '~/utils/sanitize-tenant-html'

const LEGAL_TYPES = ['impressum', 'datenschutz'] as const
type LegalType = (typeof LEGAL_TYPES)[number]

function statusCodeOf(err: unknown): number {
  if (!err || typeof err !== 'object' || !('statusCode' in err)) return 0
  const code = Number((err as { statusCode?: number }).statusCode)
  return Number.isFinite(code) ? code : 0
}

/** Executable markup that must never be returned from a tenant reglement. */
function stillLooksExecutable(html: string): boolean {
  return /<\s*script\b/i.test(html)
    || /<\s*\/\s*script/i.test(html)
    || /<[^>]*\son[a-z]+\s*=/i.test(html)
    || /javascript\s*:/i.test(html)
}

function generatedHtml(type: LegalType, tenantForLegal: Parameters<typeof buildImpressumHtml>[0]) {
  const built = type === 'impressum' ? buildImpressumHtml(tenantForLegal) : buildDatenschutzHtml(tenantForLegal)
  const cleaned = trySanitizeTenantHtml(built)
  // Builder output is already escapeHtml'd. Use it only when DOMPurify cannot run.
  if (!cleaned.ok || stillLooksExecutable(cleaned.html)) return built
  return cleaned.html
}

async function handleLegal(event: any) {
  const subdomain = getRouterParam(event, 'subdomain')?.trim().toLowerCase()
  const query = getQuery(event) as Record<string, unknown>
  const typeRaw = String(query.type || '').toLowerCase()

  // Same contract as origin/main: missing subdomain, missing type, and unknown type.
  if (!subdomain || !LEGAL_TYPES.includes(typeRaw as LegalType)) {
    throw createError({ statusCode: 400, statusMessage: 'subdomain and type required' })
  }
  const type = typeRaw as LegalType

  const supabase = getSupabaseAdmin()

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, tenant_id, is_published, subdomain')
    .eq('subdomain', subdomain)
    .maybeSingle()

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

  if (tenantError || !tenant) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Tenant not found',
    })
  }

  const tenantForLegal = {
    ...tenant,
    city: tenant.invoice_city || null,
    postal_code: tenant.invoice_zip || null,
  }

  if (type === 'datenschutz' && typeof tenant.id === 'string') {
    try {
      const { data: reg } = await supabase
        .from('tenant_reglements')
        .select('content, title')
        .eq('tenant_id', tenant.id)
        .eq('type', 'datenschutz')
        .eq('is_active', true)
        .maybeSingle()
      const content = typeof reg?.content === 'string' ? reg.content : ''
      if (content.trim()) {
        const cleaned = trySanitizeTenantHtml(content)
        if (cleaned.ok && cleaned.html.trim() && !stillLooksExecutable(cleaned.html)) {
          setWebsitePublicCache(event, {
            preview: access.privateCache,
            sMaxAge: 600,
            swr: 3600,
            tag: `website-legal-${subdomain}`,
          })
          return {
            type,
            title: typeof reg?.title === 'string' && reg.title.trim() ? reg.title : 'Datenschutz',
            html: cleaned.html,
            tenant: { name: tenant.name },
          }
        }
      }
    } catch {
      // Stored reglement is unusable. Fall through to the escaped generator text.
    }
  }

  setWebsitePublicCache(event, {
    preview: access.privateCache,
    sMaxAge: 600,
    swr: 3600,
    tag: `website-legal-${subdomain}`,
  })

  return {
    type,
    title: type === 'impressum' ? 'Impressum' : 'Datenschutz',
    html: generatedHtml(type, tenantForLegal),
    tenant: { name: tenant.name },
  }
}

export default defineEventHandler(async (event) => {
  try {
    return await handleLegal(event)
  } catch (err) {
    const code = statusCodeOf(err)
    if (code >= 400 && code < 500) throw err
    throw createError({ statusCode: 500, statusMessage: 'Server Error' })
  }
})
