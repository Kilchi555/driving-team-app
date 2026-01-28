// server/utils/geolocation.ts
// IP Geolocation tracking for security monitoring
import { logger } from '~/utils/logger'

export interface IPLocation {
  country: string | null
  country_code: string | null
  region: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  isp: string | null
}

/**
 * Get geolocation data for an IP address using ipapi.co (free tier: 1000 req/day)
 * Falls back to ip-api.com if needed
 */
export async function getIPLocation(ip: string): Promise<IPLocation> {
  // Skip for local/private IPs
  if (!ip || ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      country: 'Local',
      country_code: 'LOCAL',
      region: null,
      city: null,
      latitude: null,
      longitude: null,
      timezone: null,
      isp: null
    }
  }

  try {
    // Try ipapi.co first (more reliable, 1000 req/day free)
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        'User-Agent': 'DrivingTeamApp/1.0'
      },
      signal: AbortSignal.timeout(3000) // 3s timeout
    })

    if (!response.ok) {
      throw new Error(`ipapi.co returned ${response.status}`)
    }

    const data = await response.json()

    // Check for error response
    if (data.error) {
      logger.warn(`⚠️ ipapi.co error for ${ip}:`, data.reason)
      throw new Error(data.reason)
    }

    return {
      country: data.country_name || null,
      country_code: data.country_code || null,
      region: data.region || null,
      city: data.city || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      timezone: data.timezone || null,
      isp: data.org || null
    }
  } catch (error) {
    logger.warn(`⚠️ Failed to fetch location from ipapi.co for ${ip}:`, error)

    // Fallback to ip-api.com (15000 req/hour free, but less reliable)
    try {
      const fallbackResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,city,lat,lon,timezone,isp`, {
        signal: AbortSignal.timeout(3000)
      })

      if (!fallbackResponse.ok) {
        throw new Error(`ip-api.com returned ${fallbackResponse.status}`)
      }

      const fallbackData = await fallbackResponse.json()

      if (fallbackData.status !== 'success') {
        throw new Error('ip-api.com query failed')
      }

      return {
        country: fallbackData.country || null,
        country_code: fallbackData.countryCode || null,
        region: fallbackData.region || null,
        city: fallbackData.city || null,
        latitude: fallbackData.lat || null,
        longitude: fallbackData.lon || null,
        timezone: fallbackData.timezone || null,
        isp: fallbackData.isp || null
      }
    } catch (fallbackError) {
      logger.warn(`⚠️ Failed to fetch location from ip-api.com for ${ip}:`, fallbackError)

      // Return null location if both fail
      return {
        country: null,
        country_code: null,
        region: null,
        city: null,
        latitude: null,
        longitude: null,
        timezone: null,
        isp: null
      }
    }
  }
}

/**
 * Calculate distance between two coordinates in kilometers
 * Uses Haversine formula
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
 * Check if a login from a new location is suspicious based on distance and time
 * Used for device verification when checking known devices
 */
export function isSuspiciousLocation(
  prevLat: number | null,
  prevLon: number | null,
  prevTime: Date,
  currentLat: number | null,
  currentLon: number | null
): { suspicious: boolean; reason?: string } {
  // Can't determine suspicion without coordinates
  if (!prevLat || !prevLon || !currentLat || !currentLon) {
    return { suspicious: false }
  }

  // Calculate distance
  const distance = calculateDistance(prevLat, prevLon, currentLat, currentLon)
  const timeDiffMinutes = (Date.now() - prevTime.getTime()) / 1000 / 60

  // Suspicious if > 500km traveled in < 60 minutes (impossible without flying)
  const maxSpeedKmPerHour = 500 // approximate max commercial flight speed
  const requiredMinutes = (distance / maxSpeedKmPerHour) * 60

  if (distance > 100 && timeDiffMinutes < requiredMinutes) {
    return {
      suspicious: true,
      reason: `Impossible travel: ${Math.round(distance)}km in ${Math.round(timeDiffMinutes)} minutes`
    }
  }

  // Suspicious if same device logs in from very different location (> 1000km) in same day
  if (distance > 1000 && timeDiffMinutes < 24 * 60) {
    return {
      suspicious: true,
      reason: `Large distance change: ${Math.round(distance)}km in ${Math.round(timeDiffMinutes / 60)} hours`
    }
  }

  return { suspicious: false }
}

/**
 * Detect impossible travel (login from different countries within short time)
 * Returns true if travel is suspicious
 */
export async function detectImpossibleTravel(
  userId: string,
  currentLat: number,
  currentLon: number,
  timeWindowMinutes: number = 60
): Promise<{
  suspicious: boolean
  distance?: number
  timeDiff?: number
  previousLocation?: IPLocation
}> {
  try {
    const { getSupabaseAdmin } = await import('~/utils/supabase')
    const supabase = getSupabaseAdmin()

    const windowStart = new Date(Date.now() - timeWindowMinutes * 60 * 1000)

    // Get last login location within time window
    const { data: lastLogin, error } = await supabase
      .from('audit_logs')
      .select('created_at, details')
      .eq('action', 'login')
      .eq('user_id', userId)
      .eq('status', 'success')
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !lastLogin || !lastLogin.details?.ip_location) {
      return { suspicious: false }
    }

    const prevLocation = lastLogin.details.ip_location
    const prevLat = prevLocation.latitude
    const prevLon = prevLocation.longitude

    if (!prevLat || !prevLon) {
      return { suspicious: false }
    }

    // Calculate distance
    const distance = calculateDistance(prevLat, prevLon, currentLat, currentLon)
    const timeDiff = (Date.now() - new Date(lastLogin.created_at).getTime()) / 1000 / 60 // minutes

    // Suspicious if > 500km traveled in < 60 minutes
    const maxSpeed = 500 // km per hour (plane speed)
    const requiredMinutes = (distance / maxSpeed) * 60

    if (distance > 100 && timeDiff < requiredMinutes) {
      logger.warn(`⚠️ Impossible travel detected for user ${userId}: ${distance}km in ${timeDiff}min`)
      return {
        suspicious: true,
        distance,
        timeDiff,
        previousLocation: prevLocation
      }
    }

    return { suspicious: false, distance, timeDiff }
  } catch (error) {
    logger.warn('⚠️ Error detecting impossible travel:', error)
    return { suspicious: false }
  }
}
