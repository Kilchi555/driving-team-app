import { resolveWebsiteSeoContext } from '~/server/utils/website-seo-context'
import { isAppHost, normalizeHostname } from '~/server/utils/custom-domain'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300')

  const hostHeader = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || ''
  const host = normalizeHostname(String(hostHeader).split(',')[0] || '')
  const path = getRequestURL(event).pathname || ''

  // App root sitemap: not a tenant surface — point crawlers to marketing sitemaps
  if ((!host || isAppHost(host)) && !/^\/s\//i.test(path) && !getQuery(event).subdomain) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://simy.ch/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://drivingteam.ch/sitemap.xml</loc></sitemap>
</sitemapindex>
`
  }

  const ctx = await resolveWebsiteSeoContext(event)
  if (!ctx) {
    throw createError({ statusCode: 404, statusMessage: 'Sitemap not found' })
  }

  const urls: string[] = []
  for (const p of ctx.pages) {
    if (p.is_home || p.slug === 'index') {
      urls.push(ctx.baseUrl + '/')
    } else {
      urls.push(`${ctx.baseUrl}/${encodeURIComponent(p.slug)}`)
    }
  }
  if (!urls.length) urls.push(ctx.baseUrl + '/')

  const body = urls
    .map(
      (loc) => `  <url>
    <loc>${loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>${loc.endsWith('/') ? '1.0' : '0.8'}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
})
