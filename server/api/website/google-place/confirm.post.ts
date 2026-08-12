// POST /api/website/google-place/confirm — persist Place ID on tenant.google_review_places
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { extractPlaceIdFromGoogleUrl } from '~/server/utils/google-place-resolve'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = (await readBody(event)) || {}
  const placeId = String(body.place_id || extractPlaceIdFromGoogleUrl(body.url || '') || '').trim()
  const name = String(body.name || '').trim() || 'Google Standort'

  if (!placeId) {
    throw createError({ statusCode: 400, statusMessage: 'place_id required' })
  }

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'User or tenant not found' })
  }

  const places = [
    {
      name,
      place_id: placeId,
      url: body.maps_url || `https://search.google.com/local/writereview?placeid=${placeId}`,
    },
  ]

  const { error } = await supabase
    .from('tenants')
    .update({
      google_review_places: places,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.tenant_id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return {
    success: true,
    place: places[0],
    review_link: places[0].url,
  }
})
