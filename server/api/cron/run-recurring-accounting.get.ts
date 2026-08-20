import { logger } from '~/utils/logger'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { verifyCronToken, checkCronRateLimit, logCronExecution } from '~/server/utils/cron'
import { runDueRecurring } from '~/server/utils/accounting-recurring-db'

export default defineEventHandler(async (event) => {
  const startTime = new Date()
  if (!verifyCronToken(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - Invalid cron token' })
  }

  const supabase = getSupabaseAdmin()
  const canRun = await checkCronRateLimit(supabase, 'run-recurring-accounting', 60 * 20)
  if (!canRun) return { success: false, reason: 'rate_limited' }

  try {
    const result = await runDueRecurring(supabase)
    await logCronExecution(supabase, 'run-recurring-accounting', 'success', {
      startedAt: startTime, completedAt: new Date(), processedCount: result.created,
    })
    return { success: true, ...result, runtime_ms: Date.now() - startTime.getTime() }
  } catch (error: any) {
    logger.error(`run-recurring-accounting: ${error.message}`)
    await logCronExecution(supabase, 'run-recurring-accounting', 'failed', {
      startedAt: startTime, completedAt: new Date(), errorMessage: error.message,
    })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
