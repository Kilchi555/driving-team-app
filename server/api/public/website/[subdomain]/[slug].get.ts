// Public: published tenant page by subdomain + slug

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { setWebsitePublicCache } from '~/server/utils/website-public-cache'
import { authorizePublicWebsiteRead } from '~/server/utils/website-preview-access'
import {
  asPublicTenantRow,
  projectPublicWebsiteTenant,
  PUBLIC_WEBSITE_TENANT_SELECT,
} from '~/server/utils/website-public-tenant-select'

export default defineEventHandler(async (event) => {
  const subdomain = getRouterParam(event, 'subdomain')?.trim().toLowerCase()
  const slug = getRouterParam(event, 'slug')?.trim().toLowerCase()
  if (!subdomain || !slug) {
    throw createError({ statusCode: 400, statusMessage: 'subdomain and slug required' })
  }

  const query = getQuery(event) as Record<string, unknown>
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

  const access = await authorizePublicWebsiteRead(
    supabase,
    website,
    query,
    !!page.is_published,
  )
  if (!access.ok) {
    setWebsitePublicCache(event, { preview: true })
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }
  if (page.page_type !== 'home' && !page.is_home && !website.addon_pages_enabled && !access.draft) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  const { data: tenantRow } = await supabase
    .from('tenants')
    .select(PUBLIC_WEBSITE_TENANT_SELECT)
    .eq('id', website.tenant_id)
    .maybeSingle()

  const tenantRecord = asPublicTenantRow(tenantRow)
  const tenant = tenantRecord ? { ...tenantRecord, id: website.tenant_id } : null

  let navQuery = supabase
    .from('website_pages')
    .select('title, slug, page_type, is_home')
    .eq('website_id', website.id)
    .order('page_type', { ascending: true })
  if (!access.draft) navQuery = navQuery.eq('is_published', true)
  const { data: navPages } = await navQuery

  const { applyLivePricesToLanding } = await import('~/server/utils/website-live-prices')
  const { enrichLandingPremium } = await import('~/server/utils/website-enrich-landing')
  let landing = await applyLivePricesToLanding(website.tenant_id, page.blocks || null)
  landing = await enrichLandingPremium(supabase, tenant, landing as any, {
    subdomain,
    siteUrl:
      website.custom_domain_verified && website.custom_domain
        ? `https://${website.custom_domain}`
        : undefined,
    navPages: navPages || [],
    pageSlug: page.slug,
    pageTitle: page.title,
  })

  setWebsitePublicCache(event, {
    preview: access.privateCache,
    sMaxAge: 120,
    swr: 600,
    tag: `website-${subdomain}`,
  })

  return {
    website,
    page,
    tenant: projectPublicWebsiteTenant(tenantRecord),
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
