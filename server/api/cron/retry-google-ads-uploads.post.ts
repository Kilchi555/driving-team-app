/**
 * Cron: Retry failed Google Ads conversion uploads.
 *
 * Runs hourly (alongside Meta CAPI retry). Picks up rows where:
 *   - upload_status = 'failed'
 *   - upload_attempts < 5
 *   - has at least one click id (gclid/gbraid/wbraid)
 *
 * Also cleans conversion_action_id trailing newlines on retry.
 */

import { defineEventHandler, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { retryFailedConversionUpload } from '~/server/utils/google-ads-conversion'

const MAX_ATTEMPTS = 5

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()

  const { data: failedRows, error: queryError } = await supabase
    .from('google_ads_conversion_uploads')
    .select('id, appointment_id, order_id, conversion_action_id, gclid, gbraid, wbraid, conversion_value_chf, conversion_date_time, upload_attempts')
    .eq('upload_status', 'failed')
    .lt('upload_attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(50)

  if (queryError) {
    logger.error('retry-google-ads: query failed', queryError.message)
    return { success: false, error: queryError.message }
  }

  const retryable = (failedRows ?? []).filter((r) => r.gclid || r.gbraid || r.wbraid)

  if (retryable.length === 0) {
    logger.info('retry-google-ads: no failed uploads to retry')
    return { success: true, retried: 0, succeeded: 0 }
  }

  logger.info(`retry-google-ads: retrying ${retryable.length} failed uploads`)

  let retried = 0
  let succeeded = 0
  const errors: Array<{ id: number | string; error: string }> = []

  for (const row of retryable) {
    retried++
    try {
      const result = await retryFailedConversionUpload(row)
      if (result.uploaded) {
        succeeded++
        logger.info(`retry-google-ads: success for upload ${row.id} (appointment ${row.appointment_id})`)
      } else {
        errors.push({ id: row.id, error: result.error || result.reason || 'unknown' })
        logger.warn(`retry-google-ads: still failed for upload ${row.id} — ${result.reason}${result.error ? `: ${result.error.slice(0, 160)}` : ''}`)
      }
    } catch (err: any) {
      errors.push({ id: row.id, error: err?.message ?? String(err) })
      logger.warn(`retry-google-ads: exception for upload ${row.id}`, err?.message ?? err)
    }
  }

  return { success: true, retried, succeeded, errors: errors.slice(0, 10) }
})
