/**
 * Migration: Populate postal codes for pickup locations
 * Fetches postal codes from Google Places API for existing pickup locations
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

async function getPostalCodeFromGoogle(placeId: string, googleApiKey: string): Promise<string | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${googleApiKey}&fields=address_components`
    
    const response = await $fetch<any>(url)
    
    if (response.status !== 'OK' || !response.result?.address_components) {
      return null
    }
    
    const postalComponent = response.result.address_components.find((c: any) =>
      c.types.includes('postal_code')
    )
    
    return postalComponent?.short_name || null
  } catch (err) {
    logger.warn(`⚠️ Error fetching place details for ${placeId}:`, err)
    return null
  }
}

export async function migratePickupLocationPostalCodes() {
  try {
    const googleApiKey = process.env.GOOGLE_DISTANCE_MATRIX_API_KEY
    if (!googleApiKey) {
      throw new Error('Google API key not configured')
    }
    
    const supabase = getSupabaseAdmin()
    
    // Get all pickup locations with missing postal codes
    const { data: locations, error } = await supabase
      .from('locations')
      .select('id, name, google_place_id, tenant_id')
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
        const postalCode = await getPostalCodeFromGoogle(location.google_place_id, googleApiKey)
        
        if (postalCode) {
          const { error: updateError } = await supabase
            .from('locations')
            .update({ postal_code: postalCode })
            .eq('id', location.id)
          
          if (!updateError) {
            logger.debug(`✅ Updated ${location.name} with postal code: ${postalCode}`)
            updated++
          } else {
            logger.warn(`⚠️ Error updating ${location.name}:`, updateError)
          }
        } else {
          logger.warn(`⚠️ Could not extract postal code for ${location.name}`)
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
