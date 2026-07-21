// server/api/cron/cleanup-expired-receipts.get.ts
//
// Cron Job: Cleanup Expired Receipt/Evaluation PDFs
// Runs daily via Vercel Cron.
// NOTE: must stay a GET route — Vercel Cron always triggers via HTTP GET.
//
// Receipt and evaluation PDFs in the `receipts` storage bucket are always
// regenerated on demand from the payments/appointments/evaluations tables
// (see server/api/payments/receipt.post.ts and
// server/api/evaluations/export-pdf.post.ts) — they only exist in Storage
// so a temporary HTTPS URL can be handed to the client. There is no need
// to keep them around once the customer has had a chance to open/download
// them, so anything older than RETENTION_HOURS is deleted.
//
// Invoices (`invoices/...`) and dunning notices (`dunning/...`) are
// intentionally excluded — those are kept longer pending confirmation of
// formal accounting retention rules with the Treuhänder.
//
// Security:
// ✅ Layer 1: Auth - Vercel CRON_SECRET verification
// ✅ Layer 2: Rate Limiting - Prevents re-trigger within 5 minutes
// ✅ Layer 3: Audit Logging - Logs every execution
// ✅ Deletion goes through the Storage API (not raw SQL) so the object
//    row and its backing blob are removed together.

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { verifyCronToken, checkCronRateLimit, logCronExecution } from '~/server/utils/cron'

const RETENTION_HOURS = 48
const BATCH_SIZE = 100

export default defineEventHandler(async (event) => {
  const startTime = new Date()
  let deletedCount = 0

  try {
    // Layer 1: Authentication - Verify Vercel Cron token
    if (!verifyCronToken(event)) {
      logger.error('🚨 Unauthorized cron request to cleanup-expired-receipts')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Invalid cron token'
      })
    }

    const supabase = getSupabaseAdmin()

    // Layer 2: Rate Limiting - Prevent re-trigger
    const canRun = await checkCronRateLimit(supabase, 'cleanup-expired-receipts', 300)
    if (!canRun) {
      logger.warn('⏱️ Rate limited: cleanup-expired-receipts ran too recently')

      await logCronExecution(supabase, 'cleanup-expired-receipts', 'success', {
        startedAt: startTime,
        completedAt: new Date(),
        errorMessage: 'Skipped due to rate limit'
      })

      return {
        success: false,
        reason: 'rate_limited',
        message: 'Skipped - ran too recently'
      }
    }

    logger.debug(`🧹 Listing receipt/evaluation PDFs older than ${RETENTION_HOURS}h`)

    const { data: expiredPaths, error: listError } = await supabase
      .rpc('list_expired_receipts', { retention_hours: RETENTION_HOURS })

    if (listError) {
      const errorMsg = `Error listing expired receipts: ${listError.message}`
      logger.error(`❌ ${errorMsg}`)

      await logCronExecution(supabase, 'cleanup-expired-receipts', 'failed', {
        startedAt: startTime,
        completedAt: new Date(),
        errorMessage: errorMsg
      })

      throw createError({ statusCode: 500, statusMessage: errorMsg })
    }

    const paths = (expiredPaths || []).map((row: any) => row.expired_path).filter(Boolean)

    if (paths.length === 0) {
      logger.debug('✅ No expired receipt/evaluation PDFs to clean up')
      await logCronExecution(supabase, 'cleanup-expired-receipts', 'success', {
        deletedCount: 0,
        startedAt: startTime,
        completedAt: new Date()
      })
      return { success: true, deletedCount: 0 }
    }

    logger.debug(`📋 Found ${paths.length} expired receipt/evaluation PDF(s) to delete`)

    // Delete in batches to keep each Storage API call small
    for (let i = 0; i < paths.length; i += BATCH_SIZE) {
      const batch = paths.slice(i, i + BATCH_SIZE)
      const { data: removed, error: removeError } = await supabase.storage
        .from('receipts')
        .remove(batch)

      if (removeError) {
        logger.error('❌ Error removing receipt batch:', removeError)
        continue
      }

      deletedCount += removed?.length || 0
    }

    logger.debug(`✅ Cleaned up ${deletedCount} expired receipt/evaluation PDF(s)`)

    await logCronExecution(supabase, 'cleanup-expired-receipts', 'success', {
      deletedCount,
      startedAt: startTime,
      completedAt: new Date()
    })

    return {
      success: true,
      deletedCount,
      runtime_ms: new Date().getTime() - startTime.getTime()
    }
  } catch (error: any) {
    logger.error(`❌ Error in cleanup-expired-receipts cron: ${error.message}`)

    try {
      const supabase = getSupabaseAdmin()
      await logCronExecution(supabase, 'cleanup-expired-receipts', 'failed', {
        startedAt: startTime,
        completedAt: new Date(),
        errorMessage: error.message || 'Unknown error'
      })
    } catch (logError) {
      logger.error('❌ Failed to log cron error:', logError)
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
