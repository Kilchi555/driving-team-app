/**
 * Resolve tenant website for SEO surfaces (robots/sitemap/llms) from host or path.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { isAppHost, normalizeHostname } from '~/server/utils/custom-domain'

export type WebsiteSeoContext = {
  subdomain: string
  customDomain: string | null
  verified: boolean
  tenantId: string
  websiteId: string
  baseUrl: string
  name: string
  seo_title: string | null
  seo_description: string | null
  pages: Array<{
    slug: string
    title: string
    is_home: boolean
    page_type: string | null
    updated_at: string | null
  }>
}

export async function resolveWebsiteSeoContext(event: any): Promise<WebsiteSeoContext | null> {
  const supabase = getSupabaseAdmin()
  const hostHeader = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || ''
  const host = normalizeHostname(String(hostHeader).split(',')[0] || '')
  const url = getRequestURL(event)
  const path = url.pathname || '/'
  const querySub = String(getQuery(event).subdomain || '').trim().toLowerCase()

  let subdomain = ''

  if (querySub) {
    subdomain = querySub
  } else if (host && !isAppHost(host)) {
    const { data } = await supabase
      .from('website_tenants')
      .select('subdomain')
      .eq('custom_domain', host)
      .maybeSingle()
    subdomain = data?.subdomain || ''
  } else {
    // /s/{sub}/robots.txt style or Referer — also support /s/{sub}/sitemap.xml via path
    const m = path.match(/^\/s\/([^/]+)/i)
    if (m) subdomain = decodeURIComponent(m[1]).toLowerCase()
  }

  if (!subdomain) return null

  const { data: website } = await supabase
    .from('website_tenants')
    .select(
      'id, tenant_id, subdomain, custom_domain, custom_domain_verified, is_published, seo_title, seo_description',
    )
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (!website?.is_published) return null

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, slug')
    .eq('id', website.tenant_id)
    .maybeSingle()

  const { data: pages } = await supabase
    .from('website_pages')
    .select('slug, title, is_home, page_type, is_published, updated_at')
    .eq('website_id', website.id)
    .eq('is_published', true)

  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'https'
  const verified = !!website.custom_domain_verified && !!website.custom_domain
  const baseUrl = verified
    ? `https://${website.custom_domain}`
    : `${proto}://${host || 'app.simy.ch'}/s/${encodeURIComponent(website.subdomain)}`

  return {
    subdomain: website.subdomain,
    customDomain: website.custom_domain || null,
    verified,
    tenantId: website.tenant_id,
    websiteId: website.id,
    baseUrl: baseUrl.replace(/\/$/, ''),
    name: tenant?.name || website.subdomain,
    seo_title: website.seo_title,
    seo_description: website.seo_description,
    pages: (pages || []).map((p) => ({
      slug: p.slug,
      title: p.title,
      is_home: !!p.is_home,
      page_type: p.page_type,
      updated_at: p.updated_at || null,
    })),
  }
}
