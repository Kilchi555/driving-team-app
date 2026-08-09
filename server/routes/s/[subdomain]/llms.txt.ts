export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300')

  const subdomain = String(getRouterParam(event, 'subdomain') || '').toLowerCase()
  const ctx = await (await import('~/server/utils/website-seo-context')).resolveWebsiteSeoContext({
    ...event,
    // ensure query subdomain
    node: event.node,
    context: event.context,
  })

  // Force via query by temporarily setting
  const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
  const supabase = getSupabaseAdmin()
  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, tenant_id, subdomain, custom_domain, custom_domain_verified, is_published, seo_title, seo_description')
    .eq('subdomain', subdomain)
    .maybeSingle()
  if (!website?.is_published) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const { data: tenant } = await supabase.from('tenants').select('name').eq('id', website.tenant_id).maybeSingle()
  const { data: pages } = await supabase
    .from('website_pages')
    .select('slug, title, is_home, page_type')
    .eq('website_id', website.id)
    .eq('is_published', true)

  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'https'
  const host = (getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || 'app.simy.ch').split(',')[0]
  const verified = !!website.custom_domain_verified && !!website.custom_domain
  const baseUrl = verified
    ? `https://${website.custom_domain}`
    : `${proto}://${host}/s/${encodeURIComponent(website.subdomain)}`

  const name = tenant?.name || website.subdomain
  const pageLines = (pages || [])
    .map((p) => {
      const path = p.is_home || p.slug === 'index' ? '/' : `/${p.slug}`
      return `- [${p.title}](${baseUrl}${path}): ${p.page_type || 'page'}`
    })
    .join('\n')

  return `# ${name}

> ${website.seo_description || website.seo_title || `${name} — Online-Terminbuchung Schweiz`}

## Site
- Home: ${baseUrl}/

## Pages
${pageLines || `- Home: ${baseUrl}/`}

## Notes
- Language: de-CH
- Live Google reviews may appear on the home page
`
})
