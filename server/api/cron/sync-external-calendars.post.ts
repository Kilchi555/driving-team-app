// Cron Job: Sync external calendars for all staff
// Called by scheduled task, no user authentication required

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { createAvailabilitySlotManager } from '~/server/utils/availability-slot-manager'
import { parseIcsBusyEvents } from '~/server/utils/parse-ics-busy-events'
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
    const slotManager = createAvailabilitySlotManager(supabase)

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

        // Only sync relevant time window: now .. now + 1 year (RRULEs expanded inside)
        const now = new Date()
        const horizon = new Date(now)
        horizon.setFullYear(horizon.getFullYear() + 1)

        const rawEvents = parseIcsBusyEvents(icsData, { start: now, end: horizon })

        // ✅ SAFETY NET: Discard implausibly long events (e.g. accidental multi-month
        // entries from a mis-dragged end date in Apple Calendar). A single busy block
        // longer than MAX_BUSY_EVENT_DAYS would otherwise gray out the entire staff
        // calendar for that whole span, hiding all working hours.
        const MAX_BUSY_EVENT_MS = 14 * 24 * 60 * 60 * 1000 // 14 days
        const windowEvents = rawEvents.filter(ev => {
          const durationMs = new Date(ev.end).getTime() - new Date(ev.start).getTime()
          if (durationMs > MAX_BUSY_EVENT_MS) {
            logger.warn(`⚠️ Skipping implausibly long ICS event for ${calendar.calendar_name} (${Math.round(durationMs / 86400000)} days): "${ev.summary || 'untitled'}" ${ev.start} → ${ev.end}`)
            return false
          }
          return true
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

        // Immediately invalidate overlapping availability slots for all newly synced events
        // This prevents a ~5 minute booking window while waiting for queue-recalc to run
        try {
          for (const bt of uniqueBusyTimes) {
            await slotManager.invalidateSlots(
              calendar.staff_id,
              bt.start_time,
              bt.end_time,
              calendar.tenant_id
            )
          }
          logger.debug(`✅ Invalidated slots for ${uniqueBusyTimes.length} busy times`)
        } catch (slotErr: any) {
          logger.warn(`⚠️ Failed to invalidate slots for ${calendar.calendar_name} (non-critical):`, slotErr.message)
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
