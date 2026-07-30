/**
 * Shared external-calendar sync used by the Vercel cron (GET/POST).
 * Designed for Pro-plan limits: 60s maxDuration + finite memory.
 */

import {
  resolveExternalEventTitle,
  shouldAnonymizeExternalEventTitles,
} from '~/server/utils/external-calendar-privacy'
import { parseIcsBusyEvents } from '~/server/utils/parse-ics-busy-events'
import { probeIcsUrl } from '~/server/utils/probe-ics-url'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

export const FAILURE_NOTIFY_THRESHOLD = 3
/** After this many consecutive failures, only retry on backoff cadence (not every 15 min). */
export const FAILURE_BACKOFF_THRESHOLD = 5
const FAILURE_BACKOFF_MS = 6 * 60 * 60 * 1000 // 6h
/** Leave headroom under Vercel's 60s kill. */
export const SYNC_TIME_BUDGET_MS = 50_000
export const MAX_BUSY_EVENT_MS = 14 * 24 * 60 * 60 * 1000 // 14 days
export const UPSERT_BATCH_SIZE = 100
/** Booking-relevant window — shorter than 1y to limit RRULE expansion / memory. */
export const SYNC_HORIZON_DAYS = 180

export type SyncCalendarResult =
  | { status: 'synced'; events: number }
  | { status: 'failed'; error: string }
  | { status: 'skipped'; reason: string }

