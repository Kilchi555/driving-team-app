import type { ProspectPlace } from '~/server/utils/website-prospect-types'
import { extractCityFromAddressLine } from '~/server/utils/website-prospect-scrape'
import { suggestGooglePlacesForTenant } from '~/server/utils/google-place-resolve'

function mapsKey() {
  try {
    return String(useRuntimeConfig().googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || '').trim()
  } catch {
    return String(process.env.GOOGLE_MAPS_API_KEY || '').trim()
  }
}

export async function fetchProspectPlaceDetails(placeId: string): Promise<ProspectPlace | null> {
  const key = mapsKey()
  if (!key || !placeId) return null
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,url,types,opening_hours,reviews,address_components,photos` +
    `&language=de&key=${key}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = (await res.json()) as {
      status?: string
      result?: {
        place_id?: string
        name?: string
        formatted_address?: string
        formatted_phone_number?: string
        international_phone_number?: string
        website?: string
        rating?: number
        user_ratings_total?: number
        url?: string
        types?: string[]
        opening_hours?: { weekday_text?: string[] }
        reviews?: Array<{ author_name?: string; text?: string; rating?: number }>
        photos?: Array<{ photo_reference?: string; width?: number; height?: number }>
        address_components?: Array<{ long_name?: string; types?: string[] }>
      }
    }
    if (data.status && data.status !== 'OK') return null
    const r = data.result
    if (!r?.place_id || !r.name) return null
    const comps = r.address_components || []
    const city =
      comps.find((c) => c.types?.includes('locality'))?.long_name ||
      extractCityFromAddressLine(r.formatted_address).city
    const postal =
      comps.find((c) => c.types?.includes('postal_code'))?.long_name ||
      extractCityFromAddressLine(r.formatted_address).postal_code
    return {
      place_id: r.place_id,
      name: r.name,
      address: r.formatted_address || null,
      phone: r.international_phone_number || r.formatted_phone_number || null,
      website: r.website || null,
      rating: r.rating ?? null,
      user_ratings_total: r.user_ratings_total ?? null,
      maps_url: r.url || null,
      types: r.types || [],
      reviews: (r.reviews || [])
        .filter((x) => x.text?.trim())
        .slice(0, 5)
        .map((x) => ({
          author: x.author_name || 'Google',
          text: String(x.text || '').slice(0, 400),
          rating: x.rating || 5,
        })),
      opening_hours: r.opening_hours?.weekday_text || [],
      photos: (r.photos || [])
        .filter((p) => p.photo_reference)
        .slice(0, 8)
        .map((p) => ({
          ref: String(p.photo_reference),
          width: p.width || 0,
          height: p.height || 0,
        })),
      city: city || null,
      postal_code: postal || null,
    }
  } catch {
    return null
  }
}

export async function resolveProspectPlace(input: {
  name: string
  address?: string | null
  city?: string | null
  url?: string | null
}): Promise<ProspectPlace | null> {
  const key = mapsKey()
  const candidates = await suggestGooglePlacesForTenant({
    name: input.name,
    address: input.address,
    city: input.city,
    mapsUrl: input.url,
    apiKey: key,
    limit: 3,
  })
  const best = candidates[0]
  if (!best?.place_id) return null
  return (await fetchProspectPlaceDetails(best.place_id)) || {
    place_id: best.place_id,
    name: best.name,
    address: best.address || null,
    phone: null,
    website: null,
    rating: best.rating ?? null,
    user_ratings_total: best.user_ratings_total ?? null,
    maps_url: best.maps_url || null,
    types: [],
    reviews: [],
    opening_hours: [],
    photos: [],
    city: input.city || extractCityFromAddressLine(best.address).city,
    postal_code: extractCityFromAddressLine(best.address).postal_code,
  }
}
