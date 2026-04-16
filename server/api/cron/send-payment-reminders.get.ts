// server/api/cron/send-payment-reminders.get.ts
// ============================================================
// Queues payment reminder emails for pending wallee payments
// AFTER the appointment has taken place.
//
// Schedule: daily at 07:00 UTC
// Reminder days: +3, +7, +14 days after appointment
//
// Groups all open payments per student into ONE email (bulk).
// Deduplication: per user_id + reminder_day (based on oldest open payment).
// At day 14: additionally notifies the tenant admin.
//
// Test mode: ?test_user_id=<UUID>&reminder_day=3
// ============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader, getQuery } from 'h3'

const REMINDER_DAYS = [3, 7, 14]

// Swiss rounding: round to nearest 0.05 CHF
function chf(rappen: number): string {
  return (Math.round(Math.round(rappen) / 5) * 5 / 100).toFixed(2)
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  // ── Auth ────────────────────────────────────────────────────
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-payment-reminders')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()

  const query = getQuery(event)
  const testUserId    = typeof query.test_user_id   === 'string' ? query.test_user_id   : null
  const testReminderDay = testUserId ? Number(query.reminder_day ?? 3) : null

  if (testUserId) {
    logger.debug(`🧪 TEST MODE: user=${testUserId}, reminder_day=${testReminderDay}`)
  }

  // ── 1. Fetch pending wallee payments ───────────────────────
  let paymentsQuery = supabase
    .from('payments')
    .select('id, appointment_id, user_id, tenant_id, total_amount_rappen, payment_status, payment_method')
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
    return { success: true, queued: 0, skipped: 0, duration_ms: Date.now() - startTime, message: 'No pending wallee payments' }
  }

  // ── 2. Fetch the corresponding appointments (past only) ─────
  const appointmentIds = [...new Set((allPayments as any[]).map((p: any) => p.appointment_id).filter(Boolean))]
  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('id, start_time, type, event_type_code')
    .in('id', appointmentIds)
    .lt('start_time', now.toISOString())
    .neq('status', 'cancelled')

  if (aptError) {
    logger.error('❌ Failed to fetch appointments:', aptError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch appointments' })
  }

  if (!appointments || appointments.length === 0) {
    return { success: true, queued: 0, skipped: 0, duration_ms: Date.now() - startTime, message: 'No past appointments with open payments' }
  }

  const appointmentMap = new Map((appointments as any[]).map((a: any) => [a.id, a]))

  // Keep only payments whose appointment is in the past
  const eligiblePayments = (allPayments as any[]).filter((p: any) => appointmentMap.has(p.appointment_id))

  // ── 3. Group payments by user ────────────────────────────────
  const paymentsByUser = new Map<string, any[]>()
  for (const payment of eligiblePayments) {
    if (!payment.user_id) continue
    if (!paymentsByUser.has(payment.user_id)) paymentsByUser.set(payment.user_id, [])
    paymentsByUser.get(payment.user_id)!.push(payment)
  }

  // ── 4. Fetch users and tenants ───────────────────────────────
  const userIds    = [...paymentsByUser.keys()]
  const tenantIds  = [...new Set(eligiblePayments.map((p: any) => p.tenant_id).filter(Boolean))]

  const { data: users }   = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone, tenant_id')
    .in('id', userIds)

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, primary_color, logo_wide_url, logo_url, logo_square_url, contact_email')
    .in('id', tenantIds)

  const userMap   = new Map((users   || []).map((u: any) => [u.id, u]))
  const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]))

  // ── 5. Check already-queued reminders ───────────────────────
  let alreadyQueued = new Set<string>()
  if (!testUserId) {
    const { data: existingQueue } = await supabase
      .from('outbound_messages_queue')
      .select('context_data')
      .eq('context_data->>stage' as any, 'payment_reminder')
      .in('context_data->>user_id' as any, userIds)
      .in('status', ['pending', 'sending', 'sent'])

    ;(existingQueue || []).forEach((row: any) => {
      const ctx = row.context_data
      if (ctx?.user_id && ctx?.reminder_day) {
        alreadyQueued.add(`${ctx.user_id}:${ctx.reminder_day}`)
      }
    })
  }

  // ── 6. Build queue entries ───────────────────────────────────
  const toInsert: any[] = []

  for (const [userId, userPayments] of paymentsByUser) {
    const user = userMap.get(userId)
    if (!user || !user.email) continue

    // Find oldest unpaid appointment to base the reminder schedule on
    const appointmentDates = userPayments
      .map((p: any) => appointmentMap.get(p.appointment_id))
      .filter(Boolean)
      .map((a: any) => new Date(a.start_time).getTime())

    const oldestAppointmentTime = Math.min(...appointmentDates)
    const daysSinceOldest = (now.getTime() - oldestAppointmentTime) / (1000 * 60 * 60 * 24)

    const tenant    = tenantMap.get(userPayments[0].tenant_id)
    const tenantName = tenant?.name || 'Ihre Fahrschule'
    const tenantSlug = tenant?.slug || ''
    const loginLink  = tenantSlug ? `https://simy.ch/${tenantSlug}` : 'https://simy.ch'
    const primaryColor = tenant?.primary_color || '#2563eb'
    const logoUrl    = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null

    const effectiveDays = testUserId ? [testReminderDay!] : REMINDER_DAYS

    for (const reminderDay of effectiveDays) {
      if (!testUserId && (daysSinceOldest < reminderDay || daysSinceOldest >= reminderDay + 1)) continue

      const key = `${userId}:${reminderDay}`
      if (alreadyQueued.has(key)) {
        logger.debug(`⏭️ Payment reminder day ${reminderDay} already queued for user ${userId}`)
        continue
      }

      const reminderNumber = REMINDER_DAYS.indexOf(reminderDay) + 1
      const totalRappen    = userPayments.reduce((sum: number, p: any) => sum + (p.total_amount_rappen || 0), 0)
      const totalCHF       = chf(totalRappen)

      // ── Build payment rows for email ──────────────────────

      const paymentRows = userPayments.map((p: any) => {
        const apt = appointmentMap.get(p.appointment_id)
        if (!apt) return ''
        const d = new Date(apt.start_time)
        const tzOpts = { timeZone: 'Europe/Zurich' }
        const dateStr = d.toLocaleDateString('de-CH', { ...tzOpts, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
        const timeStr = d.toLocaleTimeString('de-CH', { ...tzOpts, hour: '2-digit', minute: '2-digit' })
        const amtCHF  = chf(p.total_amount_rappen || 0)
        return `
          <tr>
            <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;white-space:nowrap;width:70%">${dateStr}, ${timeStr} Uhr</td>
            <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;font-weight:600;white-space:nowrap;width:30%">CHF ${amtCHF}</td>
          </tr>`
      }).join('')

      const subjectPrefix = reminderNumber === 1
        ? `Zahlungserinnerung: CHF ${totalCHF} ausstehend`
        : reminderNumber === 2
          ? `2. Zahlungserinnerung: CHF ${totalCHF} noch offen`
          : `Letzte Mahnung: Bitte CHF ${totalCHF} begleichen`

      const introText = reminderNumber === 1
        ? `Hallo ${user.first_name},<br><br>für folgende Fahrstunden bei <strong>${tenantName}</strong> ist die Zahlung noch ausstehend:`
        : reminderNumber === 2
          ? `Hallo ${user.first_name},<br><br>wir haben dich bereits erinnert — die folgenden Zahlungen bei <strong>${tenantName}</strong> sind noch offen:`
          : `Hallo ${user.first_name},<br><br>das ist unsere letzte Zahlungsaufforderung. Bitte begleiche die folgenden Beträge so bald wie möglich:`

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
          <div style="background:${primaryColor};padding:28px 32px;text-align:center">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff">Zahlung ausstehend</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${tenantName}</p>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">${introText}</p>

            <!-- Payment table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px">
              <thead>
                <tr style="background:#f9fafb">
                  <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:70%">Termin</th>
                  <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:30%">Betrag</th>
                </tr>
              </thead>
              <tbody>${paymentRows}</tbody>
              <tfoot>
                <tr style="background:#f9fafb">
                  <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#111827">Total</td>
                  <td style="padding:12px 16px;font-size:16px;font-weight:700;color:${primaryColor}">CHF ${totalCHF}</td>
                </tr>
              </tfoot>
            </table>

            <div style="text-align:center;margin:24px 0">
              <a href="${loginLink}" style="display:inline-block;padding:14px 32px;background:${primaryColor};color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                Jetzt online zahlen →
              </a>
            </div>

            <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;text-align:center">
              Melde dich unter <a href="${loginLink}" style="color:${primaryColor}">${loginLink}</a> an und bezahle dort deine offenen Beträge.
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

      toInsert.push({
        tenant_id:       userPayments[0].tenant_id,
        channel:         'email',
        recipient_email: user.email,
        subject:         subjectPrefix,
        body:            emailBody,
        status:          'pending',
        send_at:         now.toISOString(),
        context_data: {
          stage:          'payment_reminder',
          user_id:        userId,
          reminder_day:   reminderDay,
          reminder_number: reminderNumber,
          payment_ids:    userPayments.map((p: any) => p.id),
          total_chf:      totalCHF,
          tenant_name:    tenantName,
        },
      })
    }
  }

  if (toInsert.length === 0) {
    logger.debug('ℹ️ No payment reminders due today')
    return { success: true, queued: 0, skipped: paymentsByUser.size, duration_ms: Date.now() - startTime, message: 'No reminders due today' }
  }

  // ── 7. Insert into queue ─────────────────────────────────────
  const { error: insertError } = await supabase
    .from('outbound_messages_queue')
    .insert(toInsert)

  if (insertError) {
    logger.error('❌ Failed to insert payment reminders:', insertError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to queue payment reminders' })
  }

  const studentEmails = toInsert.length

  logger.debug(`✅ send-payment-reminders: ${studentEmails} emails queued in ${Date.now() - startTime}ms`)

  return {
    success:        true,
    queued:         toInsert.length,
    skipped:        paymentsByUser.size - toInsert.length,
    duration_ms:    Date.now() - startTime,
  }
})
