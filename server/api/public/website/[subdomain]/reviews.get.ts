// Public: live Google reviews for a tenant landing page (by subdomain)
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { fetchTenantGoogleReviews } from '~/server/utils/tenant-google-reviews'

export default defineCachedEventHandler(
  async (event) => {
    const subdomain = getRouterParam(event, 'subdomain')?.trim().toLowerCase()
    if (!subdomain) {
      throw createError({ statusCode: 400, statusMessage: 'subdomain required' })
    }

    const preview = String(getQuery(event).preview || '') === '1'
    const limit = Math.min(Math.max(Number(getQuery(event).limit) || 8, 1), 16)
    const supabase = getSupabaseAdmin()

    const { data: website, error } = await supabase
      .from('website_tenants')
      .select('id, tenant_id, subdomain, is_published')
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

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, google_review_places')
      .eq('id', website.tenant_id)
      .maybeSingle()

    const config = useRuntimeConfig()
    const apiKey = String(config.googleMapsApiKey || '')

    const result = await fetchTenantGoogleReviews(
      apiKey,
      tenant?.google_review_places,
      limit,
    )

    return {
      subdomain,
      tenant_name: tenant?.name || null,
      source: result.source,
      averageRating: result.averageRating,
      totalReviewCount: result.totalReviewCount,
      total: result.reviews.length,
      reviews: result.reviews,
    }
  },
  {
    maxAge: 60 * 60 * 6,
    name: 'tenant-website-google-reviews',
    getKey: (event) => {
      const subdomain = getRouterParam(event, 'subdomain') || 'none'
      const q = getQuery(event)
      return `${subdomain}:${q.preview || '0'}:${q.limit || 8}`
    },
  },
)
