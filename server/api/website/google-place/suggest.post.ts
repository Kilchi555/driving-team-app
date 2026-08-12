// POST /api/website/google-place/suggest — find Google Place ID from tenant name/address/URL
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { suggestGooglePlacesForTenant } from '~/server/utils/google-place-resolve'
import { extractCityFromAddress } from '~/server/utils/website-local-seo'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = (await readBody(event)) || {}
  const supabase = getSupabaseAdmin()

  const { data: user } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'User or tenant not found' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, address, city, google_review_places')
    .eq('id', user.tenant_id)
    .single()

  const name = String(body.name || tenant?.name || '').trim()
  const address = String(body.address || tenant?.address || '').trim()
  const city =
    String(body.city || tenant?.city || '').trim() ||
    extractCityFromAddress(address, tenant?.city)

  let mapsUrl = String(body.maps_url || body.url || '').trim()
  if (!mapsUrl && tenant?.google_review_places) {
    try {
      const raw =
        typeof tenant.google_review_places === 'string'
          ? JSON.parse(tenant.google_review_places)
          : tenant.google_review_places
      if (Array.isArray(raw) && raw[0]?.url) mapsUrl = String(raw[0].url)
    } catch {
      /* ignore */
    }
  }

  const config = useRuntimeConfig()
  const apiKey = String(config.googleMapsApiKey || '')

  const candidates = await suggestGooglePlacesForTenant({
    name,
    address,
    city,
    mapsUrl: mapsUrl || null,
    apiKey,
    limit: 5,
  })

  return {
    success: true,
    query: { name, address, city, mapsUrl: mapsUrl || null },
    candidates,
    auto: candidates[0]?.confidence === 'high' ? candidates[0] : null,
  }
})
