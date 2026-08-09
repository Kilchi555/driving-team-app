/**
 * Resolve custom domains to tenant landing pages.
 * When Host is a verified (or attached) custom_domain, rewrite `/` → `/s/{subdomain}`.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { isAppHost, normalizeHostname } from '~/server/utils/custom-domain'

const cache = new Map<string, { subdomain: string; verified: boolean; expires: number }>()
const CACHE_MS = 60_000

async function lookupDomain(host: string) {
  const cached = cache.get(host)
  if (cached && cached.expires > Date.now()) return cached

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('website_tenants')
    .select('subdomain, custom_domain_verified, is_published')
    .eq('custom_domain', host)
    .maybeSingle()

  if (!data?.subdomain) {
    cache.set(host, { subdomain: '', verified: false, expires: Date.now() + CACHE_MS })
    return null
  }

  const entry = {
    subdomain: data.subdomain,
    verified: !!data.custom_domain_verified,
    expires: Date.now() + CACHE_MS,
  }
  cache.set(host, entry)
  return entry
}

export default defineEventHandler(async (event) => {
  const hostHeader = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || ''
  const host = normalizeHostname(hostHeader.split(',')[0] || '')
  if (!host || isAppHost(host)) return

  const path = getRequestURL(event).pathname || '/'

  // Never rewrite API / assets / Nuxt internals / SEO surfaces
  if (
    path.startsWith('/api/') ||
    path.startsWith('/_nuxt/') ||
    path.startsWith('/__nuxt') ||
    path.startsWith('/_vercel') ||
    path.startsWith('/favicon') ||
    path.startsWith('/simy-') ||
    path.startsWith('/fonts/')
  ) {
    return
  }

  const site = await lookupDomain(host)
  if (!site?.subdomain) {
    // Unknown custom host on this deployment
    if (path === '/' || path === '') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Diese Domain ist noch nicht mit einer Simy-Website verbunden',
      })
    }
    return
  }

  event.context.customDomain = {
    host,
    subdomain: site.subdomain,
    verified: site.verified,
  }

  // Serve landing page under custom domain root
  if (path === '/' || path === '') {
    const url = getRequestURL(event)
    event.node.req.url = `/s/${encodeURIComponent(site.subdomain)}${url.search || ''}`
    return
  }

  // Map /{page-slug} on custom domain → /s/{subdomain}/{page-slug}
  // Keep SEO files at root (handled by server/routes/*)
  if (
    path === '/robots.txt' ||
    path === '/sitemap.xml' ||
    path === '/llms.txt' ||
    path.startsWith('/booking') ||
    path.startsWith('/admin')
  ) {
    return
  }

  if (
    !path.startsWith('/s/') &&
    path !== '/robots.txt' &&
    path !== '/sitemap.xml' &&
    path !== '/llms.txt'
  ) {
    const url = getRequestURL(event)
    const clean = path.replace(/^\//, '').split('/')[0]
    if (clean) {
      event.node.req.url = `/s/${encodeURIComponent(site.subdomain)}/${encodeURIComponent(clean)}${url.search || ''}`
      return
    }
  }

  // Allow /s/{own-subdomain} on custom domain; redirect strangers to /
  const ownPrefix = `/s/${site.subdomain}`
  if (path.startsWith('/s/') && !path.startsWith(ownPrefix)) {
    return sendRedirect(event, `https://${host}/`, 302)
  }
})
