// Public: live Google reviews for a tenant landing page (by subdomain)
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { fetchTenantGoogleReviews } from '~/server/utils/tenant-google-reviews'
import { setWebsitePublicCache } from '~/server/utils/website-public-cache'
import { authorizePublicWebsiteRead } from '~/server/utils/website-preview-access'
import { isDemoWebsiteTenant } from '~/utils/website-google-reviews'

/**
 * Server-memory cache for Google Places (rate-limit friendly).
 * CDN headers are set on the outer handler — defineCachedEventHandler
 * would overwrite Cache-Control with max-age=<maxAge>.
 */
async function loadReviews(subdomain: string, limit: number) {
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

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, google_review_places')
      .eq('id', website.tenant_id)
      .maybeSingle()

    const demoTenant = isDemoWebsiteTenant({
      subdomain,
      name: tenant?.name,
    })
    if (demoTenant) {
      return {
        subdomain,
        tenant_name: tenant?.name || null,
        source: 'none',
        averageRating: null,
        totalReviewCount: null,
        total: 0,
        reviews: [],
      }
    }

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
    const foreignHits = result.reviews.filter((r) =>
      /driving\s*team|\bskender\b/i.test(String(r.text || '')),
    )
    if (foreignHits.length >= Math.max(1, Math.ceil(result.reviews.length / 2))) {
      return {
        subdomain,
        tenant_name: tenant?.name || null,
        source: 'none',
        averageRating: null,
        totalReviewCount: null,
        total: 0,
        reviews: [],
      }
    }

    return {
      subdomain,
      tenant_name: tenant?.name || null,
      source: result.source,
      averageRating: result.averageRating,
      totalReviewCount: result.totalReviewCount,
      total: result.reviews.length,
      reviews: result.reviews,
    }
}

const loadReviewsCached = defineCachedFunction(loadReviews, {
  maxAge: 60 * 60 * 6,
  name: 'tenant-website-google-reviews',
  getKey: (subdomain: string, limit: number) => `${subdomain}:${limit}`,
})

export default defineEventHandler(async (event) => {
  const subdomain = getRouterParam(event, 'subdomain')?.trim().toLowerCase()
  if (!subdomain) {
    throw createError({ statusCode: 400, statusMessage: 'subdomain required' })
  }

  const query = getQuery(event) as Record<string, unknown>
  const limit = Math.min(Math.max(Number(query.limit) || 8, 1), 16)
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

  const access = await authorizePublicWebsiteRead(supabase, website, query, true)
  if (!access.ok) {
    setWebsitePublicCache(event, { preview: true })
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }

  setWebsitePublicCache(event, {
    preview: access.privateCache,
    sMaxAge: 3600,
    swr: 86400,
    tag: `website-reviews-${subdomain}`,
  })

  if (access.draft) return await loadReviews(subdomain, limit)
  return await loadReviewsCached(subdomain, limit)
})
