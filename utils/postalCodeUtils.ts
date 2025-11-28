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
    console.log(`🔍 Looking up PLZ for location: "${locationName}"`)

    const { data, error } = await supabase
      .from('locations')
      .select('postal_code, city, name')
      .eq('tenant_id', tenantId)
      .or(`name.ilike.%${locationName}%,city.ilike.%${locationName}%`)
      .single()

    if (error || !data) {
      console.log(`⚠️  No location found for: "${locationName}"`)
      return null
    }

    console.log(`✅ Found location: ${data.name} (${data.city}) - PLZ: ${data.postal_code}`)
    return data.postal_code
  } catch (err: any) {
    console.error('❌ Error looking up location:', err)
    return null
  }
}

/**
 * Resolve PLZ from external busy time location
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
    console.log(`✅ Extracted PLZ directly: ${directPLZ} from "${eventLocation}"`)
    return directPLZ
  }

  // Second: look up in locations table
  const lookedUpPLZ = await lookupPLZFromLocationName(eventLocation, tenantId, supabase)
  if (lookedUpPLZ) {
    console.log(`✅ Found PLZ from locations table: ${lookedUpPLZ} for "${eventLocation}"`)
    return lookedUpPLZ
  }

  // Third: Use Google Geocoding API as fallback
  console.log(`🌐 Attempting Google Geocoding API for: "${eventLocation}"`)
  try {
    const response = await $fetch<{ success: boolean; postal_code: string | null }>('/api/geocoding/resolve-plz', {
      method: 'POST',
      body: {
        location: eventLocation,
        tenantId
      }
    })

    if (response.success && response.postal_code) {
      console.log(`✅ Geocoding API resolved: "${eventLocation}" → ${response.postal_code}`)
      return response.postal_code
    }
  } catch (error: any) {
    console.warn(`⚠️ Geocoding API failed for "${eventLocation}":`, error.message)
  }

  console.log(`❌ Could not resolve PLZ for: "${eventLocation}"`)
  return null
}

