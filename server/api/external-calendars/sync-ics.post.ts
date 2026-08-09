import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { resolvePLZForExternalBusyTime } from '~/utils/postalCodeUtils'
import { parseIcsBusyEvents } from '~/server/utils/parse-ics-busy-events'
import {
  resolveExternalEventTitle,
  shouldAnonymizeExternalEventTitles,
} from '~/server/utils/external-calendar-privacy'
import { probeIcsUrl } from '~/server/utils/probe-ics-url'
import { humanizeIcsFetchError } from '~/utils/ics-url'
import { SYNC_LOOKBACK_DAYS } from '~/server/utils/sync-external-calendars-job'
import { logger } from '~/utils/logger'

interface ICSImportRequest {
  calendar_id: string
  ics_url?: string
  ics_content?: string
}

interface ICSImportResponse {
  success: boolean
  message: string
  imported_events?: number
  error?: string
}

export default defineEventHandler(async (event): Promise<ICSImportResponse> => {
  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const body = await readBody(event) as ICSImportRequest
    const { calendar_id, ics_url, ics_content } = body

    if (!calendar_id || (!ics_url && !ics_content)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'calendar_id and (ics_url or ics_content) are required'
      })
    }

    const supabase = getSupabaseAdmin()

    // ============ LAYER 2: GET USER PROFILE ============
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User profile not found'
      })
    }

    // ============ LAYER 3: GET CALENDAR & VERIFY OWNERSHIP ============
    const { data: calendar, error: calendarError } = await supabase
      .from('external_calendars')
      .select('*')
      .eq('id', calendar_id)
      .single()

    if (calendarError || !calendar) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Calendar not found'
      })
    }

    // ✅ CRITICAL: Verify user owns this calendar
    if (calendar.staff_id !== userProfile.id || calendar.tenant_id !== userProfile.tenant_id) {
      logger.warn('⚠️ Unauthorized calendar sync attempt', {
        calendarId: calendar_id,
        userId: userProfile.id,
        calendarStaffId: calendar.staff_id
      })
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to sync this calendar'
      })
    }

    // Obtain ICS data either from content or by fetching URL
    let icsData: string
    if (ics_content && ics_content.trim().length > 0) {
      icsData = ics_content
      if (!icsData.includes('BEGIN:VCALENDAR')) {
        const human = humanizeIcsFetchError('Response is not a VCALENDAR (HTML or wrong URL?)')
        throw createError({
          statusCode: 400,
          statusMessage: human.tip ? `${human.message} ${human.tip}` : human.message,
        })
      }
    } else {
      const probe = await probeIcsUrl(ics_url as string)
      if (!probe.ok) {
        await supabase.from('external_calendars').update({
          consecutive_failures: (calendar.consecutive_failures ?? 0) + 1,
          last_fetch_error: probe.message,
          last_failure_at: new Date().toISOString(),
        }).eq('id', calendar_id)

        throw createError({
          statusCode: 400,
          statusMessage: probe.tip ? `${probe.message} ${probe.tip}` : probe.message,
        })
      }

      icsData = probe.body

      if (probe.url !== calendar.ics_url) {
        await supabase
          .from('external_calendars')
          .update({ ics_url: probe.url })
          .eq('id', calendar_id)
      }
    }
    
    // Sync window: last 3 months .. now + 1 year (RRULEs expanded inside)
    const now = new Date()
    const windowStart = new Date(now)
    windowStart.setDate(windowStart.getDate() - SYNC_LOOKBACK_DAYS)
    const horizon = new Date(now)
    horizon.setFullYear(horizon.getFullYear() + 1)

    const rawEvents = parseIcsBusyEvents(icsData, { start: windowStart, end: horizon })

    // ✅ SAFETY NET: Discard implausibly long events (e.g. accidental multi-month
    // entries from a mis-dragged end date in Apple Calendar). A single busy block
    // longer than MAX_BUSY_EVENT_DAYS would otherwise gray out the entire staff
    // calendar for that whole span, hiding all working hours.
    const MAX_BUSY_EVENT_MS = 14 * 24 * 60 * 60 * 1000 // 14 days
    const windowEvents = rawEvents.filter(ev => {
      const durationMs = new Date(ev.end).getTime() - new Date(ev.start).getTime()
      if (durationMs > MAX_BUSY_EVENT_MS) {
        logger.warn(`⚠️ Skipping implausibly long ICS event (${Math.round(durationMs / 86400000)} days): "${ev.summary || 'untitled'}" ${ev.start} → ${ev.end}`)
        return false
      }
      return true
    })

    if (windowEvents.length === 0) {
      logger.warn(`⚠️ Empty ICS feed (0 events) for calendar ${calendar_id}`)
      await supabase
        .from('external_calendars')
        .update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          consecutive_failures: 0,
          last_fetch_error:
            'EMPTY_CALENDAR: Kalender-Feed enthält keine Termine. Vermutlich wurde ein leerer Kalender geteilt — bitte den Kalender mit den echten Terminen öffentlich teilen und den neuen Link verbinden.',
        })
        .eq('id', calendar_id)

      return {
        success: false,
        message: 'Kalender-Feed enthält keine Termine',
        tip: 'Du hast vermutlich einen leeren Kalender geteilt. Teile in iCloud den Kalender mit deinen echten Terminen und verbinde den neuen Link.',
        imported_events: 0,
        code: 'empty_calendar',
      }
    }

    // Clear existing busy times for this calendar within window
    const { error: clearError } = await supabase
      .from('external_busy_times')
      .delete()
      .eq('external_calendar_id', calendar_id)
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', horizon.toISOString())
    if (clearError) {
      throw createError({ statusCode: 500, statusMessage: `Failed to clear busy times: ${clearError.message}` })
    }

    const anonymizeTitles = await shouldAnonymizeExternalEventTitles(
      supabase,
      calendar.tenant_id,
    )

    // Insert new busy times (titles anonymized only if tenant setting is on; default: real titles)
    const busyTimes = windowEvents.map(event => {
      // Convert to UTC for consistent storage with appointments
      // ICS events can be in various formats (local or UTC)
      const convertToUTC = (isoStr: string): string => {
        // Parse the ISO string as a UTC date
        const date = new Date(isoStr)
        
        // Format as UTC ISO string (YYYY-MM-DD HH:MM:SS+00)
        const year = date.getUTCFullYear()
        const month = String(date.getUTCMonth() + 1).padStart(2, '0')
        const day = String(date.getUTCDate()).padStart(2, '0')
        const hours = String(date.getUTCHours()).padStart(2, '0')
        const minutes = String(date.getUTCMinutes()).padStart(2, '0')
        const seconds = String(date.getUTCSeconds()).padStart(2, '0')
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}+00`
      }
      
      const busyTime: any = {
        tenant_id: calendar.tenant_id,
        staff_id: calendar.staff_id,
        external_calendar_id: calendar_id,
        external_event_id: ((event.uid || `event_${Date.now()}_${Math.random()}`) + '').slice(0, 255),
        event_title: resolveExternalEventTitle(event.summary, anonymizeTitles),
        start_time: convertToUTC(event.start),
        end_time: convertToUTC(event.end),
        sync_source: 'ics'
      }
      
      // If event has a specific location, store it for PLZ resolution
      if (event.location) {
        busyTime.event_location = event.location
      } else if (calendar.default_postal_code) {
        // No event-specific location → use calendar's default PLZ directly
        // This enables travel time conflict detection for location-less events (e.g. "Privat")
        busyTime.postal_code = calendar.default_postal_code
      }
      
      return busyTime
    })
    
    // Resolve postal codes for all busy times (will be populated after initial insert)
    // This happens asynchronously to not block the sync
    
    // Deduplicate by conflict key to avoid "ON CONFLICT ... cannot affect row a second time"
    const uniqueMap = new Map<string, typeof busyTimes[number]>()
    for (const bt of busyTimes) {
      const key = `${bt.tenant_id}|${bt.staff_id}|${bt.external_calendar_id}|${bt.external_event_id}|${bt.start_time}`
      if (!uniqueMap.has(key)) uniqueMap.set(key, bt)
    }
    const uniqueBusyTimes = Array.from(uniqueMap.values())

    const { error: insertError } = await supabase
      .from('external_busy_times')
      .upsert(uniqueBusyTimes, {
        onConflict: 'tenant_id,staff_id,external_calendar_id,external_event_id,start_time'
      })

    if (insertError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to insert busy times: ${insertError.message}`
      })
    }

    // ✅ NEW: Queue affected staff for availability recalculation
    const affectedStaffIds = [...new Set(uniqueBusyTimes.map(bt => bt.staff_id))]
    logger.debug(`📋 Queueing ${affectedStaffIds.length} staff for recalculation after external events sync`)
    
    for (const staffId of affectedStaffIds) {
      try {
        await $fetch('/api/availability/queue-recalc', {
          method: 'POST',
          body: {
            staff_id: staffId,
            tenant_id: calendar.tenant_id,
            trigger: 'external_event'
          }
        })
      } catch (queueError: any) {
        logger.warn(`⚠️ Failed to queue staff ${staffId} for recalc:`, queueError.message)
      }
    }
    
    // Asynchronously resolve and update postal codes for events with locations
    if (uniqueBusyTimes.some(bt => bt.event_location)) {
      logger.debug('📍 Resolving postal codes for external busy times...')
      
      // Don't await this - let it process in background
      ;(async () => {
        try {
          for (const busyTime of uniqueBusyTimes) {
            if (busyTime.event_location) {
              // Call the geocoding API directly for server-side processing
              try {
                logger.debug(`🌐 Resolving PLZ for: "${busyTime.event_location}"`)
                
                // Import and use the geocoding resolution function
                const { extractPLZFromAddress, lookupPLZFromLocationName } = await import('~/utils/postalCodeUtils')
                
                // Try extraction first
                let plz = extractPLZFromAddress(busyTime.event_location)
                logger.debug(`📝 Extraction attempt: "${busyTime.event_location}" → ${plz || 'no match'}`)
                
                // Try DB lookup next
                if (!plz) {
                  plz = await lookupPLZFromLocationName(busyTime.event_location, calendar.tenant_id, supabase)
                  logger.debug(`🔍 DB lookup attempt: "${busyTime.event_location}" → ${plz || 'no match'}`)
                }
                
                // Try Google API as fallback
                if (!plz) {
                  logger.debug(`🌐 Attempting Google Geocoding API for: "${busyTime.event_location}"`)
                  try {
                    const GOOGLE_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY
                    if (!GOOGLE_API_KEY) {
                      console.warn('⚠️ GOOGLE_GEOCODING_API_KEY not configured')
                    } else {
                      const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(busyTime.event_location)}&key=${GOOGLE_API_KEY}`
                      const response = await fetch(googleUrl)
                      const data = await response.json()
                      
                      if (data.status === 'OK' && data.results.length > 0) {
                        const result = data.results[0]
                        for (const component of result.address_components) {
                          if (component.types.includes('postal_code')) {
                            plz = component.short_name
                            logger.debug(`✅ Google API resolved: "${busyTime.event_location}" → ${plz}`)
                            break
                          }
                        }
                      }
                    }
                  } catch (googleErr: any) {
                    console.warn(`⚠️ Google Geocoding failed:`, googleErr.message)
                  }
                }
                
                if (plz) {
                  // Update the busy time with resolved PLZ
                  const { error: updateError } = await supabase
                    .from('external_busy_times')
                    .update({ postal_code: plz })
                    .eq('external_event_id', busyTime.external_event_id)
                    .eq('staff_id', busyTime.staff_id)
                  
                  if (updateError) {
                    console.warn(`⚠️  Failed to update PLZ for ${busyTime.event_location}:`, updateError)
                  } else {
                    logger.debug(`✅ Updated PLZ: ${busyTime.event_location} → ${plz}`)
                  }
                } else {
                  console.warn(`❌ Could not resolve PLZ for: "${busyTime.event_location}"`)
                }
              } catch (err: any) {
                console.error(`❌ Error resolving PLZ for ${busyTime.event_location}:`, err.message)
              }
            }
          }
        } catch (err: any) {
          console.error('❌ Error in postal code resolution loop:', err)
        }
      })()
    }

    // Update last sync time
    const { error: updateError } = await supabase
      .from('external_calendars')
      .update({ 
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', calendar_id)
    if (updateError) {
      throw createError({ statusCode: 500, statusMessage: `Failed to update calendar: ${updateError.message}` })
    }

    return {
      success: true,
      message: `Imported ${uniqueBusyTimes.length} events (next 60 days)`,
      imported_events: uniqueBusyTimes.length
    }

  } catch (error: any) {
    console.error('ICS Import Error:', error)
    return {
      success: false,
      message: 'Failed to import ICS data',
      error: error.message || 'Unknown error'
    }
  }
})
