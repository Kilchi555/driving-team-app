// Cron Job: Sync external calendars for all staff
// Called by Vercel scheduled cron (GET) or manual trigger with Bearer CRON_SECRET / x-api-key CRON_API_KEY

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { parseIcsBusyEvents } from '~/server/utils/parse-ics-busy-events'
import { logger } from '~/utils/logger'
import { sendEmail } from '~/server/utils/email'

const FAILURE_NOTIFY_THRESHOLD = 3 // notify admin after this many consecutive failures

async function notifyAdminBrokenCalendar(
  supabase: any,
  calendar: any,
  errorMsg: string,
) {
  const now = new Date()

  // Only notify once per 24h per calendar to avoid spam
  if (
    calendar.failure_notified_at &&
    now.getTime() - new Date(calendar.failure_notified_at).getTime() < 24 * 60 * 60 * 1000
  ) return

  // Load tenant + admin emails + branding
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, from_email, resend_domain_verified, primary_color, logo_wide_url, logo_url, logo_square_url')
    .eq('id', calendar.tenant_id)
    .single()

  const { data: admins } = await supabase
    .from('users')
    .select('email')
    .eq('tenant_id', calendar.tenant_id)
    .eq('role', 'admin')
    .not('email', 'is', null)
    .limit(3)

  const adminEmails = (admins || []).map((a: any) => a.email).filter(Boolean)
  if (adminEmails.length === 0) return

  const tenantName  = tenant?.name || 'Simy'
  const primaryColor = tenant?.primary_color || '#1e293b'
  const logoUrl = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
  const logoHtml = logoUrl
    ? `<div style="background:#fff;text-align:center;padding:20px 32px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:40px;max-width:180px;object-fit:contain;display:block;margin:0 auto"></div>`
    : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)">
${logoHtml}
<div style="background:${primaryColor};padding:24px 32px">
  <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700">⚠️ Kalender-Synchronisation fehlgeschlagen</h1>
</div>
<div style="padding:32px">
  <p>Der externe Kalender <strong>${calendar.calendar_name || 'Unbekannt'}</strong> konnte ${calendar.consecutive_failures + 1} Mal in Folge nicht synchronisiert werden.</p>
  <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;border-radius:4px;margin:16px 0">
    <strong>Fehler:</strong> ${errorMsg}
  </div>
  <p>Bitte überprüfe die Kalender-URL des Mitarbeitenden unter <strong>Admin → Mitarbeitende → Kalender</strong> und erneuere den Link.</p>
</div>
<div style="border-top:1px solid #f3f4f6;padding:16px 32px;font-size:12px;color:#9ca3af;text-align:center">${tenantName} · Powered by Simy.ch</div>
</div></body></html>`

  try {
    await sendEmail({
      to: adminEmails,
      subject: `Kalender-Sync fehlgeschlagen: ${calendar.calendar_name || 'Unbekannt'}`,
      html,
      fromName: tenantName,
      fromEmail: tenant?.from_email ?? null,
      domainVerified: tenant?.resend_domain_verified ?? false,
    })
    await supabase
      .from('external_calendars')
      .update({ failure_notified_at: now.toISOString() })
      .eq('id', calendar.id)
    logger.debug(`✅ Admin notified about broken calendar: ${calendar.calendar_name}`)
  } catch (e: any) {
    logger.warn('⚠️ Could not send broken calendar notification:', e.message)
  }
}

export default defineEventHandler(async (event) => {
  try {
    // ============ SECURITY: Accept x-vercel-cron, Bearer CRON_SECRET, or x-api-key CRON_API_KEY ============
    const vercelCronHeader = getHeader(event, 'x-vercel-cron')
    const authHeader = getHeader(event, 'authorization')
    const apiKey = getHeader(event, 'x-api-key')

    const cronSecret = process.env.CRON_SECRET
    const apiKeyEnv = process.env.CRON_API_KEY

    const isVercelCron = vercelCronHeader === '1'
    const isValidSecret = cronSecret && cronSecret.trim() !== '' && authHeader === `Bearer ${cronSecret}`
    const isValidApiKey = apiKeyEnv && apiKey === apiKeyEnv

    if (!isVercelCron && !isValidSecret && !isValidApiKey) {
      logger.warn('⚠️ sync-external-calendars cron called without valid auth')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - invalid or missing credentials'
      })
    }

    logger.info('🔄 Starting scheduled external calendar sync for all staff...')
    
    const supabase = getSupabaseAdmin()

    // ============ GET ALL EXTERNAL CALENDARS ============
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

    // ============ SYNC EACH CALENDAR ============
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
            const errMsg = `HTTP ${icsResponse.status}`
            logger.warn(`⚠️ Failed to fetch ICS for ${calendar.calendar_name}: ${errMsg}`)
            const newFailures = (calendar.consecutive_failures ?? 0) + 1
            await supabase.from('external_calendars').update({
              consecutive_failures: newFailures,
              last_fetch_error: errMsg,
              last_failure_at: new Date().toISOString(),
            }).eq('id', calendar.id)
            if (newFailures >= FAILURE_NOTIFY_THRESHOLD) {
              await notifyAdminBrokenCalendar(supabase, { ...calendar, consecutive_failures: newFailures - 1 }, errMsg)
            }
            failedCount++
            continue
          }

          icsData = await icsResponse.text()
          if (!icsData || icsData.length < 50) {
            const errMsg = 'Invalid/empty ICS response'
            logger.warn(`⚠️ Invalid ICS data for ${calendar.calendar_name}`)
            const newFailures = (calendar.consecutive_failures ?? 0) + 1
            await supabase.from('external_calendars').update({
              consecutive_failures: newFailures,
              last_fetch_error: errMsg,
              last_failure_at: new Date().toISOString(),
            }).eq('id', calendar.id)
            if (newFailures >= FAILURE_NOTIFY_THRESHOLD) {
              await notifyAdminBrokenCalendar(supabase, { ...calendar, consecutive_failures: newFailures - 1 }, errMsg)
            }
            failedCount++
            continue
          }
        } catch (fetchErr: any) {
          const errMsg = fetchErr.message || 'Fetch error'
          logger.warn(`⚠️ Error fetching ICS for ${calendar.calendar_name}:`, errMsg)
          const newFailures = (calendar.consecutive_failures ?? 0) + 1
          await supabase.from('external_calendars').update({
            consecutive_failures: newFailures,
            last_fetch_error: errMsg,
            last_failure_at: new Date().toISOString(),
          }).eq('id', calendar.id)
          if (newFailures >= FAILURE_NOTIFY_THRESHOLD) {
            await notifyAdminBrokenCalendar(supabase, { ...calendar, consecutive_failures: newFailures - 1 }, errMsg)
          }
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
          // Still update last_sync_at so we know the calendar was checked
          await supabase
            .from('external_calendars')
            .update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', calendar.id)
          syncedCount++
          continue
        }

        // Clear ALL existing busy times for this calendar (clean slate — handles deletions from Apple)
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
        const busyTimes = windowEvents.map(ev => {
          const formatUTCTime = (isoStr: string): string => {
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
            external_event_id: ((ev.uid || `event_${Date.now()}_${Math.random()}`) + '').slice(0, 255),
            event_title: 'Privat',
            start_time: formatUTCTime(ev.start),
            end_time: formatUTCTime(ev.end),
            sync_source: 'ics'
          }
          
          if (ev.location) {
            busyTime.event_location = ev.location
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

        // Update last sync time + reset failure counter on success
        await supabase
          .from('external_calendars')
          .update({
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            consecutive_failures: 0,
            last_fetch_error: null,
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
