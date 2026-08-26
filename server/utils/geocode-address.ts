import { logger } from '~/utils/logger'

export type GeocodedPoint = {
  latitude: number
  longitude: number
  formatted_address: string | null
}

const memoryCache = new Map<string, GeocodedPoint | null>()

function cacheKey(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function isValidCoord(lat: unknown, lng: unknown): lat is number {
  return typeof lat === 'number' && typeof lng === 'number'
    && Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    && !(lat === 0 && lng === 0)
}

export function isInSwitzerland(lat: number, lng: number): boolean {
  return lat >= 45.75 && lat <= 47.85 && lng >= 5.9 && lng <= 10.55
}

export function formatLocationAddress(loc: {
  address?: string | null
  formatted_address?: string | null
  postal_code?: string | null
  city?: string | null
} | null | undefined): string | null {
  if (!loc) return null
  if (loc.formatted_address?.trim()) return loc.formatted_address.trim()
  const street = loc.address?.trim() || ''
  const zipCity = [loc.postal_code, loc.city].filter(Boolean).join(' ').trim()
  if (street && zipCity) {
    const alreadyHasCity = loc.city ? street.toLowerCase().includes(loc.city.toLowerCase()) : false
    return alreadyHasCity ? street : `${street}, ${zipCity}, Schweiz`
  }
  if (street) return `${street}, Schweiz`
  return zipCity ? `${zipCity}, Schweiz` : null
}

/**
 * Geocode a Swiss-ish address with Google. Returns null when the key is
 * missing or the address cannot be resolved — callers must not throw.
 */
export async function geocodeAddress(address: string): Promise<GeocodedPoint | null> {
  const trimmed = address.trim()
  if (!trimmed) return null

  const key = cacheKey(trimmed)
  if (memoryCache.has(key)) return memoryCache.get(key) ?? null

  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY
    || process.env.GOOGLE_MAPS_API_KEY
    || process.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    logger.warn('⚠️ Google Maps/Geocoding API key missing — cannot geocode travel destination')
    memoryCache.set(key, null)
    return null
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&region=ch&components=country:CH&language=de&key=${apiKey}`
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) })
    const data = await response.json() as {
      status?: string
      results?: Array<{ formatted_address?: string; geometry?: { location?: { lat: number; lng: number } } }>
    }

    const loc = data.results?.[0]?.geometry?.location
    if (data.status !== 'OK' || !isValidCoord(loc?.lat, loc?.lng)) {
      logger.warn('⚠️ Travel-fee geocode failed:', { address: trimmed, status: data.status })
      memoryCache.set(key, null)
      return null
    }
    if (!isInSwitzerland(loc.lat, loc.lng)) {
      logger.warn('⚠️ Travel-fee geocode outside Switzerland:', { address: trimmed, lat: loc.lat, lng: loc.lng })
      memoryCache.set(key, null)
      return null
    }

    const point: GeocodedPoint = {
      latitude: loc.lat,
      longitude: loc.lng,
      formatted_address: data.results?.[0]?.formatted_address || trimmed,
    }
    memoryCache.set(key, point)
    return point
  } catch (err: any) {
    logger.warn('⚠️ Travel-fee geocode error:', err?.message || err)
    return null
  }
}
