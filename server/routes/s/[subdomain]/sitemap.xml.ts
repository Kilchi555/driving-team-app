export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300')

  const subdomain = String(getRouterParam(event, 'subdomain') || '').toLowerCase()
  const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
  const supabase = getSupabaseAdmin()

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, subdomain, custom_domain, custom_domain_verified, is_published')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (!website?.is_published) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const { data: pages } = await supabase
    .from('website_pages')
    .select('slug, is_home, is_published, updated_at')
    .eq('website_id', website.id)
    .eq('is_published', true)

  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'https'
  const host = (getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || 'app.simy.ch')
    .split(',')[0]
  const verified = !!website.custom_domain_verified && !!website.custom_domain
  const base = verified
    ? `https://${website.custom_domain}`
    : `${proto}://${host}/s/${encodeURIComponent(website.subdomain)}`

  const entries: Array<{ loc: string; lastmod?: string; priority: string }> = []
  for (const p of pages || []) {
    const loc =
      p.is_home || p.slug === 'index'
        ? base + '/'
        : `${base}/${encodeURIComponent(p.slug)}`
    const lastmod = p.updated_at ? String(p.updated_at).slice(0, 10) : undefined
    entries.push({
      loc,
      lastmod,
      priority: loc.endsWith('/') ? '1.0' : '0.8',
    })
  }
  if (!entries.length) entries.push({ loc: base + '/', priority: '1.0' })

  // Legal pages (always present for published sites)
  entries.push(
    { loc: `${base}/impressum`, priority: '0.3' },
    { loc: `${base}/datenschutz`, priority: '0.3' },
  )

  const body = entries
    .map(
      (e) => `  <url>
    <loc>${e.loc}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
})
