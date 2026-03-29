// server/api/cron/send-overdue-payment-reminders.get.ts
// ============================================================
// Weekly reminders for wallee payments overdue by 15+ days.
//
// Schedule: daily at 07:05 UTC (runs after send-payment-reminders)
// Sends ONE email per user per week (7-day dedup window).
// Also notifies the tenant admin on every send.
//
// Test mode: ?test_user_id=<UUID>
// ============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader, getQuery } from 'h3'

const OVERDUE_DAYS   = 15   // appointment must be at least this many days in the past
const RESEND_DAYS    = 7    // re-send at most once per week

// Swiss rounding: round to nearest 0.05 CHF
function chf(rappen: number): string {
  return (Math.round(Math.round(rappen) / 5) * 5 / 100).toFixed(2)
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-overdue-payment-reminders')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase   = getSupabaseAdmin()
  const now        = new Date()
  const cutoff     = new Date(now.getTime() - OVERDUE_DAYS * 24 * 60 * 60 * 1000)
  const recentCutoff = new Date(now.getTime() - RESEND_DAYS * 24 * 60 * 60 * 1000)

  const query        = getQuery(event)
  const testUserId   = typeof query.test_user_id === 'string' ? query.test_user_id : null

  if (testUserId) logger.debug(`🧪 TEST MODE: user=${testUserId}`)

  // ── 1. Fetch overdue pending wallee payments ─────────────────
  let paymentsQuery = supabase
    .from('payments')
    .select('id, appointment_id, user_id, tenant_id, total_amount_rappen, payment_status')
    .eq('payment_method', 'wallee')
    .in('payment_status', ['pending', 'failed'])

  if (testUserId) {
    paymentsQuery = paymentsQuery.eq('user_id', testUserId)
  }

  const { data: allPayments, error: paymentsError } = await paymentsQuery

  if (paymentsError) {
    logger.error('❌ Failed to fetch payments:', paymentsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch payments' })
  }

  if (!allPayments || allPayments.length === 0) {
    return { success: true, queued: 0, skipped: 0, duration_ms: Date.now() - startTime, message: 'No pending payments' }
  }

  // ── 2. Fetch appointments: only those older than OVERDUE_DAYS ─
  const appointmentIds = [...new Set((allPayments as any[]).map((p: any) => p.appointment_id).filter(Boolean))]
  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('id, start_time')
    .in('id', appointmentIds)
    .lt('start_time', cutoff.toISOString())   // >14 days ago
    .neq('status', 'cancelled')

  if (aptError) {
    logger.error('❌ Failed to fetch appointments:', aptError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch appointments' })
  }

  if (!appointments || appointments.length === 0) {
    return { success: true, queued: 0, skipped: 0, duration_ms: Date.now() - startTime, message: 'No overdue appointments' }
  }

  const appointmentMap = new Map((appointments as any[]).map((a: any) => [a.id, a]))
  const eligiblePayments = (allPayments as any[]).filter((p: any) => appointmentMap.has(p.appointment_id))

  if (eligiblePayments.length === 0) {
    return { success: true, queued: 0, skipped: 0, duration_ms: Date.now() - startTime, message: 'No eligible overdue payments' }
  }

  // ── 3. Group by user ─────────────────────────────────────────
  const paymentsByUser = new Map<string, any[]>()
  for (const p of eligiblePayments) {
    if (!p.user_id) continue
    if (!paymentsByUser.has(p.user_id)) paymentsByUser.set(p.user_id, [])
    paymentsByUser.get(p.user_id)!.push(p)
  }

  // ── 4. Fetch users + tenants ─────────────────────────────────
  const userIds   = [...paymentsByUser.keys()]
  const tenantIds = [...new Set(eligiblePayments.map((p: any) => p.tenant_id).filter(Boolean))]

  const { data: users }   = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone')
    .in('id', userIds)

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, primary_color, logo_wide_url, logo_url, logo_square_url, contact_email')
    .in('id', tenantIds)

  const userMap   = new Map((users   || []).map((u: any) => [u.id, u]))
  const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]))

  // ── 5. Deduplication: skip if already sent in last 7 days ────
  let recentlySent = new Set<string>()
  if (!testUserId) {
    const { data: existing } = await supabase
      .from('outbound_messages_queue')
      .select('context_data')
      .eq('context_data->>stage' as any, 'payment_overdue_reminder')
      .in('context_data->>user_id' as any, userIds)
      .in('status', ['pending', 'sending', 'sent'])
      .gte('created_at', recentCutoff.toISOString())

    ;(existing || []).forEach((row: any) => {
      if (row.context_data?.user_id) recentlySent.add(row.context_data.user_id)
    })
  }

  // ── 6. Build queue entries ───────────────────────────────────
  const toInsert: any[] = []

  for (const [userId, userPayments] of paymentsByUser) {
    if (recentlySent.has(userId)) {
      logger.debug(`⏭️ Overdue reminder already sent this week for user ${userId}`)
      continue
    }

    const user = userMap.get(userId)
    if (!user || !user.email) continue

    const tenant       = tenantMap.get(userPayments[0].tenant_id)
    const tenantName   = tenant?.name   || 'Ihre Fahrschule'
    const tenantSlug   = tenant?.slug   || ''
    const loginLink    = tenantSlug ? `https://simy.ch/${tenantSlug}` : 'https://simy.ch'
    const primaryColor = tenant?.primary_color || '#2563eb'
    const logoUrl      = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null

    const totalRappen = userPayments.reduce((s: number, p: any) => s + (p.total_amount_rappen || 0), 0)
    const totalCHF    = chf(totalRappen)

    const paymentRows = userPayments.map((p: any) => {
      const apt = appointmentMap.get(p.appointment_id)
      if (!apt) return ''
      const d       = new Date(apt.start_time)
      const dateStr = d.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' })
      const timeStr = d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
      const amtCHF  = chf(p.total_amount_rappen || 0)
      const daysAgo = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151">${dateStr}, ${timeStr}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af">${daysAgo} Tage überfällig</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;font-weight:600;color:#dc2626">CHF ${amtCHF}</td>
        </tr>`
    }).join('')

    const logoHtml = logoUrl
      ? `<div style="margin-bottom:20px;text-align:center"><img src="${logoUrl}" alt="${tenantName}" style="height:40px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></div>`
      : `<div style="margin-bottom:20px;text-align:center"><div style="display:inline-block;width:40px;height:40px;border-radius:10px;background:${primaryColor};color:white;font-size:20px;font-weight:700;line-height:40px;text-align:center;margin:0 auto">${tenantName.charAt(0).toUpperCase()}</div></div>`

    const emailBody = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">
        <tr><td>${logoHtml}</td></tr>
        <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10)">
          <div style="background:#dc2626;padding:28px 32px;text-align:center">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff">Überfällige Zahlung</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${tenantName}</p>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
              Hallo ${user.first_name},<br><br>
              folgende Zahlungen bei <strong>${tenantName}</strong> sind noch ausstehend.
              Bitte begleiche den offenen Betrag so bald wie möglich:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-radius:8px;overflow:hidden;margin-bottom:20px">
              <thead>
                <tr style="background:#fef2f2">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Termin</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Überfällig</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Betrag</th>
                </tr>
              </thead>
              <tbody>${paymentRows}</tbody>
              <tfoot>
                <tr style="background:#fef2f2">
                  <td colspan="2" style="padding:12px;font-size:14px;font-weight:700;color:#111827">Total</td>
                  <td style="padding:12px;font-size:16px;font-weight:700;color:#dc2626">CHF ${totalCHF}</td>
                </tr>
              </tfoot>
            </table>

            <div style="text-align:center;margin:24px 0">
              <a href="${loginLink}" style="display:inline-block;padding:14px 32px;background:#dc2626;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                Jetzt bezahlen →
              </a>
            </div>

            <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;text-align:center">
              Melde dich unter <a href="${loginLink}" style="color:#dc2626">${loginLink}</a> an.
            </p>
          </div>
          <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af">${tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const contextData = {
      stage:       'payment_overdue_reminder',
      user_id:     userId,
      payment_ids: userPayments.map((p: any) => p.id),
      total_chf:   totalCHF,
      tenant_name: tenantName,
    }

    toInsert.push({
      tenant_id:       userPayments[0].tenant_id,
      channel:         'email',
      recipient_email: user.email,
      subject:         `Überfällige Zahlung: CHF ${totalCHF} — bitte jetzt begleichen`,
      body:            emailBody,
      status:          'pending',
      send_at:         now.toISOString(),
      context_data:    contextData,
    })
  }

  if (toInsert.length === 0) {
    logger.debug('ℹ️ No overdue reminders to send today')
    return { success: true, queued: 0, skipped: paymentsByUser.size, duration_ms: Date.now() - startTime, message: 'No reminders due' }
  }

  // ── 7. Insert ─────────────────────────────────────────────────
  const { error: insertError } = await supabase
    .from('outbound_messages_queue')
    .insert(toInsert)

  if (insertError) {
    logger.error('❌ Failed to insert overdue reminders:', insertError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to queue overdue reminders' })
  }

  logger.debug(`✅ send-overdue-payment-reminders: ${toInsert.length} emails queued in ${Date.now() - startTime}ms`)

  return {
    success:        true,
    queued:         toInsert.length,
    skipped:        paymentsByUser.size - toInsert.length,
    duration_ms:    Date.now() - startTime,
  }
})
