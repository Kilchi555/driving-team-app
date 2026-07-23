/**
 * Cron: Retry failed Meta CAPI uploads.
 *
 * Runs every hour. Picks up rows in meta_capi_uploads where:
 *   - upload_status = 'failed'
 *   - upload_attempts < 3 (hard cap to avoid infinite loops)
 *
 * For each row it re-fires sendCapiEvent with the stored signals
 * (fbclid/fbc/fbp + hashed email/phone fetched from the appointments/users join).
 * Updates the row with the new status and increments upload_attempts.
 */

import { defineEventHandler, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { sendCapiEvent } from '~/server/utils/meta-capi'
import { sha256Hex } from '~/server/utils/google-ads-conversion'

const MAX_ATTEMPTS = 3

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const pixelId = (process.env.META_PIXEL_ID ?? '').trim().replace(/\\n$/i, '').replace(/\r?\n$/g, '').trim()
  if (!pixelId) {
    logger.warn('retry-meta-capi: META_PIXEL_ID not set, skipping')
    return { success: false, reason: 'missing_credentials' }
  }

  const supabase = getSupabaseAdmin()

  const { data: failedRows, error: queryError } = await supabase
    .from('meta_capi_uploads')
    .select('id, appointment_id, tenant_id, event_name, fbclid, fbc, fbp, conversion_value_chf, conversion_date_time, upload_attempts')
    .eq('upload_status', 'failed')
    .lt('upload_attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(50)

  if (queryError) {
    logger.error('retry-meta-capi: query failed', queryError.message)
    return { success: false, error: queryError.message }
  }

  if (!failedRows || failedRows.length === 0) {
    logger.info('retry-meta-capi: no failed uploads to retry')
    return { success: true, retried: 0 }
  }

  logger.info(`retry-meta-capi: retrying ${failedRows.length} failed uploads`)

  let retried = 0
  let succeeded = 0

  for (const row of failedRows) {
    let hashedEmail: string | null = null
    let hashedPhone: string | null = null

    try {
      const { data: appt } = await supabase
        .from('appointments')
        .select('user_id')
        .eq('id', row.appointment_id)
        .maybeSingle()

      if (appt?.user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('email, phone')
          .eq('id', appt.user_id)
          .maybeSingle()

        if (user?.email) {
          hashedEmail = await sha256Hex(user.email.trim().toLowerCase())
        }
        if (user?.phone) {
          const normalizedPhone = user.phone.replace(/\s+/g, '').replace(/^00/, '+')
          if (normalizedPhone.startsWith('+')) {
            hashedPhone = await sha256Hex(normalizedPhone)
          }
        }
      }
    } catch (err: any) {
      logger.warn(`retry-meta-capi: could not fetch user data for appointment ${row.appointment_id}:`, err.message)
    }

    const result = await sendCapiEvent({
      appointment_id: row.appointment_id,
      tenant_id: row.tenant_id,
      event_name: row.event_name as 'Purchase' | 'Lead' | 'RefundOrder',
      conversion_value_chf: Number(row.conversion_value_chf),
      conversion_date_time: row.conversion_date_time,
      fbclid: row.fbclid,
      fbc: row.fbc,
      fbp: row.fbp,
      hashed_email: hashedEmail,
      hashed_phone: hashedPhone,
    })

    // Meta rejects events older than 7 days with a permanent, non-retryable error
    // (error_subcode 2804003) — mark these as 'expired' immediately instead of
    // burning through MAX_ATTEMPTS retries that can never succeed.
    const isExpiredTimestamp = result.meta_response?.error?.error_subcode === 2804003
    const newStatus = result.sent ? 'success'
      : isExpiredTimestamp ? 'expired'
        : result.reason === 'no_user_signal' ? 'skipped_no_signal'
          : 'failed'

    await supabase
      .from('meta_capi_uploads')
      .update({
        upload_status: newStatus,
        upload_attempts: (row.upload_attempts ?? 0) + 1,
        last_attempt_at: new Date().toISOString(),
        error_message: result.error || result.reason || null,
        meta_response: result.meta_response ?? null,
      })
      .eq('id', row.id)

    retried++
    if (result.sent) succeeded++

    logger.info(`retry-meta-capi: appointment ${row.appointment_id} → ${newStatus} (attempt ${(row.upload_attempts ?? 0) + 1})`)
  }

  return { success: true, retried, succeeded, failed: retried - succeeded }
})
