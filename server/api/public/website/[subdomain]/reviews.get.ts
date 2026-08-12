// Public: live Google reviews for a tenant landing page (by subdomain)
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { fetchTenantGoogleReviews } from '~/server/utils/tenant-google-reviews'
import { setWebsitePublicCache } from '~/server/utils/website-public-cache'

/**
 * Server-memory cache for Google Places (rate-limit friendly).
 * CDN headers are set on the outer handler — defineCachedEventHandler
 * would overwrite Cache-Control with max-age=<maxAge>.
 */
const loadReviewsCached = defineCachedFunction(
  async (
    subdomain: string,
    preview: boolean,
    limit: number,
  ) => {
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

    let placesRaw = tenant?.google_review_places
    try {
      const { getTenantPlaceIds } = await import('~/server/utils/tenant-google-reviews')
      const existing = getTenantPlaceIds(placesRaw)
      if (!existing.length && placesRaw) {
        const { resolvePlaceIdFromUrl } = await import('~/server/utils/google-place-resolve')
        const arr =
          typeof placesRaw === 'string' ? JSON.parse(placesRaw) : placesRaw
        if (Array.isArray(arr) && arr[0]?.url) {
          const resolved = await resolvePlaceIdFromUrl(String(arr[0].url), apiKey)
          if (resolved?.place_id) {
            placesRaw = [
              {
                name: resolved.name,
                place_id: resolved.place_id,
                url: resolved.maps_url || arr[0].url,
              },
            ]
            await supabase
              .from('tenants')
              .update({ google_review_places: placesRaw })
              .eq('id', website.tenant_id)
          }
        }
      }
    } catch {
      /* keep original placesRaw */
    }

    const result = await fetchTenantGoogleReviews(apiKey, placesRaw, limit)

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
    getKey: (subdomain, preview, limit) => `${subdomain}:${preview ? '1' : '0'}:${limit}`,
  },
)

export default defineEventHandler(async (event) => {
  const subdomain = getRouterParam(event, 'subdomain')?.trim().toLowerCase()
  if (!subdomain) {
    throw createError({ statusCode: 400, statusMessage: 'subdomain required' })
  }

  const preview = String(getQuery(event).preview || '') === '1'
  const limit = Math.min(Math.max(Number(getQuery(event).limit) || 8, 1), 16)

  setWebsitePublicCache(event, {
    preview,
    sMaxAge: 3600,
    swr: 86400,
    tag: `website-reviews-${subdomain}`,
  })

  return await loadReviewsCached(subdomain, preview, limit)
})
