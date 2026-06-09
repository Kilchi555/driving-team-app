/**
 * Cron Job: Lock accounting entries older than 30 days
 * Runs daily at 02:30 via Vercel Cron
 *
 * OR Art. 957a: Buchungen müssen unveränderbar sein.
 * Nach 30 Tagen werden alle Buchungen automatisch gesperrt.
 * Korrekturen sind danach nur noch via Storno-Buchung möglich.
 */

import { logger } from '~/utils/logger'
import { getSupabaseAdmin } from '~/utils/supabase'
import { verifyCronToken, checkCronRateLimit, logCronExecution } from '~/server/utils/cron'

export default defineEventHandler(async (event) => {
  const startTime = new Date()

  try {
    if (!verifyCronToken(event)) {
      logger.error('🚨 Unauthorized cron request to lock-accounting-entries')
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized - Invalid cron token' })
    }

    const supabase = getSupabaseAdmin()

    const canRun = await checkCronRateLimit(supabase, 'lock-accounting-entries', 60 * 20)
    if (!canRun) {
      return { success: false, reason: 'rate_limited' }
    }

    // Alle Buchungen die älter als 30 Tage und noch nicht gesperrt sind
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: locked, error } = await supabase
      .from('accounting_entries')
      .update({ locked_at: new Date().toISOString() })
      .lt('created_at', cutoff)
      .is('locked_at', null)
      .is('deleted_at', null)
      .select('id')

    if (error) {
      await logCronExecution(supabase, 'lock-accounting-entries', 'failed', {
        startedAt: startTime, completedAt: new Date(), errorMessage: error.message,
      })
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    const lockedCount = locked?.length ?? 0
    logger.debug(`🔒 Locked ${lockedCount} accounting entries (>30 days old)`)

    await logCronExecution(supabase, 'lock-accounting-entries', 'success', {
      lockedCount, startedAt: startTime, completedAt: new Date(),
    })

    return { success: true, lockedCount, runtime_ms: Date.now() - startTime.getTime() }

  } catch (error: any) {
    logger.error(`❌ Error in lock-accounting-entries cron: ${error.message}`)
    try {
      const supabase = getSupabaseAdmin()
      await logCronExecution(supabase, 'lock-accounting-entries', 'failed', {
        startedAt: startTime, completedAt: new Date(), errorMessage: error.message,
      })
    } catch { /* ignore log failure */ }
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.message })
  }
})
