/**
 * API Endpoint: Check Pickup Distance
 * Prüft ob eine PLZ innerhalb des Pickup-Radius liegt
 * Verwendet PLZ Distance Cache mit Peak/Offpeak Zeiten
 * Berücksichtigt staff-spezifische Peak-Time Settings
 */

import { getCachedTravelTime, isPeakTime } from '~/utils/plzDistanceCache'
import type { PeakTimeSettings } from '~/utils/plzDistanceCache'
import { getSupabaseAdmin } from '~/utils/supabase'

/**
 * Calls Google Distance Matrix API directly (server-side only)
 */
async function callGoogleDistanceMatrixAPI(
  fromPLZ: string,
  toPLZ: string,
  appointmentTime: Date,
  googleApiKey: string
): Promise<{ peak: number; offpeak: number } | null> {
  try {
    const origin = `${fromPLZ}, Switzerland`
    const destination = `${toPLZ}, Switzerland`
    
    // Call for offpeak time (current time)
    const offpeakUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=driving&language=de&key=${googleApiKey}`
    
    logger.debug('🌐 Calling Google Distance Matrix API (offpeak)...')
    const offpeakResponse = await $fetch(offpeakUrl)
    
    if (offpeakResponse.status !== 'OK' || !offpeakResponse.rows?.[0]?.elements?.[0]) {
      console.error('❌ Google API error (offpeak):', offpeakResponse)
      return null
    }
    
    const offpeakElement = offpeakResponse.rows[0].elements[0]
    if (offpeakElement.status !== 'OK') {
      console.error('❌ No route found (offpeak):', offpeakElement.status)
      return null
    }
    
    const offpeakMinutes = Math.ceil(offpeakElement.duration.value / 60)
    
    // Call for peak time (with traffic model)
    const peakTime = new Date(appointmentTime)
    peakTime.setHours(8, 0, 0, 0) // 8 AM next day for peak traffic
    if (peakTime <= new Date()) {
      peakTime.setDate(peakTime.getDate() + 1)
    }
    
    const peakUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=driving&departure_time=${Math.floor(peakTime.getTime() / 1000)}&traffic_model=pessimistic&language=de&key=${googleApiKey}`
    
    logger.debug('🌐 Calling Google Distance Matrix API (peak)...')
    const peakResponse = await $fetch(peakUrl)
    
    let peakMinutes = offpeakMinutes
    if (peakResponse.status === 'OK' && peakResponse.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const peakElement = peakResponse.rows[0].elements[0]
      if (peakElement.duration_in_traffic) {
        peakMinutes = Math.ceil(peakElement.duration_in_traffic.value / 60)
      }
    }
    
    logger.debug(`✅ Google API results: offpeak=${offpeakMinutes} min, peak=${peakMinutes} min`)
    
    // Save to database cache
    const supabase = getSupabaseAdmin()
    logger.debug(`💾 Saving to DB cache: ${fromPLZ} -> ${toPLZ}`)
    const { error: dbError } = await supabase
      .from('plz_distance_cache')
      .upsert({
        from_plz: fromPLZ,
        to_plz: toPLZ,
        driving_time_minutes: offpeakMinutes, // Legacy column (still required)
        driving_time_minutes_offpeak: offpeakMinutes,
        driving_time_minutes_peak: peakMinutes,
        distance_km: Math.round(offpeakElement.distance.value / 1000),
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'from_plz,to_plz'
      })
    
    if (dbError) {
      console.error('❌ Error saving to DB cache:', dbError)
    } else {
      logger.debug(`✅ Saved to DB cache: ${fromPLZ} -> ${toPLZ}`)
    }
    
    return { peak: peakMinutes, offpeak: offpeakMinutes }
  } catch (error: any) {
    console.error('❌ Error calling Google API:', error)
    return null
  }
}

