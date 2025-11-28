/**
 * API Endpoint: Geocode Location to Postal Code
 * Uses Google Geocoding API to resolve location name to postal code
 * Caches results in database to avoid repeated API calls
 */

import { getSupabaseAdmin } from '~/utils/supabase'

interface GeocodeResult {
  success: boolean
  location: string
  postal_code: string | null
  address: string | null
  latitude?: number
  longitude?: number
  error?: string
}

/**
 * Call Google Geocoding API to resolve location to postal code
 */
async function callGoogleGeocodingAPI(
  locationName: string,
  googleApiKey: string
): Promise<{ postal_code: string | null; address: string | null; latitude?: number; longitude?: number } | null> {
  try {
    const query = `${locationName}, Switzerland`
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleApiKey}&language=de`

    console.log(`🌐 Calling Google Geocoding API for: "${locationName}"`)
    const response = await $fetch<any>(url)

    if (response.status !== 'OK' || !response.results || response.results.length === 0) {
      console.warn(`⚠️ Geocoding not found: "${locationName}"`)
      return null
    }

    const result = response.results[0]
    const address = result.formatted_address
    const { lat, lng } = result.geometry.location

    // Extract postal code from address components
    let postal_code: string | null = null
    for (const component of result.address_components) {
      if (component.types.includes('postal_code')) {
        postal_code = component.long_name
        break
      }
    }

    console.log(`✅ Geocoding result for "${locationName}":`)
    console.log(`   Address: ${address}`)
    console.log(`   PLZ: ${postal_code}`)
    console.log(`   Lat/Lng: ${lat}, ${lng}`)

    return {
      postal_code,
      address,
      latitude: lat,
      longitude: lng
    }
  } catch (error: any) {
    console.error('❌ Error calling Google Geocoding API:', error)
    return null
  }
}

export default defineEventHandler(async (event): Promise<GeocodeResult> => {
  try {
    const body = await readBody(event)
    const { location, tenantId } = body

    if (!location) {
      throw createError({
        statusCode: 400,
        message: 'location parameter is required'
      })
    }

    const normalizedLocation = location.trim()

    console.log('=' .repeat(80))
    console.log(`🔍 GEOCODE LOCATION TO PLZ API CALLED`)
    console.log(`   Location: "${normalizedLocation}"`)
    console.log('=' .repeat(80))

    const supabase = getSupabaseAdmin()

    // Check cache first
    console.log('🔍 Checking cache for geocoding result...')
    const { data: cached, error: cacheError } = await supabase
      .from('location_geocoding_cache')
      .select('postal_code, address, latitude, longitude, cached_at')
      .eq('location_name', normalizedLocation)
      .single()

    if (!cacheError && cached) {
      const cachedDate = new Date(cached.cached_at)
      const ageMinutes = (Date.now() - cachedDate.getTime()) / (1000 * 60)
      
      // Use cache if less than 30 days old
      if (ageMinutes < 30 * 24 * 60) {
        console.log(`✅ Cache hit for "${normalizedLocation}" (${Math.round(ageMinutes)} minutes old)`)
        return {
          success: true,
          location: normalizedLocation,
          postal_code: cached.postal_code,
          address: cached.address,
          latitude: cached.latitude,
          longitude: cached.longitude
        }
      }
    }

    // Cache miss - call Google API
    const config = useRuntimeConfig()
    const googleApiKey = config.googleMapsApiKey

    if (!googleApiKey) {
      console.error('❌ GOOGLE_MAPS_API_KEY not configured')
      throw createError({
        statusCode: 500,
        message: 'Google Maps API key not configured'
      })
    }

    console.log(`🌐 Cache miss, calling Google Geocoding API...`)
    const result = await callGoogleGeocodingAPI(normalizedLocation, googleApiKey)

    if (!result) {
      // Save as failed attempt
      console.log(`💾 Saving failed geocoding attempt to cache`)
      const { error: saveError } = await supabase
        .from('location_geocoding_cache')
        .upsert({
          location_name: normalizedLocation,
          postal_code: null,
          address: null,
          latitude: null,
          longitude: null,
          cached_at: new Date().toISOString()
        }, {
          onConflict: 'location_name'
        })

      if (saveError) {
        console.warn('⚠️ Failed to save geocoding cache:', saveError)
      }

      return {
        success: false,
        location: normalizedLocation,
        postal_code: null,
        address: null,
        error: 'Could not geocode location'
      }
    }

    // Save to cache
    console.log(`💾 Saving geocoding result to cache`)
    const { error: saveError } = await supabase
      .from('location_geocoding_cache')
      .upsert({
        location_name: normalizedLocation,
        postal_code: result.postal_code,
        address: result.address,
        latitude: result.latitude,
        longitude: result.longitude,
        cached_at: new Date().toISOString()
      }, {
        onConflict: 'location_name'
      })

    if (saveError) {
      console.warn('⚠️ Failed to save geocoding cache:', saveError)
    }

    return {
      success: true,
      location: normalizedLocation,
      postal_code: result.postal_code,
      address: result.address,
      latitude: result.latitude,
      longitude: result.longitude
    }
  } catch (error: any) {
    console.error('❌ Error in geocode-location API:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error'
    })
  }
})

