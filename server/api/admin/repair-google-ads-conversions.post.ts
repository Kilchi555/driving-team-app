/**
 * One-shot repair for Google Ads conversion gaps found in the 7-day audit:
 *   1. Retry all failed uploads (incl. #35 Internal error)
 *   2. Restate successful uploads that were sent with value 0
 *   3. Backfill missed course conversions that had a gclid on the session
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/repair-google-ads-conversions \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{}'
 */

import { defineEventHandler, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import {
  retryFailedConversionUpload,
  uploadConversionAdjustment,
  recordAndUploadCourseConversion,
  normalizeConversionValueChf,
  sha256Hex,
} from '~/server/utils/google-ads-conversion'
import { resolveMarketingAttribution } from '~/server/utils/resolve-marketing-attribution'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const report: Record<string, any> = {
    retries: { attempted: 0, succeeded: 0, errors: [] as string[] },
    restatements: { attempted: 0, succeeded: 0, errors: [] as string[] },
    course_backfill: { attempted: 0, succeeded: 0, skipped: 0, errors: [] as string[] },
  }

  // ── 1. Retry failed uploads ──────────────────────────────────────────────
  const { data: failedRows } = await supabase
    .from('google_ads_conversion_uploads')
    .select('id, appointment_id, order_id, conversion_action_id, gclid, gbraid, wbraid, conversion_value_chf, conversion_date_time, upload_attempts')
    .eq('upload_status', 'failed')
    .order('created_at', { ascending: true })
    .limit(50)

  for (const row of failedRows ?? []) {
    if (!row.gclid && !row.gbraid && !row.wbraid) continue
    report.retries.attempted++
    try {
      const result = await retryFailedConversionUpload(row)
      if (result.uploaded) report.retries.succeeded++
      else report.retries.errors.push(`${row.id}: ${result.error || result.reason}`)
    } catch (err: any) {
      report.retries.errors.push(`${row.id}: ${err?.message ?? err}`)
    }
  }

  // ── 2. Restate value-0 successes (free bookings that taught Smart Bidding 0) ─
  const { data: zeroValueRows } = await supabase
    .from('google_ads_conversion_uploads')
    .select('id, appointment_id, conversion_value_chf, conversion_date_time, gclid')
    .eq('upload_status', 'success')
    .eq('conversion_value_chf', 0)
    .not('gclid', 'is', null)
    .gte('created_at', '2026-08-01')
    .limit(50)

  for (const row of zeroValueRows ?? []) {
    report.restatements.attempted++
    const newValue = normalizeConversionValueChf(0)
    try {
      const result = await uploadConversionAdjustment({
        appointment_id: row.appointment_id,
        original_conversion_date_time: row.conversion_date_time,
        adjustment_type: 'RESTATEMENT',
        new_conversion_value_chf: newValue,
      })
      if (result.uploaded) {
        report.restatements.succeeded++
        await supabase
          .from('google_ads_conversion_uploads')
          .update({
            conversion_value_chf: newValue,
            error_message: `restated_from_0_to_${newValue}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id)
      } else {
        report.restatements.errors.push(`${row.id}: ${result.error || result.reason}`)
      }
    } catch (err: any) {
      report.restatements.errors.push(`${row.id}: ${err?.message ?? err}`)
    }
  }

  // ── 3. Backfill course conversions with gclid that never uploaded ────────
  // Find completed Motorrad (and other) course payments since Aug 1 whose
  // marketing session has a click id, then upload if we can find the registration.
  const { data: coursePaymentsRaw } = await supabase
    .from('payments')
    .select('id, total_amount_rappen, created_at, metadata, payment_status')
    .eq('payment_status', 'completed')
    .gte('created_at', '2026-08-01')
    .limit(200)

  const coursePayments = (coursePaymentsRaw ?? []).filter((p) => {
    const meta = (p.metadata ?? {}) as Record<string, any>
    return !!(meta.course_name || meta.courseId || meta.course_id)
  })

  for (const payment of coursePayments ?? []) {
    const meta = (payment.metadata ?? {}) as Record<string, any>
    const sessionId = meta.marketing_session_id as string | undefined
    const courseId = meta.courseId || meta.course_id
    const email = meta.email as string | undefined
    if (!courseId || !email) {
      report.course_backfill.skipped++
      continue
    }

    const attr = await resolveMarketingAttribution(supabase, sessionId, {
      gclid: meta.gclid ?? null,
      gbraid: meta.gbraid ?? null,
      wbraid: meta.wbraid ?? null,
    })

    if (!attr.gclid && !attr.gbraid && !attr.wbraid) {
      report.course_backfill.skipped++
      continue
    }

    const { data: reg } = await supabase
      .from('course_registrations')
      .select('id, tenant_id, email, phone, amount_paid_rappen, created_at')
      .eq('course_id', courseId)
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!reg?.id) {
      report.course_backfill.errors.push(`payment ${payment.id}: registration not found`)
      continue
    }

    report.course_backfill.attempted++
    try {
      const hashedEmail = reg.email ? await sha256Hex(String(reg.email).trim().toLowerCase()) : null
      const normalizedPhone = String(reg.phone ?? '').replace(/\s+/g, '').replace(/^00/, '+')
      const hashedPhone = normalizedPhone.startsWith('+') ? await sha256Hex(normalizedPhone) : null
      const valueChf = (reg.amount_paid_rappen || payment.total_amount_rappen || 0) / 100

      await recordAndUploadCourseConversion({
        registration_id: String(reg.id),
        tenant_id: reg.tenant_id ?? null,
        gclid: attr.gclid ?? null,
        gbraid: attr.gbraid ?? null,
        wbraid: attr.wbraid ?? null,
        conversion_value_chf: valueChf,
        conversion_date_time: reg.created_at || payment.created_at,
        hashed_email: hashedEmail,
        hashed_phone: hashedPhone,
      })
      report.course_backfill.succeeded++
      logger.info(`repair-google-ads: backfilled course ${reg.id} (CHF ${valueChf})`)
    } catch (err: any) {
      report.course_backfill.errors.push(`${reg.id}: ${err?.message ?? err}`)
    }
  }

  // Clean polluted conversion_action_id rows with trailing newlines
  const { data: dirtyIds } = await supabase
    .from('google_ads_conversion_uploads')
    .select('id, conversion_action_id')
    .like('conversion_action_id', '%\n%')
    .limit(50)

  let cleaned = 0
  for (const row of dirtyIds ?? []) {
    const trimmed = String(row.conversion_action_id ?? '').trim()
    if (trimmed && trimmed !== row.conversion_action_id) {
      await supabase
        .from('google_ads_conversion_uploads')
        .update({ conversion_action_id: trimmed })
        .eq('id', row.id)
      cleaned++
    }
  }
  report.cleaned_action_ids = cleaned

  return { success: true, ...report }
})
