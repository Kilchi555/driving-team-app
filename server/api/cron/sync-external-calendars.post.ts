// Cron Job: Sync external calendars for all staff
// Called by scheduled task, no user authentication required

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // ============ LAYER 1: API KEY VALIDATION ============
    const apiKey = getHeader(event, 'x-api-key')
    const expectedKey = process.env.CRON_API_KEY
    
    if (!apiKey || !expectedKey || apiKey !== expectedKey) {
      logger.warn('⚠️ Cron job called without valid API key')
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or missing API key'
      })
    }

    logger.info('🔄 Starting scheduled external calendar sync for all staff...')
    
    const supabase = getSupabaseAdmin()

    // ============ LAYER 2: GET ALL EXTERNAL CALENDARS ============
    const { data: calendars, error: calendarsError } = await supabase
      .from('external_calendars')
      .select('*')

    if (calendarsError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to load calendars: ${calendarsError.message}`
      })
    }

    if (!calendars || calendars.length === 0) {
      logger.info('ℹ️ No active external calendars to sync')
      return {
        success: true,
        message: 'No calendars to sync',
        synced_count: 0
      }
    }

    logger.info(`📋 Found ${calendars.length} calendars to sync`)

    let syncedCount = 0
    let failedCount = 0

    // ============ LAYER 3: SYNC EACH CALENDAR ============
    for (const calendar of calendars) {
      try {
        if (!calendar.ics_url) {
          logger.warn(`⚠️ Calendar ${calendar.id} has no ICS URL, skipping`)
          failedCount++
          continue
        }

        logger.debug(`🔄 Syncing calendar: ${calendar.calendar_name} (${calendar.id})`)

        // Fetch ICS data
        let icsData: string
        try {
          let fetchUrl = calendar.ics_url
          if (fetchUrl.startsWith('webcal://')) {
            fetchUrl = fetchUrl.replace('webcal://', 'https://')
          }

          const icsResponse = await fetch(fetchUrl, {
            headers: {
              'User-Agent': 'DrivingTeamApp-ICS-Sync/1.0',
              'Accept': 'text/calendar, text/plain, */*'
            },
            redirect: 'follow'
          })

          if (!icsResponse.ok) {
            logger.warn(`⚠️ Failed to fetch ICS for ${calendar.calendar_name}: ${icsResponse.status}`)
            failedCount++
            continue
          }

          icsData = await icsResponse.text()
          if (!icsData || icsData.length < 50) {
            logger.warn(`⚠️ Invalid ICS data for ${calendar.calendar_name}`)
            failedCount++
            continue
          }
        } catch (fetchErr: any) {
          logger.warn(`⚠️ Error fetching ICS for ${calendar.calendar_name}:`, fetchErr.message)
          failedCount++
          continue
        }

        // Parse ICS data
        const events = parseICSData(icsData)
        
        // Only sync relevant time window: now .. now + 1 year
        const now = new Date()
        const horizon = new Date(now)
        horizon.setFullYear(horizon.getFullYear() + 1)

        // Filter events to window (keep any event that overlaps the window)
        const windowEvents = events.filter(ev => {
          const evStart = new Date(ev.start)
          const evEnd = new Date(ev.end)
          return evEnd >= now && evStart <= horizon
        })

        if (windowEvents.length === 0) {
          logger.debug(`ℹ️ No events in sync window for ${calendar.calendar_name}`)
          syncedCount++
          continue
        }

        // Clear ALL existing busy times for this calendar (clean slate approach)
        // This ensures deletions in Apple Calendar are properly reflected
        const { error: clearError } = await supabase
          .from('external_busy_times')
          .delete()
          .eq('external_calendar_id', calendar.id)

        if (clearError) {
          logger.warn(`⚠️ Failed to clear busy times for ${calendar.calendar_name}:`, clearError.message)
          failedCount++
          continue
        }

        // Insert new busy times
        const busyTimes = windowEvents.map(event => {
          const convertToUTC = (isoStr: string): string => {
            const date = new Date(isoStr)
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
            external_calendar_id: calendar.id,
            external_event_id: ((event.uid || `event_${Date.now()}_${Math.random()}`) + '').slice(0, 255),
            event_title: 'Privat',
            start_time: convertToUTC(event.start),
            end_time: convertToUTC(event.end),
            sync_source: 'ics'
          }
          
          if (event.location) {
            busyTime.event_location = event.location
          }
          
          return busyTime
        })

        // Deduplicate
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
          logger.warn(`⚠️ Failed to insert busy times for ${calendar.calendar_name}:`, insertError.message)
          failedCount++
          continue
        }

        // Queue affected staff for availability recalculation
        try {
          await $fetch('/api/availability/queue-recalc', {
            method: 'POST',
            body: {
              staff_id: calendar.staff_id,
              tenant_id: calendar.tenant_id,
              trigger: 'external_event'
            }
          })
        } catch (queueErr: any) {
          logger.warn(`⚠️ Failed to queue staff for recalc:`, queueErr.message)
        }

        // Update last sync time
        await supabase
          .from('external_calendars')
          .update({ 
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', calendar.id)

        logger.info(`✅ Synced calendar: ${calendar.calendar_name} (${uniqueBusyTimes.length} events)`)
        syncedCount++

      } catch (err: any) {
        logger.error(`❌ Error syncing calendar ${calendar.id}:`, err.message)
        failedCount++
      }
    }

    logger.info(`🎉 External calendar sync complete: ${syncedCount} successful, ${failedCount} failed`)

    return {
      success: true,
      message: `Synced ${syncedCount} calendars, ${failedCount} failed`,
      synced_count: syncedCount,
      failed_count: failedCount
    }

  } catch (error: any) {
    logger.error('❌ Cron sync error:', error)
    return {
      success: false,
      message: 'Cron sync failed',
      error: error.message || 'Unknown error'
    }
  }
})

// Simple ICS parser (same as in sync-ics.post.ts)
function parseICSData(icsData: string): Array<{
  uid?: string
  summary?: string
  location?: string
  start: string
  end: string
}> {
  const events: Array<{
    uid?: string
    summary?: string
    location?: string
    start: string
    end: string
  }> = []

  const rawLines = icsData.replace(/\r\n/g, '\n').split('\n')
  const lines: string[] = []
  for (const raw of rawLines) {
    if (raw.startsWith(' ') || raw.startsWith('\t')) {
      if (lines.length > 0) {
        lines[lines.length - 1] += raw.slice(1)
      }
    } else {
      lines.push(raw)
    }
  }

  let currentEvent: any = {}
  let inEvent = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {}
    } else if (line === 'END:VEVENT') {
      // Only add event if it's NOT cancelled and has valid start/end
      if (inEvent && currentEvent.start && currentEvent.end && currentEvent.status !== 'CANCELLED') {
        events.push({
          uid: currentEvent.uid,
          summary: currentEvent.summary,
          location: currentEvent.location,
          start: currentEvent.start,
          end: currentEvent.end
        })
      }
      inEvent = false
      currentEvent = {}
    } else if (inEvent) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const prop = line.substring(0, colonIdx)
      const value = line.substring(colonIdx + 1)

      const [name, ...params] = prop.split(';')
      const upperName = name.toUpperCase()

      switch (upperName) {
        case 'UID':
          currentEvent.uid = value
          break
        case 'SUMMARY':
          currentEvent.summary = value
          break
        case 'LOCATION':
          currentEvent.location = value
          break
        case 'STATUS':
          // ✅ NEW: Track event status (CANCELLED events are deleted)
          currentEvent.status = value.toUpperCase()
          break
        case 'DTSTART': {
          const tzidParam = params.find(p => p.toUpperCase().startsWith('TZID='))
          const isDateOnly = params.some(p => p.toUpperCase().includes('VALUE=DATE'))
          currentEvent.start = parseICSTimestamp(value, { tzid: tzidParam?.split('=')[1], dateOnly: isDateOnly })
          break
        }
        case 'DTEND': {
          const tzidParam = params.find(p => p.toUpperCase().startsWith('TZID='))
          const isDateOnly = params.some(p => p.toUpperCase().includes('VALUE=DATE'))
          currentEvent.end = parseICSTimestamp(value, { tzid: tzidParam?.split('=')[1], dateOnly: isDateOnly })
          break
        }
        default:
          break
      }
    }
  }

  return events
}

function parseICSTimestamp(timestamp: string, opts?: { tzid?: string, dateOnly?: boolean }): string {
  const clean = timestamp.trim()
  
  if (opts?.dateOnly || (/^\d{8}$/.test(clean) && !clean.includes('T'))) {
    const year = clean.substring(0, 4)
    const month = clean.substring(4, 6)
    const day = clean.substring(6, 8)
    return `${year}-${month}-${day}T00:00:00`
  }

  if (/^\d{8}T\d{6}Z$/.test(clean)) {
    const year = clean.substring(0, 4)
    const month = clean.substring(4, 6)
    const day = clean.substring(6, 8)
    const hour = clean.substring(9, 11)
    const minute = clean.substring(11, 13)
    const second = clean.substring(13, 15)
    
    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
  }

  if (/^\d{8}T\d{6}$/.test(clean)) {
    const year = clean.substring(0, 4)
    const month = clean.substring(4, 6)
    const day = clean.substring(6, 8)
    const hour = clean.substring(9, 11)
    const minute = clean.substring(11, 13)
    const second = clean.substring(13, 15)
    
    const localTimeString = `${year}-${month}-${day}T${hour}:${minute}:${second}`
    
    if (opts?.tzid) {
      try {
        const dateAsUTC = new Date(`${localTimeString}Z`)
        const utcOffset = getUTCOffsetForTimezone(opts.tzid, dateAsUTC)
        const utcTime = dateAsUTC.getTime() - utcOffset
        const utcDate = new Date(utcTime)
        
        return utcDate.toISOString()
      } catch (e) {
        logger.warn(`⚠️ Failed to convert TZID ${opts.tzid}, falling back to UTC assumption`)
      }
    }
    
    return `${localTimeString}Z`
  }

  return new Date().toISOString()
}

function getUTCOffsetForTimezone(tzid: string, date: Date): number {
  try {
    const utcFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    const zoneFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tzid,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    const utcString = utcFormatter.format(date)
    const zoneString = zoneFormatter.format(date)
    
    const utcTime = new Date(utcString).getTime()
    const zoneTime = new Date(zoneString).getTime()
    
    return zoneTime - utcTime
  } catch (e) {
    logger.warn(`⚠️ Failed to calculate offset for ${tzid}`)
    return 0
  }
}
