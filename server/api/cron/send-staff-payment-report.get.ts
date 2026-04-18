// server/api/cron/send-staff-payment-report.get.ts
// ============================================================
// Weekly report for staff members: lists all clients with
// unpaid past appointments assigned to that staff member.
//
// Schedule: every Monday at 06:10 UTC (after admin report)
// Covers:   ALL payment methods (wallee, cash, invoice, twint)
// Groups:   one email per staff member, sorted by oldest first
// Dedup:    max once per staff per week (7-day window)
//
// Test mode: ?test_staff_id=<UUID>
// ============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader, getQuery } from 'h3'

const RESEND_DAYS = 7

function chf(rappen: number): string {
  return (Math.round(Math.round(rappen) / 5) * 5 / 100).toFixed(2)
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-staff-payment-report')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now      = new Date()
  const recentCutoff = new Date(now.getTime() - RESEND_DAYS * 24 * 60 * 60 * 1000)

  const query        = getQuery(event)
  const testStaffId  = typeof query.test_staff_id === 'string' ? query.test_staff_id : null

  if (testStaffId) logger.debug(`🧪 TEST MODE: staff=${testStaffId}`)

  // ── 1. Fetch all pending/failed payments (all methods except free) ──
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, appointment_id, user_id, tenant_id, total_amount_rappen, payment_method, payment_status')
    .in('payment_status', ['pending', 'failed'])
    .not('payment_method', 'eq', 'free')

  if (paymentsError) {
    logger.error('❌ Failed to fetch payments:', paymentsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch payments' })
  }

  if (!payments || payments.length === 0) {
    return { success: true, queued: 0, duration_ms: Date.now() - startTime, message: 'No pending payments' }
  }

  // ── 2. Fetch past appointments with staff_id ─────────────────
  const appointmentIds = [...new Set((payments as any[]).map((p: any) => p.appointment_id).filter(Boolean))]

  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('id, start_time, staff_id, type, event_type_code')
    .in('id', appointmentIds)
    .lt('start_time', now.toISOString())
    .neq('status', 'cancelled')

  if (aptError) {
    logger.error('❌ Failed to fetch appointments:', aptError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch appointments' })
  }

  if (!appointments || appointments.length === 0) {
    return { success: true, queued: 0, duration_ms: Date.now() - startTime, message: 'No past appointments with pending payments' }
  }

  const appointmentMap = new Map((appointments as any[]).map((a: any) => [a.id, a]))

  // Keep only payments with a past appointment that has a staff_id
  const eligiblePayments = (payments as any[]).filter((p: any) => {
    const apt = appointmentMap.get(p.appointment_id)
    return apt && apt.staff_id
  })

  if (eligiblePayments.length === 0) {
    return { success: true, queued: 0, duration_ms: Date.now() - startTime, message: 'No eligible payments with assigned staff' }
  }

  // ── 3. Group payments by staff_id ────────────────────────────
  const paymentsByStaff = new Map<string, any[]>()
  for (const p of eligiblePayments) {
    const apt = appointmentMap.get(p.appointment_id)
    const staffId = apt?.staff_id
    if (!staffId) continue
    if (testStaffId && staffId !== testStaffId) continue
    if (!paymentsByStaff.has(staffId)) paymentsByStaff.set(staffId, [])
    paymentsByStaff.get(staffId)!.push(p)
  }

  if (paymentsByStaff.size === 0) {
    return { success: true, queued: 0, duration_ms: Date.now() - startTime, message: 'No data for specified staff' }
  }

  // ── 4. Fetch staff users + clients + tenants ─────────────────
  const staffIds  = [...paymentsByStaff.keys()]
  const clientIds = [...new Set(eligiblePayments.map((p: any) => p.user_id).filter(Boolean))]
  const tenantIds = [...new Set(eligiblePayments.map((p: any) => p.tenant_id).filter(Boolean))]

  const [{ data: staffUsers }, { data: clients }, { data: tenants }] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, email, tenant_id')
      .in('id', staffIds)
      .eq('is_active', true),
    supabase
      .from('users')
      .select('id, first_name, last_name, email, phone')
      .in('id', clientIds),
    supabase
      .from('tenants')
      .select('id, name, primary_color, logo_wide_url, logo_url, logo_square_url, slug')
      .in('id', tenantIds),
  ])

  const staffMap  = new Map((staffUsers  || []).map((u: any) => [u.id, u]))
  const clientMap = new Map((clients     || []).map((u: any) => [u.id, u]))
  const tenantMap = new Map((tenants     || []).map((t: any) => [t.id, t]))

  // ── 5. Deduplication: skip if already sent this week ─────────
  let recentlySent = new Set<string>()
  if (!testStaffId) {
    const { data: existing } = await supabase
      .from('outbound_messages_queue')
      .select('context_data')
      .eq('context_data->>stage' as any, 'staff_payment_report')
      .in('context_data->>staff_id' as any, staffIds)
      .in('status', ['pending', 'sending', 'sent'])
      .gte('created_at', recentCutoff.toISOString())

    ;(existing || []).forEach((row: any) => {
      if (row.context_data?.staff_id) recentlySent.add(row.context_data.staff_id)
    })
  }

  // ── 6. Build one email per staff member ──────────────────────
  const toInsert: any[] = []

  for (const [staffId, staffPayments] of paymentsByStaff) {
    if (recentlySent.has(staffId)) {
      logger.debug(`⏭️ Staff payment report already sent this week for staff ${staffId}`)
      continue
    }

    const staff = staffMap.get(staffId)
    if (!staff?.email) continue

    const tenant       = tenantMap.get(staffPayments[0].tenant_id)
    const tenantName   = tenant?.name   || 'Ihre Fahrschule'
    const primaryColor = tenant?.primary_color || '#2563eb'
    const logoUrl      = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
    const tenantSlug   = tenant?.slug   || ''
    const adminLink    = tenantSlug ? `https://simy.ch/${tenantSlug}/admin` : 'https://simy.ch'

    const totalRappen = staffPayments.reduce((s: number, p: any) => s + (p.total_amount_rappen || 0), 0)
    const totalCHF    = chf(totalRappen)
    const reportDate  = now.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    // Sort by appointment date ascending (oldest first = most urgent)
    const sortedPayments = [...staffPayments].sort((a, b) => {
      const tA = new Date(appointmentMap.get(a.appointment_id)?.start_time || 0).getTime()
      const tB = new Date(appointmentMap.get(b.appointment_id)?.start_time || 0).getTime()
      return tA - tB
    })

    const paymentRows = sortedPayments.map((p: any) => {
      const apt     = appointmentMap.get(p.appointment_id)
      const client  = clientMap.get(p.user_id)
      const d       = new Date(apt?.start_time || now)
      const tzOpts  = { timeZone: 'Europe/Zurich' }
      const dateStr = d.toLocaleDateString('de-CH', { ...tzOpts, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      const timeStr = d.toLocaleTimeString('de-CH', { ...tzOpts, hour: '2-digit', minute: '2-digit' })
      const name    = client ? `${client.first_name} ${client.last_name}` : '—'
      const phone   = client?.phone || ''
      const amt     = chf(p.total_amount_rappen || 0)

      return `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6">
            <div style="font-size:14px;font-weight:600;color:#111827">${name}</div>
            ${phone ? `<div style="font-size:12px;color:#9ca3af;margin-top:2px">${phone}</div>` : ''}
          </td>
          <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;text-align:right">
            <div style="font-size:14px;font-weight:700;color:#dc2626">CHF ${amt}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px">${dateStr}, ${timeStr}</div>
          </td>
        </tr>`
    }).join('')

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${tenantName}" style="height:32px;max-width:160px;object-fit:contain;display:block;margin:0 auto 16px">`
      : `<div style="display:inline-block;width:36px;height:36px;border-radius:8px;background:${primaryColor};color:white;font-size:18px;font-weight:700;line-height:36px;text-align:center;margin:0 auto 16px">${tenantName.charAt(0).toUpperCase()}</div>`

    const emailBody = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

        <tr><td style="text-align:center;padding-bottom:16px">${logoHtml}</td></tr>

        <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)">

          <!-- Header -->
          <div style="background:${primaryColor};padding:24px 28px">
            <h1 style="margin:0;font-size:18px;font-weight:700;color:#fff">Offene Zahlungen – Deine Schüler</h1>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8)">${reportDate} · ${tenantName}</p>
          </div>

          <!-- Intro -->
          <div style="padding:20px 28px 0">
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">
              Hallo ${staff.first_name},<br><br>
              folgende Schüler haben noch ausstehende Zahlungen für vergangene Fahrstunden:
            </p>
          </div>

          <!-- Summary bar -->
          <div style="margin:16px 28px;background:#fef2f2;border-radius:8px;padding:14px 16px;display:flex;align-items:center">
            <span style="font-size:13px;color:#6b7280">${staffPayments.length} offene Zahlung${staffPayments.length !== 1 ? 'en' : ''}</span>
            <span style="margin-left:auto;font-size:20px;font-weight:700;color:#dc2626">CHF ${totalCHF}</span>
          </div>

          <!-- Payment table -->
          <div style="padding:0 0 8px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead>
                <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb">
                  <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Schüler</th>
                  <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Betrag / Termin</th>
                </tr>
              </thead>
              <tbody>${paymentRows}</tbody>
              <tfoot>
                <tr style="background:#f9fafb">
                  <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#111827">Total ausstehend</td>
                  <td style="padding:12px 14px;font-size:16px;font-weight:700;color:#dc2626;text-align:right">CHF ${totalCHF}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Footer -->
          <div style="background:#f9fafb;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af">${tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></p>
          </div>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    toInsert.push({
      tenant_id:       staffPayments[0].tenant_id,
      channel:         'email',
      recipient_email: staff.email,
      subject:         `${staffPayments.length} offene Zahlung${staffPayments.length !== 1 ? 'en' : ''} deiner Schüler – CHF ${totalCHF}`,
      body:            emailBody,
      status:          'pending',
      send_at:         now.toISOString(),
      context_data: {
        stage:       'staff_payment_report',
        staff_id:    staffId,
        tenant_id:   staffPayments[0].tenant_id,
        tenant_name: tenantName,
        total_chf:   totalCHF,
        count:       staffPayments.length,
      },
    })
  }

  if (toInsert.length === 0) {
    logger.debug('ℹ️ No staff payment reports to send today')
    return { success: true, queued: 0, skipped: paymentsByStaff.size, duration_ms: Date.now() - startTime, message: 'No reports due' }
  }

  // ── 7. Insert into queue ──────────────────────────────────────
  const { error: insertError } = await supabase
    .from('outbound_messages_queue')
    .insert(toInsert)

  if (insertError) {
    logger.error('❌ Failed to insert staff payment reports:', insertError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to queue staff payment reports' })
  }

  logger.debug(`✅ send-staff-payment-report: queued ${toInsert.length} report(s) in ${Date.now() - startTime}ms`)

  return {
    success:     true,
    queued:      toInsert.length,
    skipped:     paymentsByStaff.size - toInsert.length,
    duration_ms: Date.now() - startTime,
  }
})
