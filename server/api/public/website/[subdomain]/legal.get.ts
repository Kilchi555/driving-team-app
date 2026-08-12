// GET /api/public/website/:subdomain/legal?type=impressum|datenschutz
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  buildDatenschutzHtml,
  buildImpressumHtml,
} from '~/server/utils/website-premium'
import { setWebsitePublicCache } from '~/server/utils/website-public-cache'

export default defineEventHandler(async (event) => {
  const subdomain = getRouterParam(event, 'subdomain')?.trim().toLowerCase()
  const type = String(getQuery(event).type || '').toLowerCase()
  if (!subdomain || !['impressum', 'datenschutz'].includes(type)) {
    throw createError({ statusCode: 400, statusMessage: 'subdomain and type required' })
  }

  const preview = String(getQuery(event).preview || '') === '1'
  const supabase = getSupabaseAdmin()

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, tenant_id, is_published, subdomain')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (!website || (!website.is_published && !preview)) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select(
      'id, name, legal_company_name, address, invoice_city, invoice_zip, contact_email, contact_phone, uid_number, contact_person_first_name, contact_person_last_name, legal_form',
    )
    .eq('id', website.tenant_id)
    .maybeSingle()

  if (tenantError || !tenant) {
    throw createError({
      statusCode: 404,
      statusMessage: tenantError?.message || 'Tenant not found',
    })
  }

  const tenantForLegal = {
    ...tenant,
    city: tenant.invoice_city || null,
    postal_code: tenant.invoice_zip || null,
  }

  // Prefer tenant_reglements datenschutz when available
  if (type === 'datenschutz') {
    try {
      const { data: reg } = await supabase
        .from('tenant_reglements')
        .select('content, title')
        .eq('tenant_id', tenant.id)
        .eq('type', 'datenschutz')
        .eq('is_active', true)
        .maybeSingle()
      if (reg?.content) {
        setWebsitePublicCache(event, {
          preview,
          sMaxAge: 600,
          swr: 3600,
          tag: `website-legal-${subdomain}`,
        })
        return {
          type,
          title: reg.title || 'Datenschutz',
          html: reg.content,
          tenant: { name: tenant.name },
        }
      }
    } catch {
      // fall through to generated
    }
  }

  const html =
    type === 'impressum' ? buildImpressumHtml(tenantForLegal) : buildDatenschutzHtml(tenantForLegal)

  setWebsitePublicCache(event, {
    preview,
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
})
