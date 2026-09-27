import { createError } from 'h3'
import { logger } from '~/utils/logger'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * Server-only postal-code resolution.
 * Callers pass tenantId from trusted server context. This module has no HTTP
 * handler and does not read tenant id, user id, or role from a request.
 */
export interface ResolvedPostalCode {
  postal_code: string
  city: string
  latitude: number
  longitude: number
  cached: boolean
}

type SupabaseLike = {
  from: (table: string) => any
}

export async function resolveLocationPostalCode(input: {
  locationName: string
  tenantId?: string | null
  supabase?: SupabaseLike
  fetchImpl?: typeof fetch
}): Promise<ResolvedPostalCode> {
  const locationName = input.locationName
  if (!locationName || typeof locationName !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'location_name is required and must be a string',
    })
  }

  const tenantId = typeof input.tenantId === 'string' ? input.tenantId.trim() : ''
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GOOGLE_GEOCODING_API_KEY is not configured',
    })
  }

  const supabase = input.supabase ?? getSupabaseAdmin()
  const fetchImpl = input.fetchImpl ?? fetch

  logger.debug(`🔍 Resolving postal code for location: ${locationName}`)

  const { data: cached } = await supabase
    .from('plz_distance_cache')
    .select('postal_code, city, latitude, longitude')
    .eq('location_name', locationName)
    .single()

  if (cached) {
    logger.debug(`✅ Found in cache: ${locationName} -> ${cached.postal_code} ${cached.city}`)
    return {
      postal_code: cached.postal_code,
      city: cached.city,
      latitude: cached.latitude,
      longitude: cached.longitude,
      cached: true,
    }
  }

  const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${apiKey}`
  logger.debug(`🌐 Calling Google Geocoding API for: ${locationName}`)

  const response = await fetchImpl(googleUrl)
  const data = await response.json()

  if (!response.ok || data.status !== 'OK' || !data.results?.length) {
    throw createError({
      statusCode: 404,
      statusMessage: `Could not geocode location: ${locationName}`,
    })
  }

  const result = data.results[0]
  const { lat, lng } = result.geometry.location

  let postalCode = ''
  let city = ''

  for (const component of result.address_components) {
    if (component.types.includes('postal_code')) {
      postalCode = component.short_name
    }
    if (component.types.includes('locality')) {
      city = component.long_name
    }
    if (component.types.includes('administrative_area_level_2') && !city) {
      city = component.long_name
    }
  }

  if (!postalCode || !city) {
    throw createError({
      statusCode: 400,
      statusMessage: `Could not extract postal code or city from Google result for: ${locationName}`,
    })
  }

  logger.debug(`✅ Google API result: ${postalCode} ${city} (${lat}, ${lng})`)

  await supabase.from('plz_distance_cache').insert({
    location_name: locationName,
    postal_code: postalCode,
    city,
    latitude: lat,
    longitude: lng,
    created_at: new Date().toISOString(),
  })

  if (tenantId) {
    const { data: location } = await supabase
      .from('locations')
      .select('id')
      .eq('name', city)
      .eq('tenant_id', tenantId)
      .single()

    if (location) {
      await supabase
        .from('locations')
        .update({
          postal_code: postalCode,
          city,
          latitude: lat,
          longitude: lng,
          updated_at: new Date().toISOString(),
        })
        .eq('id', location.id)
        .eq('tenant_id', tenantId)
    }
  }

  return {
    postal_code: postalCode,
    city,
    latitude: lat,
    longitude: lng,
    cached: false,
  }
}
