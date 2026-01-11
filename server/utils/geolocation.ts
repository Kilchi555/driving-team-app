import { logger } from '~/utils/logger'

export interface GeoLocation {
  country?: string
  countryCode?: string
  region?: string
  city?: string
  latitude?: number
  longitude?: number
  timezone?: string
  isp?: string
}

/**
 * Get geolocation data from IP address using ip-api.com
 * Free tier: 45 requests/minute
 * 
 * @param ipAddress - The IP address to lookup
 * @returns Geolocation data or null if lookup fails
 */
export async function getGeoLocation(ipAddress: string): Promise<GeoLocation | null> {
  // Skip localhost and private IPs
  if (!ipAddress || 
      ipAddress === 'unknown' || 
      ipAddress === '::1' || 
      ipAddress === '127.0.0.1' ||
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('10.') ||
      ipAddress.startsWith('172.')) {
    logger.debug('🌍 Skipping geolocation for local/private IP:', ipAddress)
    return null
  }

  try {
    logger.debug('🌍 Fetching geolocation for IP:', ipAddress)
    
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,region,city,lat,lon,timezone,isp`)
    
    if (!response.ok) {
      logger.warn('⚠️ Geolocation API request failed:', response.status)
      return null
    }

    const data = await response.json()

    if (data.status === 'fail') {
      logger.warn('⚠️ Geolocation lookup failed:', data.message)
      return null
    }

    const geoData: GeoLocation = {
      country: data.country || undefined,
      countryCode: data.countryCode || undefined,
      region: data.region || undefined,
      city: data.city || undefined,
      latitude: data.lat || undefined,
      longitude: data.lon || undefined,
      timezone: data.timezone || undefined,
      isp: data.isp || undefined
    }

    logger.debug('✅ Geolocation found:', {
      city: geoData.city,
      country: geoData.country
    })

    return geoData

  } catch (error: any) {
    logger.warn('⚠️ Geolocation lookup error:', error.message)
    return null
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Check if a login is suspicious based on location
 */
export function isSuspiciousLocation(
  lastLat: number | undefined,
  lastLon: number | undefined,
  lastSeen: Date,
  newLat: number | undefined,
  newLon: number | undefined
): { suspicious: boolean; distance?: number; reason?: string } {
  // If no previous location, not suspicious
  if (!lastLat || !lastLon || !newLat || !newLon) {
    return { suspicious: false }
  }

  const distance = calculateDistance(lastLat, lastLon, newLat, newLon)
  const hoursSinceLastLogin = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60)

  // Impossible travel: > 500km in < 2 hours
  if (distance > 500 && hoursSinceLastLogin < 2) {
    return {
      suspicious: true,
      distance,
      reason: `Impossible travel: ${Math.round(distance)}km in ${hoursSinceLastLogin.toFixed(1)} hours`
    }
  }

  // Very suspicious: > 1000km in < 6 hours
  if (distance > 1000 && hoursSinceLastLogin < 6) {
    return {
      suspicious: true,
      distance,
      reason: `Suspicious travel: ${Math.round(distance)}km in ${hoursSinceLastLogin.toFixed(1)} hours`
    }
  }

  return { suspicious: false, distance }
}