function formatUTCTime(isoStr: string): string {
  const date = new Date(isoStr)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}+00`
}

export function shouldSkipBrokenCalendar(calendar: {
  consecutive_failures?: number | null
  last_failure_at?: string | null
}): boolean {
  const failures = calendar.consecutive_failures ?? 0
  if (failures < FAILURE_BACKOFF_THRESHOLD) return false
  if (!calendar.last_failure_at) return false
  const age = Date.now() - new Date(calendar.last_failure_at).getTime()
  return age < FAILURE_BACKOFF_MS
}

export async function notifyAdminBrokenCalendar(
  supabase: any,
  calendar: any,
  errorMsg: string,
) {
  const now = new Date()

  if (
    calendar.failure_notified_at &&
    now.getTime() - new Date(calendar.failure_notified_at).getTime() < 24 * 60 * 60 * 1000
  ) return

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

  const tenantName = tenant?.name || 'Simy'
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

async function recordFailure(
  supabase: any,
  calendar: any,
  errMsg: string,
  notify: boolean,
) {
  const newFailures = (calendar.consecutive_failures ?? 0) + 1
  await supabase.from('external_calendars').update({
    consecutive_failures: newFailures,
    last_fetch_error: errMsg,
    last_failure_at: new Date().toISOString(),
  }).eq('id', calendar.id)

  if (notify && newFailures >= FAILURE_NOTIFY_THRESHOLD) {
    await notifyAdminBrokenCalendar(
      supabase,
      { ...calendar, consecutive_failures: newFailures - 1 },
      errMsg,
    )
  }
}

async function queueStaffRecalc(supabase: any, staffId: string, tenantId: string) {
  const { error } = await supabase
    .from('availability_recalc_queue')
    .upsert(
      {
        staff_id: staffId,
        tenant_id: tenantId,
        trigger: 'external_event',
        queued_at: new Date().toISOString(),
        processed: false,
      },
      { onConflict: 'staff_id,tenant_id' },
    )
  if (error) {
    logger.warn(`⚠️ Failed to queue staff for recalc:`, error.message)
  }
}

/**
 * Sync a single external calendar. Caller owns time-budget / orchestration.
 */
export async function syncOneExternalCalendar(
  supabase: any,
  calendar: any,
  anonymizeCache: Map<string, boolean>,
  opts: { notifyOnFailure?: boolean } = {},
): Promise<SyncCalendarResult> {
  const notify = opts.notifyOnFailure !== false

  if (!calendar.ics_url) {
    return { status: 'skipped', reason: 'no_ics_url' }
  }

  if (shouldSkipBrokenCalendar(calendar)) {
    return { status: 'skipped', reason: 'failure_backoff' }
  }

  const probe = await probeIcsUrl(calendar.ics_url)
  if (!probe.ok) {
    logger.warn(`⚠️ Failed to fetch ICS for ${calendar.calendar_name}: ${probe.code} — ${probe.message}`)
    await recordFailure(supabase, calendar, probe.message, notify)
    return { status: 'failed', error: probe.message }
  }

  if (probe.url !== calendar.ics_url) {
    await supabase
      .from('external_calendars')
      .update({ ics_url: probe.url })
      .eq('id', calendar.id)
  }

  let icsData = probe.body

  const now = new Date()
  const horizon = new Date(now)
  horizon.setDate(horizon.getDate() + SYNC_HORIZON_DAYS)

  let rawEvents
  try {
    rawEvents = parseIcsBusyEvents(icsData, { start: now, end: horizon })
  } finally {
    // Help GC: drop the raw feed before building DB rows
    icsData = ''
  }

  const windowEvents = rawEvents.filter((ev) => {
    const durationMs = new Date(ev.end).getTime() - new Date(ev.start).getTime()
    if (durationMs > MAX_BUSY_EVENT_MS) {
      logger.warn(
        `⚠️ Skipping implausibly long ICS event for ${calendar.calendar_name} (${Math.round(durationMs / 86400000)} days): "${ev.summary || 'untitled'}" ${ev.start} → ${ev.end}`,
      )
      return false
    }
    return true
  })

  if (windowEvents.length === 0) {
    logger.debug(`ℹ️ No events in sync window for ${calendar.calendar_name}`)
    await supabase
      .from('external_calendars')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        consecutive_failures: 0,
        last_fetch_error: null,
      })
      .eq('id', calendar.id)
    return { status: 'synced', events: 0 }
  }

  const { error: clearError } = await supabase
    .from('external_busy_times')
    .delete()
    .eq('external_calendar_id', calendar.id)

  if (clearError) {
    logger.warn(`⚠️ Failed to clear busy times for ${calendar.calendar_name}:`, clearError.message)
    return { status: 'failed', error: clearError.message }
  }

  const anonymizeTitles = await shouldAnonymizeExternalEventTitles(
    supabase,
    calendar.tenant_id,
    anonymizeCache,
  )

  const busyTimes = windowEvents.map((ev) => {
    const busyTime: any = {
      tenant_id: calendar.tenant_id,
      staff_id: calendar.staff_id,
      external_calendar_id: calendar.id,
      external_event_id: ((ev.uid || `event_${Date.now()}_${Math.random()}`) + '').slice(0, 255),
      event_title: resolveExternalEventTitle(ev.summary, anonymizeTitles),
      start_time: formatUTCTime(ev.start),
      end_time: formatUTCTime(ev.end),
      sync_source: 'ics',
    }
    if (ev.location) busyTime.event_location = ev.location
    return busyTime
  })

  const uniqueMap = new Map<string, (typeof busyTimes)[number]>()
  for (const bt of busyTimes) {
    const key = `${bt.tenant_id}|${bt.staff_id}|${bt.external_calendar_id}|${bt.external_event_id}|${bt.start_time}`
    if (!uniqueMap.has(key)) uniqueMap.set(key, bt)
  }
  const uniqueBusyTimes = Array.from(uniqueMap.values())

  for (let i = 0; i < uniqueBusyTimes.length; i += UPSERT_BATCH_SIZE) {
    const batch = uniqueBusyTimes.slice(i, i + UPSERT_BATCH_SIZE)
    const { error: insertError } = await supabase
      .from('external_busy_times')
      .upsert(batch, {
        onConflict: 'tenant_id,staff_id,external_calendar_id,external_event_id,start_time',
      })
    if (insertError) {
      logger.warn(`⚠️ Failed to insert busy times for ${calendar.calendar_name}:`, insertError.message)
      return { status: 'failed', error: insertError.message }
    }
  }

  await queueStaffRecalc(supabase, calendar.staff_id, calendar.tenant_id)

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
  return { status: 'synced', events: uniqueBusyTimes.length }
}

export async function runExternalCalendarsSyncJob(
  supabase: any,
  opts: { notifyOnFailure?: boolean } = {},
) {
  const startedAt = Date.now()

  const { data: calendars, error: calendarsError } = await supabase
    .from('external_calendars')
    .select('*')
    // Stalest first so a partial run still advances the queue across cron ticks
    .order('last_sync_at', { ascending: true, nullsFirst: true })

  if (calendarsError) {
    throw new Error(`Failed to load calendars: ${calendarsError.message}`)
  }

  if (!calendars || calendars.length === 0) {
    return {
      success: true,
      message: 'No calendars to sync',
      synced_count: 0,
      failed_count: 0,
      skipped_count: 0,
      remaining: 0,
    }
  }

  logger.info(`📋 Found ${calendars.length} calendars to sync`)

  let syncedCount = 0
  let failedCount = 0
  let skippedCount = 0
  let processed = 0
  const anonymizeCache = new Map<string, boolean>()

  for (const calendar of calendars) {
    if (Date.now() - startedAt > SYNC_TIME_BUDGET_MS) {
      logger.warn(
        `⏱️ Time budget reached after ${processed}/${calendars.length} calendars — remaining deferred to next cron`,
      )
      break
    }

    try {
      const result = await syncOneExternalCalendar(supabase, calendar, anonymizeCache, opts)
      processed++
      if (result.status === 'synced') syncedCount++
      else if (result.status === 'failed') failedCount++
      else skippedCount++
    } catch (err: any) {
      logger.error(`❌ Error syncing calendar ${calendar.id}:`, err.message)
      failedCount++
      processed++
    }
  }

  const remaining = Math.max(0, calendars.length - processed)
  logger.info(
    `🎉 External calendar sync complete: ${syncedCount} synced, ${failedCount} failed, ${skippedCount} skipped, ${remaining} deferred (${Date.now() - startedAt}ms)`,
  )

  return {
    success: true,
    message: `Synced ${syncedCount}, failed ${failedCount}, skipped ${skippedCount}, deferred ${remaining}`,
    synced_count: syncedCount,
    failed_count: failedCount,
    skipped_count: skippedCount,
    remaining,
    duration_ms: Date.now() - startedAt,
  }
}
