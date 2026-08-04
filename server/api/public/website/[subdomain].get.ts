// Public: published tenant landing page by subdomain
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

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

  return {
    website,
    page,
    tenant: tenant || null,
    landing: page.blocks || null,
  }
})