export default defineEventHandler(async (event) => {
  try {
    logger.debug('=' .repeat(80))
    logger.debug('🔍 PICKUP DISTANCE CHECK API CALLED')
    logger.debug('=' .repeat(80))
    
    const body = await readBody(event)
    logger.debug('📦 Request body:', JSON.stringify(body, null, 2))
    
    const { fromPLZ, toPLZ, appointmentTime, staffId } = body

    // Validierung
    if (!fromPLZ || !toPLZ) {
      console.error('❌ Missing PLZ parameters')
      throw createError({
        statusCode: 400,
        message: 'fromPLZ and toPLZ are required'
      })
    }

    // Normalisiere PLZ (entferne Leerzeichen, etc.)
    const normalizedFromPLZ = fromPLZ.toString().trim()
    const normalizedToPLZ = toPLZ.toString().trim()

    // Validiere PLZ Format (4 Ziffern für Schweiz)
    const plzRegex = /^\d{4}$/
    if (!plzRegex.test(normalizedFromPLZ) || !plzRegex.test(normalizedToPLZ)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid PLZ format. Swiss PLZ must be 4 digits.'
      })
    }

    // Parse appointment time
    const appointmentDate = appointmentTime ? new Date(appointmentTime) : new Date()

    // Load staff peak time settings if staffId is provided
    let peakSettings = undefined
    if (staffId) {
      const supabase = getSupabaseAdmin()
      const { data: staffSettings } = await supabase
        .from('staff_availability_settings')
        .select('peak_time_morning_start, peak_time_morning_end, peak_time_evening_start, peak_time_evening_end')
        .eq('staff_id', staffId)
        .single()
      
      if (staffSettings) {
        peakSettings = {
          morning_start: staffSettings.peak_time_morning_start || '07:00',
          morning_end: staffSettings.peak_time_morning_end || '09:00',
          evening_start: staffSettings.peak_time_evening_start || '17:00',
          evening_end: staffSettings.peak_time_evening_end || '19:00'
        }
        logger.debug('📅 Using staff-specific peak settings:', peakSettings)
      }
    }

    // Get Google API Key from runtime config
    const config = useRuntimeConfig()
    logger.debug('🔑 Runtime config keys available:', Object.keys(config))
    
    const googleApiKey = config.googleMapsApiKey
    logger.debug('🔑 Google API Key present:', !!googleApiKey)
    
    if (!googleApiKey) {
      console.error('❌ GOOGLE_MAPS_API_KEY not configured in runtime config')
      throw createError({
        statusCode: 500,
        message: 'Google Maps API key not configured'
      })
    }

    // Special case: same PLZ = 0 minutes
    if (normalizedFromPLZ === normalizedToPLZ) {
      logger.debug(`✅ Same PLZ (${normalizedFromPLZ}), returning 0 minutes`)
      return {
        success: true,
        fromPLZ: normalizedFromPLZ,
        toPLZ: normalizedToPLZ,
        travelTime: 0,
        appointmentTime: appointmentDate.toISOString()
      }
    }

    // Check cache first
    logger.debug('🔍 Checking cache...')
    const cachedTime = await getCachedTravelTime(normalizedFromPLZ, normalizedToPLZ, appointmentDate, peakSettings)
    
    if (cachedTime !== null) {
      logger.debug(`✅ Cache hit: ${normalizedFromPLZ} -> ${normalizedToPLZ} = ${cachedTime} min`)
      return {
        success: true,
        fromPLZ: normalizedFromPLZ,
        toPLZ: normalizedToPLZ,
        travelTime: cachedTime,
        appointmentTime: appointmentDate.toISOString()
      }
    }

    // Cache miss - call Google API directly
    logger.debug(`🌐 Cache miss, calling Google API: ${normalizedFromPLZ} -> ${normalizedToPLZ}`)
    const result = await callGoogleDistanceMatrixAPI(normalizedFromPLZ, normalizedToPLZ, appointmentDate, googleApiKey)

    if (!result) {
      throw createError({
        statusCode: 500,
        message: 'Could not calculate travel time from Google API'
      })
    }

    // Determine which time to return based on peak settings
    const usePeakTime = isPeakTime(appointmentDate, peakSettings)
    const travelTime = usePeakTime ? result.peak : result.offpeak

    logger.debug(`✅ Travel time: ${normalizedFromPLZ} -> ${normalizedToPLZ} = ${travelTime} min (${usePeakTime ? 'peak' : 'offpeak'})`)

    return {
      success: true,
      fromPLZ: normalizedFromPLZ,
      toPLZ: normalizedToPLZ,
      travelTime,
      appointmentTime: appointmentDate.toISOString()
    }
  } catch (error: any) {
    console.error('❌ Error in check-distance API:', error)
    console.error('❌ Error stack:', error.stack)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error',
      data: {
        error: error.toString(),
        stack: error.stack
      }
    })
  }
})

