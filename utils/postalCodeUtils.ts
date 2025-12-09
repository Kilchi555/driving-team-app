/**
 * Utility to extract postal code from address string
 * Swiss format: "Hauptstrasse 5, 8610 Uster" or "Bahnhof, 8048 Zürich"
 * Returns: "8610" or null if not found
 */
export function extractPLZFromAddress(address: string | null): string | null {
  if (!address) return null

  // Match exactly 4 digits that are word boundaries (Swiss postal codes)
  const match = address.match(/\b(\d{4})\b/)
  return match ? match[1] : null
}

/**
 * Look up postal code from locations table by city name
 * Used as fallback when address doesn't contain PLZ
 */
export async function lookupPLZFromLocationName(
  locationName: string,
  tenantId: string,
  supabase: any
): Promise<string | null> {
  try {
    logger.debug(`🔍 Looking up PLZ for location: "${locationName}"`)

    const { data, error } = await supabase
      .from('locations')
      .select('postal_code, city, name')
      .eq('tenant_id', tenantId)
      .or(`city.ilike.${locationName},name.ilike.${locationName}`)
      .limit(1)

    if (error) {
      console.warn(`⚠️ DB query error:`, error)
      return null
    }

    if (!data || data.length === 0) {
      logger.debug(`⚠️ No location found in DB for: "${locationName}"`)
      return null
    }

    const location = data[0]
    logger.debug(`✅ Found location in DB: ${location.name} (${location.city}) - PLZ: ${location.postal_code}`)
    return location.postal_code
  } catch (err: any) {
    console.error('❌ Error looking up location:', err)
    return null
  }
}

/**
 * Resolve PLZ from external busy time location (Server-side)
 * 1. Try to extract from event_location string if it contains "NNNN Cityname" format
 * 2. Look up in locations table by city name
 * 3. Use Google Geocoding API as fallback
 * 4. Return null if nothing found
 */
export async function resolvePLZForExternalBusyTime(
  eventLocation: string | null,
  tenantId: string,
  supabase: any
): Promise<string | null> {
  if (!eventLocation) return null

  // First, try to extract PLZ directly from location string
  // In case it's already formatted as "8610 Uster"
  const directPLZ = extractPLZFromAddress(eventLocation)
  if (directPLZ) {
    logger.debug(`✅ Extracted PLZ directly: ${directPLZ} from "${eventLocation}"`)
    return directPLZ
  }

  // Second: look up in locations table
  const lookedUpPLZ = await lookupPLZFromLocationName(eventLocation, tenantId, supabase)
  if (lookedUpPLZ) {
    logger.debug(`✅ Found PLZ from locations table: ${lookedUpPLZ} for "${eventLocation}"`)
    return lookedUpPLZ
  }

  // Third: Use Google Geocoding API as fallback (server-side call)
  logger.debug(`🌐 Attempting Google Geocoding API for: "${eventLocation}"`)
  try {
    // Note: This is called from server-side, so it will use the server's Google API key
    // The API endpoint will be called directly via $fetch
    const response = await $fetch<any>('/api/geocoding/resolve-plz', {
      method: 'POST',
      body: {
        location_name: eventLocation,
        tenant_id: tenantId
      }
    })

    if (response && response.postal_code) {
      logger.debug(`✅ Geocoding API resolved: "${eventLocation}" → ${response.postal_code}`)
      return response.postal_code
    }
  } catch (error: any) {
    console.warn(`⚠️ Geocoding API failed for "${eventLocation}":`, error.message)
  }

  logger.debug(`❌ Could not resolve PLZ for: "${eventLocation}"`)
  return null
}

