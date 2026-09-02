/**
 * GET /api/cron/detect-suspicious-zero-payments
 *
 * Daily detector for the guest-booking CHF-0 pricing amp:
 * online practical lessons with lesson_price=0 + total=0, not cancelled,
 * without a documented free benefit (discount / voucher / free metadata /
 * payment_method=free).
 *
 * Dedupes only against prior **cron digest** alerts
 * (`data.alert_channel = cron_digest`), not against process-time blocks
 * (`fallback:suspicious-zero-payment-block`). Email is attempted first;
 * the digest marker is written only after a successful send so a failed
 * mail can retry on the next run.
 *
 * Schedule: daily 06:30 UTC (vercel.json).
 */
import { defineEventHandler, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { logFallbackUsed } from '~/server/utils/log-fallback'

const LOOKBACK_HOURS = 48
const LOG_COMPONENT = 'fallback:suspicious-zero-payment'
const ALERT_CHANNEL = 'cron_digest'
const DASHBOARD_HINT = 'https://app.simy.ch/tenant-admin/errors'

function isDocumentedFree(payment: {
  discount_amount_rappen?: number | null
  voucher_discount_rappen?: number | null
  payment_method?: string | null
  metadata?: any
}): boolean {
  if ((Number(payment.discount_amount_rappen) || 0) > 0) return true
  if ((Number(payment.voucher_discount_rappen) || 0) > 0) return true
  if (payment.payment_method === 'free') return true
  const meta = payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : null
  if (meta?.free_public_event === true || meta?.allow_zero_completion === true) return true
  return false
}

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = getHeader(event, 'x-vercel-cron') === '1'
  if (!isVercelCron && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()

  const { data: rows, error } = await supabase
    .from('payments')
    .select(`
      id,
      tenant_id,
      user_id,
      created_at,
      payment_status,
      payment_method,
      lesson_price_rappen,
      discount_amount_rappen,
      voucher_discount_rappen,
      total_amount_rappen,
      credit_used_rappen,
      metadata,
      appointments!inner (
        id,
        source,
        event_type_code,
        type,
        status,
        start_time
      )
    `)
    .eq('lesson_price_rappen', 0)
    .eq('total_amount_rappen', 0)
    .gte('created_at', since)
    .not('payment_status', 'in', '(cancelled,refunded)')
    .eq('appointments.source', 'online')
    .neq('appointments.status', 'cancelled')

  if (error) {
    logger.error('❌ detect-suspicious-zero-payments query failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Query failed' })
  }

  const suspicious = (rows || []).filter((p: any) => {
    if (isDocumentedFree(p)) return false
    const apt = Array.isArray(p.appointments) ? p.appointments[0] : p.appointments
    const eventCode = (apt?.event_type_code || 'lesson').toLowerCase()
    const isPractical =
      eventCode === 'lesson' ||
      eventCode === 'practical' ||
      eventCode === 'fahrstunde'
    if (isPractical) return true
    return (
      p.payment_status === 'completed' &&
      p.payment_method === 'credit' &&
      !(Number(p.credit_used_rappen) > 0)
    )
  })

  if (suspicious.length === 0) {
    return { success: true, found: 0, new: 0, message: 'No suspicious zero payments' }
  }

  // Dedupe only prior successful cron digests — not process-time block logs.
  const candidateIds = suspicious.map((p: any) => p.id as string)
  let alreadyAlerted = new Set<string>()
  const { data: priorLogs, error: priorErr } = await supabase
    .from('error_logs')
    .select('data')
    .eq('component', LOG_COMPONENT)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .filter('data->>payment_id', 'in', `(${candidateIds.join(',')})`)
    .filter('data->>alert_channel', 'eq', ALERT_CHANNEL)

  if (priorErr) {
    logger.warn('⚠️ Could not load prior zero-payment digests, proceeding without dedupe:', priorErr.message)
  } else {
    for (const row of priorLogs || []) {
      const pid = row?.data && typeof row.data === 'object' ? (row.data as any).payment_id : null
      if (typeof pid === 'string') alreadyAlerted.add(pid)
    }
  }

  const fresh = suspicious.filter((p: any) => !alreadyAlerted.has(p.id))
  if (fresh.length === 0) {
    return {
      success: true,
      found: suspicious.length,
      new: 0,
      skipped_already_alerted: alreadyAlerted.size,
      message: 'All matching payments were already digest-alerted',
    }
  }

  const { data: superAdmins } = await supabase
    .from('users')
    .select('email, first_name')
    .eq('role', 'super_admin')
    .eq('is_active', true)

  const recipients = (superAdmins || []).map(u => u.email).filter(Boolean) as string[]
  let emailed = 0
  let emailOk = false

  if (recipients.length > 0) {
    const lines = fresh.slice(0, 30).map((p: any) => {
      const apt = Array.isArray(p.appointments) ? p.appointments[0] : p.appointments
      return `<li><code>${p.id}</code> — ${p.payment_status}/${p.payment_method} — ${apt?.event_type_code || apt?.type || '?'} @ ${apt?.start_time || p.created_at}</li>`
    }).join('')

    try {
      await sendEmail({
        to: recipients,
        subject: `[Simy] ${fresh.length} neue verdächtige CHF-0 Online-Zahlung(en)`,
        html: `
          <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;padding:24px">
            <h1 style="font-size:18px;color:#111827">Verdächtige CHF-0 Online-Zahlungen</h1>
            <p style="font-size:14px;color:#374151">
              <strong>${fresh.length}</strong> neue Online-Zahlung(en) (Lookback ${LOOKBACK_HOURS}h)
              mit Lesson+Total = CHF 0 ohne Rabatt/Gutschein/Free-Flag.
            </p>
            <ul style="font-size:13px;color:#111827">${lines}</ul>
            <p style="font-size:13px;margin-top:16px">
              <a href="${DASHBOARD_HINT}">Error Monitoring öffnen</a>
            </p>
          </div>
        `,
      })
      emailed = recipients.length
      emailOk = true
    } catch (err: any) {
      logger.warn('⚠️ Could not email super_admins about zero payments:', err?.message)
    }
  } else {
    logger.warn('⚠️ No super_admin recipients for zero-payment digest')
  }

  // Always land in Error Monitoring. Mark alert_channel=cron_digest only when
  // the email actually went out — otherwise the next run can retry the digest.
  for (const p of fresh) {
    const apt = Array.isArray(p.appointments) ? p.appointments[0] : p.appointments
    await logFallbackUsed({
      source: 'suspicious-zero-payment',
      level: 'error',
      message: `Suspicious online CHF-0 payment ${p.id} (status=${p.payment_status}, method=${p.payment_method})`,
      tenantId: p.tenant_id,
      userId: p.user_id,
      details: {
        payment_id: p.id,
        appointment_id: apt?.id || null,
        event_type_code: apt?.event_type_code || null,
        type: apt?.type || null,
        start_time: apt?.start_time || null,
        payment_status: p.payment_status,
        payment_method: p.payment_method,
        created_at: p.created_at,
        ...(emailOk ? { alert_channel: ALERT_CHANNEL } : { alert_channel: 'cron_pending' }),
      },
    })
  }

  logger.error(`🚨 detect-suspicious-zero-payments: new=${fresh.length} matched=${suspicious.length} emailed=${emailOk}`)
  return {
    success: true,
    found: suspicious.length,
    new: fresh.length,
    skipped_already_alerted: alreadyAlerted.size,
    emailed,
    email_ok: emailOk,
  }
})
