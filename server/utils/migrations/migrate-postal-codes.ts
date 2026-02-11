/**
 * Migration: Populate postal codes for pickup locations
 * Fetches postal codes from Google Places API for existing pickup locations
 * Falls back to Reverse Geocoding if direct place details don't work
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

async function getPostalCodeFromPlaceDetails(placeId: string, googleApiKey: string): Promise<{ postalCode: string | null; lat?: number; lng?: number }> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${googleApiKey}&fields=address_components,geometry`
    
    const response = await $fetch<any>(url)
    
    if (response.status !== 'OK' || !response.result) {
      return { postalCode: null }
    }
    
    let postalCode: string | null = null
    if (response.result.address_components) {
      const postalComponent = response.result.address_components.find((c: any) =>
        c.types.includes('postal_code')
      )
      postalCode = postalComponent?.short_name || null
    }
    
    const lat = response.result.geometry?.location?.lat
    const lng = response.result.geometry?.location?.lng
    
    return { postalCode, lat, lng }
  } catch (err) {
    logger.debug(`⚠️ Error fetching place details for ${placeId}:`, err)
    return { postalCode: null }
  }
}

async function getPostalCodeFromReverseGeocoding(lat: number, lng: number, googleApiKey: string): Promise<string | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}&language=de&result_type=postal_code`
    
    const response = await $fetch<any>(url)
    
    if (response.status !== 'OK' || !response.results?.length) {
      return null
    }
    
    // Look for postal_code in address components
    for (const result of response.results) {
      if (result.address_components) {
        const postalComponent = result.address_components.find((c: any) =>
          c.types.includes('postal_code')
        )
        if (postalComponent?.short_name) {
          return postalComponent.short_name
        }
      }
    }
    
    return null
  } catch (err) {
    logger.debug(`⚠️ Error in reverse geocoding for ${lat},${lng}:`, err)
    return null
  }
}

export async function migratePickupLocationPostalCodes() {
  try {
    // Get the API key from runtime config
    const config = useRuntimeConfig()
    const googleApiKey = config.googleMapsApiKey
    
    if (!googleApiKey) {
      logger.error('❌ Google API key not configured in runtimeConfig')
      throw new Error('Google API key not configured')
    }
    
    const supabase = getSupabaseAdmin()
    
    // Get all pickup locations with missing postal codes
    const { data: locations, error } = await supabase
      .from('locations')
      .select('id, name, google_place_id, latitude, longitude, tenant_id')
      .eq('location_type', 'pickup')
      .is('postal_code', null)
      .not('google_place_id', 'is', null)
    
    if (error) {
      throw error
    }
    
    if (!locations || locations.length === 0) {
      logger.debug('ℹ️ No pickup locations to migrate')
      return { processed: 0, updated: 0 }
    }
    
    logger.debug(`🔄 Found ${locations.length} pickup locations to update`)
    
    let updated = 0
    
    // Process in batches to avoid rate limiting
    for (const location of locations) {
      try {
        let postalCode: string | null = null
        let lat = location.latitude
        let lng = location.longitude
        
        // First try: get postal code AND coordinates from Place Details
        const placeDetails = await getPostalCodeFromPlaceDetails(location.google_place_id, googleApiKey)
        postalCode = placeDetails.postalCode
        
        // Use coordinates from place details if we got them
        if (placeDetails.lat && placeDetails.lng) {
          lat = placeDetails.lat
          lng = placeDetails.lng
          logger.debug(`📍 Got coordinates from Place Details: ${lat}, ${lng}`)
        }
        
        // Second try: if we still don't have postal code but have coordinates, use reverse geocoding
        if (!postalCode && lat && lng) {
          logger.debug(`🔄 Trying reverse geocoding for ${location.name} at ${lat}, ${lng}`)
          postalCode = await getPostalCodeFromReverseGeocoding(lat, lng, googleApiKey)
        }
        
        if (postalCode || (lat && lng && lat !== location.latitude && lng !== location.longitude)) {
          const updateData: any = {}
          if (postalCode) updateData.postal_code = postalCode
          if (lat && lat !== location.latitude) updateData.latitude = lat
          if (lng && lng !== location.longitude) updateData.longitude = lng
          
          const { error: updateError } = await supabase
            .from('locations')
            .update(updateData)
            .eq('id', location.id)
          
          if (!updateError) {
            const updates = []
            if (postalCode) updates.push(`PLZ: ${postalCode}`)
            if (lat || lng) updates.push(`Coords: ${lat}, ${lng}`)
            logger.debug(`✅ Updated ${location.name}: ${updates.join(', ')}`)
            updated++
          } else {
            logger.warn(`⚠️ Error updating ${location.name}:`, updateError)
          }
        } else {
          logger.warn(`⚠️ Could not extract postal code or coords for ${location.name}`)
        }
        
        // Rate limiting: wait between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (err: any) {
        logger.warn(`⚠️ Error processing ${location.name}:`, err.message)
      }
    }
    
    logger.debug(`✅ Migration complete: ${updated}/${locations.length} updated`)
    return { processed: locations.length, updated }
    
  } catch (err: any) {
    logger.error('❌ Migration failed:', err)
    throw err
  }
}
