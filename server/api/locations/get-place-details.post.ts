/**
 * API Endpoint: Get Google Place Details
 * Holt die vollständigen Details einer Google Places Location (inkl. PLZ)
 */

import { logger } from '~/utils/logger'

interface AddressComponent {
  long_name: string
  short_name: string
  types: string[]
}

interface PlaceDetailsResponse {
  result?: {
    address_components?: AddressComponent[]
    formatted_address?: string
    geometry?: {
      location: {
        lat: number
        lng: number
      }
    }
  }
  status: string
}

export default defineEventHandler(async (event) => {
  try {
    const { place_id } = await readBody(event)

    if (!place_id) {
      throw new Error('place_id is required')
    }

    // Get API key from runtime config (not from process.env)
    const config = useRuntimeConfig()
    const googleApiKey = config.googleMapsApiKey
    
    if (!googleApiKey) {
      logger.warn('⚠️ Google API key not configured in runtimeConfig')
      return {
        success: false,
        error: 'Google API key not configured'
      }
    }

    logger.debug(`🔍 Fetching Google Place Details for place_id: ${place_id}`)

    // Call Google Places Details API
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&key=${googleApiKey}&fields=address_components,formatted_address,geometry`

    const response = await $fetch<PlaceDetailsResponse>(url)

    if (response.status !== 'OK') {
      logger.warn(`⚠️ Google Places API error: ${response.status}`)
      return {
        success: false,
        error: `Google API error: ${response.status}`
      }
    }

    const result = response.result
    if (!result) {
      logger.warn('⚠️ No result in Google Places response')
      return {
        success: false,
        error: 'No result from Google Places API'
      }
    }

    // Extract postal code from address_components
    let postal_code: string | null = null
    let city: string | null = null
    
    if (result.address_components) {
      const postalCodeComponent = result.address_components.find(component =>
        component.types.includes('postal_code')
      )
      postal_code = postalCodeComponent?.short_name || null
      
      // Extract city/locality
      const cityComponent = result.address_components.find(component =>
        component.types.includes('locality')
      )
      city = cityComponent?.long_name || null
    }

    // Extract coordinates
    const latitude = result.geometry?.location.lat || null
    const longitude = result.geometry?.location.lng || null
    const formatted_address = result.formatted_address || null

    // If we don't have postal code but have coordinates, try reverse geocoding
    if (!postal_code && latitude && longitude) {
      logger.debug(`🔄 No postal code from Place Details, trying reverse geocoding at ${latitude}, ${longitude}`)
      try {
        const reverseUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}&language=de`
        const reverseResponse = await $fetch<any>(reverseUrl)
        
        if (reverseResponse.status === 'OK' && reverseResponse.results?.length > 0) {
          for (const result of reverseResponse.results) {
            if (result.address_components) {
              const postalComponent = result.address_components.find((c: any) =>
                c.types.includes('postal_code')
              )
              if (postalComponent?.short_name) {
                postal_code = postalComponent.short_name
                logger.debug(`✅ Got postal code from reverse geocoding: ${postal_code}`)
                break
              }
            }
          }
        }
      } catch (reverseErr) {
        logger.warn(`⚠️ Reverse geocoding failed:`, reverseErr)
      }
    }

    logger.debug(`✅ Extracted place details:`, {
      postal_code,
      city,
      latitude,
      longitude,
      formatted_address
    })

    return {
      success: true,
      postal_code,
      city,
      latitude,
      longitude,
      formatted_address,
      address_components: result.address_components
    }
  } catch (error: any) {
    logger.error('❌ Error fetching place details:', error)
    return {
      success: false,
      error: error.message || 'Unknown error'
    }
  }
})
