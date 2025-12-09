import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()

    // Get all enabled external calendars that need syncing
    const { data: calendars, error: calendarsError } = await supabase
      .from('external_calendars')
      .select('*')
      .eq('sync_enabled', true)
      .or('last_sync_at.is.null,last_sync_at.lt.' + new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Sync if never synced or last sync > 1 hour ago

    if (calendarsError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch calendars: ${calendarsError.message}`
      })
    }

    if (!calendars || calendars.length === 0) {
      return {
        success: true,
        message: 'No calendars need syncing',
        synced_calendars: 0
      }
    }

    let syncedCount = 0
    const errors: string[] = []

    for (const calendar of calendars) {
      try {
        if (calendar.provider === 'ics' && calendar.ics_url) {
          // Sync ICS calendar
          const response = await fetch(`${getRequestURL(event).origin}/api/external-calendars/sync-ics`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              calendar_id: calendar.id,
              ics_url: calendar.ics_url
            })
          })

          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              syncedCount++
              logger.debug(`✅ Synced calendar ${calendar.id}: ${result.imported_events} events`)
            } else {
              errors.push(`Calendar ${calendar.id}: ${result.message}`)
            }
          } else {
            errors.push(`Calendar ${calendar.id}: HTTP ${response.status}`)
          }
        } else {
          // TODO: Implement OAuth sync for other providers
          logger.debug(`⏭️ Skipping OAuth calendar ${calendar.id} (not implemented)`)
        }
      } catch (err: any) {
        console.error(`❌ Error syncing calendar ${calendar.id}:`, err)
        errors.push(`Calendar ${calendar.id}: ${err.message}`)
      }
    }

    return {
      success: true,
      message: `Synced ${syncedCount} calendars`,
      synced_calendars: syncedCount,
      errors: errors.length > 0 ? errors : undefined
    }

  } catch (error: any) {
    console.error('Cron job error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Cron job failed: ${error.message}`
    })
  }
})
