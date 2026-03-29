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

  // ── 1. Fetch past appointments (linked to the test user or all) ─
  let aptQuery = supabase
    .from('appointments')
    .select('id, user_id, start_time, event_type, driving_category, location_id, tenant_id')
    .lt('start_time', now.toISOString())
    .neq('status', 'cancelled')

  if (testUserId) {
    aptQuery = aptQuery.eq('user_id', testUserId)
  }

  const { data: appointments, error: aptError } = await aptQuery

  if (aptError) {
    logger.error('❌ Failed to fetch appointments:', aptError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch appointments' })
  }

  if (!appointments || appointments.length === 0) {
    return { success: true, queued: 0, skipped: 0, duration_ms: Date.now() - startTime, message: 'No past appointments' }
  }

  const appointmentMap = new Map((appointments as any[]).map((a: any) => [a.id, a]))
  const appointmentIds = [...appointmentMap.keys()]

  // ── 2. Fetch pending wallee payments for those appointments ──
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, appointment_id, total_amount_rappen, payment_status, payment_method')
    .in('appointment_id', appointmentIds)
    .eq('payment_method', 'wallee')
    .in('payment_status', ['pending', 'failed'])

  if (paymentsError) {
    logger.error('❌ Failed to fetch payments:', paymentsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch payments' })
  }

  if (!payments || payments.length === 0) {
    return { success: true, queued: 0, skipped: 0, duration_ms: Date.now() - startTime, message: 'No pending wallee payments for past appointments' }
  }

  // Enrich each payment with user_id + tenant_id from its appointment
  const eligiblePayments = (payments as any[]).map((p: any) => {
    const apt = appointmentMap.get(p.appointment_id)
    return { ...p, user_id: apt?.user_id, tenant_id: apt?.tenant_id }
  }).filter((p: any) => p.user_id)

  // ── 3. Group payments by user ────────────────────────────────
  const paymentsByUser = new Map<string, any[]>()
  for (const payment of eligiblePayments) {
    if (!payment.user_id) continue
    if (!paymentsByUser.has(payment.user_id)) paymentsByUser.set(payment.user_id, [])
    paymentsByUser.get(payment.user_id)!.push(payment)
  }

  // ── 4. Fetch users and tenants ───────────────────────────────
  const userIds    = [...paymentsByUser.keys()]
  const tenantIds  = [...new Set((appointments as any[]).map((a: any) => a.tenant_id).filter(Boolean))]

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
      const totalCHF       = (totalRappen / 100).toFixed(2)

      // ── Build payment rows for email ──────────────────────
      const EVENT_LABELS: Record<string, string> = { lesson: 'Fahrstunde', exam: 'Prüfung', theory: 'Theorie', other: 'Termin' }

      const paymentRows = userPayments.map((p: any) => {
        const apt = appointmentMap.get(p.appointment_id)
        if (!apt) return ''
        const d = new Date(apt.start_time)
        const dateStr = d.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' })
        const timeStr = d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
        const label   = EVENT_LABELS[apt.event_type] || 'Termin'
        const amtCHF  = ((p.total_amount_rappen || 0) / 100).toFixed(2)
        return `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151">${dateStr}, ${timeStr}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151">${label}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;font-weight:600">CHF ${amtCHF}</td>
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
                  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Termin</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Art</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Betrag</th>
                </tr>
              </thead>
              <tbody>${paymentRows}</tbody>
              <tfoot>
                <tr style="background:#f9fafb">
                  <td colspan="2" style="padding:12px;font-size:14px;font-weight:700;color:#111827">Total</td>
                  <td style="padding:12px;font-size:16px;font-weight:700;color:${primaryColor}">CHF ${totalCHF}</td>
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

      // ── Day 14: also notify tenant admin ──────────────────
      if (reminderDay === 14 && tenant?.contact_email) {
        const adminBody = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;padding:32px 16px">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto">
    <tr><td style="background:#fff;border-radius:12px;padding:28px 32px;box-shadow:0 4px 16px rgba(0,0,0,0.10)">
      <h2 style="margin:0 0 16px;color:#dc2626">⚠️ Unbezahlte Rechnung nach 14 Tagen</h2>
      <p style="color:#374151;font-size:15px">
        <strong>${user.first_name} ${user.last_name}</strong> (${user.email}${user.phone ? ', ' + user.phone : ''})<br>
        hat nach 14 Tagen noch <strong>CHF ${totalCHF}</strong> nicht bezahlt.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0">
        <thead><tr style="background:#f9fafb">
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280">Termin</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280">Art</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280">Betrag</th>
        </tr></thead>
        <tbody>${paymentRows}</tbody>
        <tfoot><tr style="background:#f9fafb">
          <td colspan="2" style="padding:10px 12px;font-weight:700;color:#111827">Total</td>
          <td style="padding:10px 12px;font-weight:700;color:#dc2626">CHF ${totalCHF}</td>
        </tr></tfoot>
      </table>
      <p style="color:#6b7280;font-size:13px">Bitte kontaktiere den Schüler direkt für weitere Schritte.</p>
    </td></tr>
  </table>
</body>
</html>`

        toInsert.push({
          tenant_id:       userPayments[0].tenant_id,
          channel:         'email',
          recipient_email: tenant.contact_email,
          subject:         `⚠️ Unbezahlt nach 14 Tagen: ${user.first_name} ${user.last_name} — CHF ${totalCHF}`,
          body:            adminBody,
          status:          'pending',
          send_at:         now.toISOString(),
          context_data: {
            stage:        'payment_reminder_admin',
            user_id:      userId,
            reminder_day: 14,
            payment_ids:  userPayments.map((p: any) => p.id),
            total_chf:    totalCHF,
            tenant_name:  tenantName,
          },
        })
      }
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

  const studentEmails = toInsert.filter((m: any) => m.context_data.stage === 'payment_reminder').length
  const adminEmails   = toInsert.filter((m: any) => m.context_data.stage === 'payment_reminder_admin').length

  logger.debug(`✅ send-payment-reminders: ${studentEmails} student + ${adminEmails} admin emails queued in ${Date.now() - startTime}ms`)

  return {
    success:        true,
    queued:         toInsert.length,
    student_emails: studentEmails,
    admin_emails:   adminEmails,
    skipped:        paymentsByUser.size - studentEmails,
    duration_ms:    Date.now() - startTime,
  }
})
