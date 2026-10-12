/**
 * Cron / internal kick: drain public cash enroll required outbox jobs.
 *
 * Auth: assertCronRequest (Bearer CRON_SECRET) — same pattern as other SIMY crons.
 * Schedule: vercel.json every 5 minutes (plus best-effort kick after enroll).
 */
import { createError, defineEventHandler } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { assertCronRequest } from '~/server/utils/cron-auth'
import { verifyCronToken, checkCronRateLimit, logCronExecution } from '~/server/utils/cron'
import { drainPublicCashEnrollOutbox } from '~/server/utils/public-cash-enroll-outbox'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  assertCronRequest(event)
  const startedAt = new Date()

  if (!verifyCronToken(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const canRun = await checkCronRateLimit(supabase, 'process-public-cash-enroll-outbox', 15)
  if (!canRun) {
    return { success: true, message: 'Rate limited', claimed: 0, completed: 0, failed: 0, retried: 0 }
  }

  try {
    const result = await drainPublicCashEnrollOutbox(supabase as any, {
      limit: 20,
      workerId: `cron-${startedAt.getTime()}`,
    })
    await logCronExecution(supabase, 'process-public-cash-enroll-outbox', 'success', {
      startedAt,
      completedAt: new Date(),
      details: result,
    })
    return { success: true, ...result }
  } catch (err: any) {
    logger.error('process-public-cash-enroll-outbox failed', err?.message)
    try {
      await logCronExecution(supabase, 'process-public-cash-enroll-outbox', 'error', {
        startedAt,
        completedAt: new Date(),
        details: { error: String(err?.message || err).slice(0, 200) },
      })
    } catch {
      // ignore
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Outbox drain failed',
    })
  }
})
