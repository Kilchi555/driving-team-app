// GET /api/public/website/[subdomain]/og.png — 1200×630 OG card

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { renderWebsiteOgCard } from '~/server/utils/website-og-card'

export default defineEventHandler(async (event) => {
  const subdomain = getRouterParam(event, 'subdomain')?.trim().toLowerCase()
  if (!subdomain) {
    throw createError({ statusCode: 400, statusMessage: 'subdomain required' })
  }

  const slug = String(getQuery(event).slug || 'index').trim().toLowerCase() || 'index'
  const supabase = getSupabaseAdmin()

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, tenant_id, subdomain, primary_color, secondary_color, accent_color, logo_url, seo_title, seo_description, is_published')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (!website) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }

  let pageQuery = supabase
    .from('website_pages')
    .select('title, seo_title, seo_description, blocks, is_home, slug')
    .eq('website_id', website.id)

  if (slug === 'index') pageQuery = pageQuery.eq('is_home', true)
  else pageQuery = pageQuery.eq('slug', slug)

  const { data: page } = await pageQuery.maybeSingle()
  const landing = page?.blocks as any
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, business_type, city, address')
    .eq('id', website.tenant_id)
    .maybeSingle()

  const title =
    landing?.seo?.title ||
    page?.seo_title ||
    website.seo_title ||
    page?.title ||
    tenant?.name ||
    website.subdomain

  const { buildLocalSeoDefaults } = await import('~/server/utils/website-local-seo')
  const local = buildLocalSeoDefaults({
    name: tenant?.name || website.subdomain,
    business_type: tenant?.business_type,
    city: tenant?.city,
    address: tenant?.address,
  })

  const subtitle =
    landing?.seo?.description ||
    page?.seo_description ||
    website.seo_description ||
    local.description

  const png = await renderWebsiteOgCard({
    title,
    subtitle,
    brand: landing?.brand?.name || tenant?.name || website.subdomain,
    primary: landing?.brand?.primary || website.primary_color || undefined,
    secondary: landing?.brand?.secondary || website.secondary_color || undefined,
    accent: landing?.brand?.accent || website.accent_color || undefined,
    logoUrl: landing?.brand?.logo_url || website.logo_url || null,
  })

  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=86400')
  return png
})
