// Public: published tenant page by subdomain + slug

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const subdomain = getRouterParam(event, 'subdomain')?.trim().toLowerCase()
  const slug = getRouterParam(event, 'slug')?.trim().toLowerCase()
  if (!subdomain || !slug) {
    throw createError({ statusCode: 400, statusMessage: 'subdomain and slug required' })
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
      custom_domain_verified,
      last_published_at,
      addon_pages_enabled
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

  const { data: page, error: pageError } = await supabase
    .from('website_pages')
    .select(
      'id, title, slug, is_home, page_type, seo_title, seo_description, seo_keywords, og_image, blocks, is_published',
    )
    .eq('website_id', website.id)
    .eq('slug', slug)
    .maybeSingle()

  if (pageError) {
    throw createError({ statusCode: 500, statusMessage: pageError.message })
  }
  if (!page) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }
  if (!page.is_published && !preview) {
    throw createError({ statusCode: 404, statusMessage: 'Page not published' })
  }
  if (page.page_type !== 'home' && !page.is_home && !website.addon_pages_enabled && !preview) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', website.tenant_id)
    .maybeSingle()

  // Sibling nav: published add-on pages
  const { data: navPages } = await supabase
    .from('website_pages')
    .select('title, slug, page_type, is_home')
    .eq('website_id', website.id)
    .eq('is_published', true)
    .order('page_type', { ascending: true })

  const { applyLivePricesToLanding } = await import('~/server/utils/website-live-prices')
  const landing = await applyLivePricesToLanding(website.tenant_id, page.blocks || null)

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
