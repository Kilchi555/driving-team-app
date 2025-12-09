/**
 * PLZ Distance Cache Utilities
 * Verwaltet gecachte Fahrzeiten zwischen Postleitzahlen
 * Berücksichtigt Stosszeiten vs. normale Zeiten
 */

import { createClient } from '@supabase/supabase-js'

// Get Supabase client (server-side compatible)
// Cached to avoid creating multiple instances
let cachedSupabaseClient: any = null

function getSupabaseClient() {
  if (cachedSupabaseClient) {
    return cachedSupabaseClient
  }
  
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration: SUPABASE_URL and SUPABASE_ANON_KEY must be set')
  }
  
  cachedSupabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  return cachedSupabaseClient
}

interface PLZDistanceCache {
  from_plz: string
  to_plz: string
  driving_time_minutes_peak: number
  driving_time_minutes_offpeak: number
  distance_km: number
  last_updated: string
}

interface PeakTimeSettings {
  morning_start: string  // "07:00"
  morning_end: string    // "09:00"
  evening_start: string  // "17:00"
  evening_end: string    // "19:00"
}

/**
 * Prüft ob eine gegebene Zeit in der Stosszeit liegt
 * Kann mit individuellen Peak-Time Settings aufgerufen werden
 */
export function isPeakTime(
  dateTime: Date, 
  peakSettings?: PeakTimeSettings
): boolean {
  const day = dateTime.getDay() // 0 = Sonntag, 6 = Samstag
  const hour = dateTime.getHours()
  const minute = dateTime.getMinutes()
  
  // Wochenende = keine Stosszeit
  if (day === 0 || day === 6) {
    return false
  }
  
  // Default Settings
  const settings = peakSettings || {
    morning_start: '07:00',
    morning_end: '09:00',
    evening_start: '17:00',
    evening_end: '19:00'
  }
  
  // Parse time strings to hours and minutes
  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    return { hour: h, minute: m || 0 }
  }
  
  const morningStart = parseTime(settings.morning_start)
  const morningEnd = parseTime(settings.morning_end)
  const eveningStart = parseTime(settings.evening_start)
  const eveningEnd = parseTime(settings.evening_end)
  
  const currentTimeInMinutes = hour * 60 + minute
  const morningStartMinutes = morningStart.hour * 60 + morningStart.minute
  const morningEndMinutes = morningEnd.hour * 60 + morningEnd.minute
  const eveningStartMinutes = eveningStart.hour * 60 + eveningStart.minute
  const eveningEndMinutes = eveningEnd.hour * 60 + eveningEnd.minute
  
  // Check if current time is in morning or evening peak
  return (
    (currentTimeInMinutes >= morningStartMinutes && currentTimeInMinutes < morningEndMinutes) ||
    (currentTimeInMinutes >= eveningStartMinutes && currentTimeInMinutes < eveningEndMinutes)
  )
}

/**
 * Holt die Fahrzeit aus dem Cache
 * Gibt die passende Zeit zurück (Peak oder Offpeak) basierend auf appointmentTime
 */
export async function getCachedTravelTime(
  fromPLZ: string,
  toPLZ: string,
  appointmentTime?: Date,
  peakSettings?: PeakTimeSettings
): Promise<number | null> {
  const supabase = getSupabaseClient()
  
  try {
    // Normalisiere PLZ (entferne Leerzeichen, etc.)
    const normalizedFromPLZ = fromPLZ.trim()
    const normalizedToPLZ = toPLZ.trim()
    
    // Suche in beide Richtungen (from->to und to->from)
    const { data, error } = await supabase
      .from('plz_distance_cache')
      .select('*')
      .or(`and(from_plz.eq.${normalizedFromPLZ},to_plz.eq.${normalizedToPLZ}),and(from_plz.eq.${normalizedToPLZ},to_plz.eq.${normalizedFromPLZ})`)
      .maybeSingle()
    
    if (error) {
      console.error('Error fetching PLZ distance cache:', error)
      return null
    }
    
    if (!data) {
      logger.debug(`No cache entry found for ${normalizedFromPLZ} -> ${normalizedToPLZ}`)
      return null
    }
    
    // Entscheide ob Peak oder Offpeak Zeit verwendet werden soll
    const usePeakTime = appointmentTime ? isPeakTime(appointmentTime, peakSettings) : false
    const travelTime = usePeakTime 
      ? data.driving_time_minutes_peak 
      : data.driving_time_minutes_offpeak
    
    logger.debug(`✅ Cache hit: ${normalizedFromPLZ} -> ${normalizedToPLZ} = ${travelTime} min (${usePeakTime ? 'Peak' : 'Offpeak'})`)
    
    return travelTime
  } catch (err) {
    console.error('Error in getCachedTravelTime:', err)
    return null
  }
}

