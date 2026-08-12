// Public: published tenant landing page by subdomain
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { setWebsitePublicCache } from '~/server/utils/website-public-cache'

export default defineEventHandler(async (event) => {
  const subdomain = getRouterParam(event, 'subdomain')?.trim().toLowerCase()
  if (!subdomain) {
    throw createError({ statusCode: 400, statusMessage: 'subdomain required' })
  }

  const preview = String(getQuery(event).preview || '') === '1'
  const supabase = getSupabaseAdmin()

  const { data: website, error } = await supabase
    .from('website_tenants')
    .select(
      `
      id,
      tenant_id,
      subdomain,
      custom_domain,
      is_published,
      seo_title,
      seo_description,
      seo_keywords,
      primary_color,
      secondary_color,
      accent_color,
      logo_url,
      favicon_url,
      hero_image_url,
      custom_domain,
      custom_domain_verified,
      last_published_at
    `,
    )
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!website) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }
  if (!website.is_published && !preview) {
    throw createError({ statusCode: 404, statusMessage: 'Website not published' })
  }

  let pageQuery = supabase
    .from('website_pages')
    .select('id, title, slug, is_home, seo_title, seo_description, seo_keywords, og_image, blocks, is_published')
    .eq('website_id', website.id)
    .eq('is_home', true)
    .maybeSingle()

  const { data: page, error: pageError } = await pageQuery
  if (pageError) {
    throw createError({ statusCode: 500, statusMessage: pageError.message })
  }
  if (!page) {
    throw createError({ statusCode: 404, statusMessage: 'Home page not found' })
  }
  if (!page.is_published && !preview) {
    throw createError({ statusCode: 404, statusMessage: 'Page not published' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', website.tenant_id)
    .maybeSingle()

  const { data: navPages } = await supabase
    .from('website_pages')
    .select('title, slug, page_type, is_home')
    .eq('website_id', website.id)
    .eq('is_published', true)
    .order('page_type', { ascending: true })

  const { applyLivePricesToLanding } = await import('~/server/utils/website-live-prices')
  const { enrichLandingPremium } = await import('~/server/utils/website-enrich-landing')
  let landing = await applyLivePricesToLanding(website.tenant_id, page.blocks || null)
  landing = await enrichLandingPremium(supabase, tenant, landing as any, {
    subdomain,
    siteUrl:
      website.custom_domain_verified && website.custom_domain
        ? `https://${website.custom_domain}`
        : undefined,
  })

  // Edge cache ~2 min (slots soft-refreshed client-side); never cache preview
  setWebsitePublicCache(event, {
    preview,
    sMaxAge: 120,
    swr: 600,
    tag: `website-${subdomain}`,
  })

  return {
    website,
    page,
    tenant: tenant || null,
    landing,
    nav: (navPages || []).map((p) => ({
      title: p.title,
      slug: p.slug,
      page_type: p.page_type || (p.is_home ? 'home' : 'addon'),
      is_home: !!p.is_home,
      href: p.is_home || p.slug === 'index' ? `/s/${subdomain}` : `/s/${subdomain}/${p.slug}`,
    })),
  }
})
