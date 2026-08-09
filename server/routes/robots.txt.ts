import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveWebsiteSeoContext } from '~/server/utils/website-seo-context'
import { isAppHost, normalizeHostname } from '~/server/utils/custom-domain'

const PLATFORM_ROBOTS = `User-Agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /debug/
Disallow: /_nuxt/
Disallow: /.nuxt/
Disallow: /components/
Disallow: /middleware/

Sitemap: https://simy.ch/sitemap.xml
Sitemap: https://drivingteam.ch/sitemap.xml
`

function isTenantSeoRequest(event: any): boolean {
  const hostHeader = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || ''
  const host = normalizeHostname(String(hostHeader).split(',')[0] || '')
  if (host && !isAppHost(host)) return true
  const path = getRequestURL(event).pathname || ''
  if (/^\/s\/[^/]+/i.test(path)) return true
  if (getQuery(event).subdomain) return true
  return false
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300')

  // App root (app.simy.ch/robots.txt): keep platform robots unchanged
  if (!isTenantSeoRequest(event)) {
    try {
      const fromPublic = readFileSync(join(process.cwd(), 'public/robots.txt'), 'utf8')
      if (fromPublic.trim()) return fromPublic
    } catch {
      /* fall through */
    }
    return PLATFORM_ROBOTS
  }

  const ctx = await resolveWebsiteSeoContext(event)
  if (!ctx) {
    return PLATFORM_ROBOTS
  }

  const sitemapUrl = `${ctx.baseUrl}/sitemap.xml`
  return `User-agent: *
Allow: /
Disallow: /*?preview=1
Sitemap: ${sitemapUrl}
`
})