/**
 * Speichert eine neue Fahrzeit im Cache
 * Ruft Google Distance Matrix API auf und speichert beide Zeiten (Peak & Offpeak)
 */
export async function cacheTravelTime(
  fromPLZ: string,
  toPLZ: string,
  googleApiKey: string
): Promise<{ peak: number; offpeak: number } | null> {
  try {
    const normalizedFromPLZ = fromPLZ.trim()
    const normalizedToPLZ = toPLZ.trim()
    
    logger.debug(`🔄 Fetching travel time via API: ${normalizedFromPLZ} -> ${normalizedToPLZ}`)
    
    // Use our server-side API endpoint to avoid CORS issues
    const response = await $fetch<{
      success: boolean
      fromPLZ: string
      toPLZ: string
      travelTime: number
      travelTimePeak?: number
      travelTimeOffpeak?: number
    }>('/api/pickup/check-distance', {
      method: 'POST',
      body: {
        fromPLZ: normalizedFromPLZ,
        toPLZ: normalizedToPLZ,
        appointmentTime: new Date().toISOString() // Current time for offpeak
      }
    })
    
    if (!response.success || response.travelTime === null) {
      console.error('API error:', response)
      return null
    }
    
    // The API already caches the result in the database
    const offpeakMinutes = response.travelTimeOffpeak || response.travelTime
    const peakMinutes = response.travelTimePeak || response.travelTime
    
    logger.debug(`✅ Travel time fetched: ${normalizedFromPLZ} -> ${normalizedToPLZ}`)
    logger.debug(`   Offpeak: ${offpeakMinutes} min`)
    logger.debug(`   Peak: ${peakMinutes} min`)
    
    return { peak: peakMinutes, offpeak: offpeakMinutes }
  } catch (err) {
    console.error('Error in cacheTravelTime:', err)
    return null
  }
}

// In-memory cache to avoid redundant API calls during validation
const inMemoryCache = new Map<string, { peak: number; offpeak: number; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Holt oder erstellt einen Cache-Eintrag
 * Versucht zuerst aus Cache zu lesen, bei Miss wird API aufgerufen
 */
export async function getTravelTime(
  fromPLZ: string,
  toPLZ: string,
  appointmentTime: Date,
  googleApiKey: string,
  peakSettings?: PeakTimeSettings
): Promise<number | null> {
  // Spezialfall: Gleiche PLZ = 0 Minuten
  if (fromPLZ === toPLZ) {
    logger.debug(`✅ Same PLZ (${fromPLZ}), returning 0 minutes`)
    return 0
  }
  
  // Check in-memory cache first (bidirectional)
  const cacheKey1 = `${fromPLZ}-${toPLZ}`
  const cacheKey2 = `${toPLZ}-${fromPLZ}`
  const now = Date.now()
  
  const cached1 = inMemoryCache.get(cacheKey1)
  const cached2 = inMemoryCache.get(cacheKey2)
  const cached = cached1 || cached2
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    const usePeakTime = isPeakTime(appointmentTime, peakSettings)
    const travelTime = usePeakTime ? cached.peak : cached.offpeak
    logger.debug(`✅ In-memory cache hit: ${fromPLZ} -> ${toPLZ} = ${travelTime} min`)
    return travelTime
  }
  
  // Versuche aus DB Cache zu lesen
  const cachedTime = await getCachedTravelTime(fromPLZ, toPLZ, appointmentTime, peakSettings)
  
  if (cachedTime !== null) {
    return cachedTime
  }
  
  // Cache Miss - rufe API auf (server-side to avoid CORS)
  logger.debug('Cache miss, calling API...')
  try {
    const response = await $fetch<{
      success: boolean
      travelTime: number
    }>('/api/pickup/check-distance', {
      method: 'POST',
      body: {
        fromPLZ,
        toPLZ,
        appointmentTime: appointmentTime.toISOString()
      },
      timeout: 10000 // 10 second timeout
    })
    
    if (response.success && response.travelTime !== null) {
      logger.debug(`✅ API returned: ${response.travelTime} min`)
      
      // Store in in-memory cache (assume peak = offpeak * 1.3 if not provided)
      const offpeak = response.travelTime
      const peak = Math.ceil(offpeak * 1.3)
      inMemoryCache.set(cacheKey1, { peak, offpeak, timestamp: now })
      
      return response.travelTime
    }
    
    console.warn('⚠️ API returned unsuccessful response')
    return null
  } catch (err: any) {
    console.error('❌ Error calling API:', err.message || err)
    // Bei Fehler: Pessimistisch annehmen dass es zu weit ist
    return null
  }
}

