/**
 * Also expose SEO files under /s/{subdomain}/… for app-host tenants.
 */
import { resolveWebsiteSeoContext } from '~/server/utils/website-seo-context'

export default defineEventHandler(async (event) => {
  // Force path-based subdomain resolution
  const subdomain = getRouterParam(event, 'subdomain')
  if (subdomain) {
    // Stash into query for resolver
    const url = getRequestURL(event)
    url.searchParams.set('subdomain', subdomain)
    // mutate query via event context
    ;(event.context as any).seoSubdomain = subdomain
  }

  // Re-use root robots logic by calling resolver with query
  const q = getQuery(event)
  if (!q.subdomain && subdomain) {
    // patch query object if possible
  }

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300')

  // Manual resolve with explicit subdomain
  const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
  const supabase = getSupabaseAdmin()
  const sub = String(subdomain || '').toLowerCase()
  const { data: website } = await supabase
    .from('website_tenants')
    .select('subdomain, custom_domain, custom_domain_verified, is_published')
    .eq('subdomain', sub)
    .maybeSingle()

  if (!website?.is_published) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'https'
  const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || 'app.simy.ch'
  const verified = !!website.custom_domain_verified && !!website.custom_domain
  const base = verified
    ? `https://${website.custom_domain}`
    : `${proto}://${String(host).split(',')[0]}/s/${encodeURIComponent(website.subdomain)}`

  return `User-agent: *\nAllow: /\nDisallow: /*?preview=1\nSitemap: ${base.replace(/\/$/, '')}/sitemap.xml\n`
})
