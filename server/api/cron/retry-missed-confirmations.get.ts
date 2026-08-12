/**
 * Cron: retry appointment confirmations that never got marked sent/queued/skipped.
 * Catches silent failures after booking (Vercel freeze, Resend blip, etc.).
 *
 * Auth: Authorization: Bearer $CRON_SECRET
 */
import { createError, defineEventHandler, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { dispatchAppointmentConfirmation } from '~/server/utils/dispatch-appointment-confirmation'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now = Date.now()
  const minAge = new Date(now - 3 * 60 * 1000).toISOString() // older than 3 minutes
  const maxAge = new Date(now - 48 * 60 * 60 * 1000).toISOString() // last 48h

  // Future-relevant appointments only; retry null/failed (queued is handled by outbound processor).
  const { data: rows, error } = await supabase
    .from('appointments')
    .select('id, user_id, tenant_id, created_at, confirmation_email_status, start_time')
    .is('confirmation_email_sent_at', null)
    .not('user_id', 'is', null)
    .neq('status', 'cancelled')
    .gte('start_time', new Date(now - 2 * 60 * 60 * 1000).toISOString())
    .lte('created_at', minAge)
    .gte('created_at', maxAge)
    .or('confirmation_email_status.is.null,confirmation_email_status.eq.failed')
    .order('created_at', { ascending: true })
    .limit(40)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  let processed = 0
  let sent = 0
  let queued = 0
  let skipped = 0
  let failed = 0

  for (const row of rows || []) {
    if (!row.user_id || !row.tenant_id) continue
    processed++
    try {
      const result = await dispatchAppointmentConfirmation({
        appointmentId: row.id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        skipStaffNotification: false,
      })
      if (result.emailSent) sent++
      else if (result.emailQueued) queued++
      else if (result.skipped) skipped++
      else failed++
    } catch (err: any) {
      failed++
      logger.warn('⚠️ retry-missed-confirmations failed for', row.id, err?.message)
    }
  }

  return {
    success: true,
    found: rows?.length || 0,
    processed,
    sent,
    queued,
    skipped,
    failed,
  }
})
