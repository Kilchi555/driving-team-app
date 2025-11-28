/**
 * API Endpoint: Geocode Location to Postal Code
 * Uses Google Geocoding API to resolve location name to postal code
 * Stores results directly in plz_distance_cache for unified caching
 */

import { getSupabaseAdmin } from '~/utils/supabase'

interface GeocodeResult {
  success: boolean
  location: string
  postal_code: string | null
  address: string | null
  error?: string
}

/**
 * Call Google Geocoding API to resolve location to postal code
 */
async function callGoogleGeocodingAPI(
  locationName: string,
  googleApiKey: string
): Promise<{ postal_code: string | null; address: string | null } | null> {
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

    return {
      postal_code,
      address
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

    // Check if we have a cached result in plz_distance_cache
    // Use location name as from_plz and '0000' as to_plz to mark as geocoding cache entry
    console.log('🔍 Checking cache in plz_distance_cache...')
    const { data: cached, error: cacheError } = await supabase
      .from('plz_distance_cache')
      .select('from_plz, distance_km')
      .eq('from_plz', normalizedLocation)
      .eq('to_plz', '0000') // Special marker for geocoding results
      .single()

    if (!cacheError && cached) {
      const postal_code = cached.from_plz
      console.log(`✅ Cache hit for "${normalizedLocation}" → ${postal_code}`)
      return {
        success: true,
        location: normalizedLocation,
        postal_code,
        address: normalizedLocation
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

    if (!result || !result.postal_code) {
      console.log(`⚠️ Could not geocode: "${normalizedLocation}"`)
      return {
        success: false,
        location: normalizedLocation,
        postal_code: null,
        address: null,
        error: 'Could not geocode location'
      }
    }

    // Save to both plz_distance_cache AND locations table
    console.log(`💾 Saving geocoding result...`)
    
    // 1. Save to plz_distance_cache with special marker
    const { error: cacheError2 } = await supabase
      .from('plz_distance_cache')
      .upsert({
        from_plz: normalizedLocation,
        to_plz: '0000', // Special marker for geocoding results
        postal_code: result.postal_code,
        driving_time_minutes: 0,
        driving_time_minutes_peak: 0,
        driving_time_minutes_offpeak: 0,
        distance_km: 0,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'from_plz,to_plz'
      })

    if (cacheError2) {
      console.warn('⚠️ Failed to save to plz_distance_cache:', cacheError2)
    }

    // 2. Create or update location in locations table (if tenantId provided)
    if (tenantId) {
      console.log(`💾 Creating/updating location in locations table...`)
      
      // Try to find existing location with this city
      const { data: existingLocation } = await supabase
        .from('locations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('city', normalizedLocation)
        .limit(1)
        .single()

      if (existingLocation) {
        // Update existing
        const { error: updateError } = await supabase
          .from('locations')
          .update({
            postal_code: result.postal_code,
            city: normalizedLocation,
            address: result.address,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLocation.id)

        if (updateError) {
          console.warn('⚠️ Failed to update location:', updateError)
        } else {
          console.log(`✅ Updated existing location with PLZ: ${result.postal_code}`)
        }
      } else {
        // Create new generic location entry for this city
        const { error: createError } = await supabase
          .from('locations')
          .insert({
            tenant_id: tenantId,
            name: normalizedLocation, // Generic name
            city: normalizedLocation,
            postal_code: result.postal_code,
            address: result.address,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (createError) {
          console.warn('⚠️ Failed to create location:', createError)
        } else {
          console.log(`✅ Created new location entry: ${normalizedLocation} (${result.postal_code})`)
        }
      }
    }

    return {
      success: true,
      location: normalizedLocation,
      postal_code: result.postal_code,
      address: result.address
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


