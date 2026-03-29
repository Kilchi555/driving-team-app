// server/api/cron/send-admin-payment-report.get.ts
// ============================================================
// Weekly admin payment report for tenant admins.
//
// Schedule: every Monday at 06:00 UTC
// Recipient: tenant.contact_email
// Shows ALL pending payments (wallee, cash, invoice, twint)
// for past appointments, grouped by payment method.
//
// Test mode: ?test_tenant_id=<UUID>
// ============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader, getQuery } from 'h3'

// Swiss rounding: nearest 0.05 CHF
function chf(rappen: number): string {
  return (Math.round(Math.round(rappen) / 5) * 5 / 100).toFixed(2)
}

const METHOD_LABELS: Record<string, string> = {
  wallee:  '💳 Online (Wallee)',
  cash:    '💵 Bar',
  invoice: '📄 Rechnung',
  twint:   '📱 TWINT',
  free:    '🎁 Kostenlos',
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-admin-payment-report')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now      = new Date()

  const query         = getQuery(event)
  const testTenantId  = typeof query.test_tenant_id === 'string' ? query.test_tenant_id : null

  if (testTenantId) logger.debug(`🧪 TEST MODE: tenant=${testTenantId}`)

  // ── 1. All pending payments for past appointments ────────────
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
    return { success: true, sent: 0, duration_ms: Date.now() - startTime, message: 'No pending payments' }
  }

  // ── 2. Past appointments only ────────────────────────────────
  const appointmentIds = [...new Set((payments as any[]).map((p: any) => p.appointment_id).filter(Boolean))]
  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('id, start_time')
    .in('id', appointmentIds)
    .lt('start_time', now.toISOString())
    .neq('status', 'cancelled')

  if (aptError) {
    logger.error('❌ Failed to fetch appointments:', aptError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch appointments' })
  }

  if (!appointments || appointments.length === 0) {
    return { success: true, sent: 0, duration_ms: Date.now() - startTime, message: 'No past appointments with pending payments' }
  }

  const appointmentMap = new Map((appointments as any[]).map((a: any) => [a.id, a]))
  const eligiblePayments = (payments as any[]).filter((p: any) => appointmentMap.has(p.appointment_id))

  if (eligiblePayments.length === 0) {
    return { success: true, sent: 0, duration_ms: Date.now() - startTime, message: 'No eligible payments' }
  }

  // ── 3. Group by tenant ───────────────────────────────────────
  const paymentsByTenant = new Map<string, any[]>()
  for (const p of eligiblePayments) {
    if (!p.tenant_id) continue
    if (testTenantId && p.tenant_id !== testTenantId) continue
    if (!paymentsByTenant.has(p.tenant_id)) paymentsByTenant.set(p.tenant_id, [])
    paymentsByTenant.get(p.tenant_id)!.push(p)
  }

  if (paymentsByTenant.size === 0) {
    return { success: true, sent: 0, duration_ms: Date.now() - startTime, message: 'No data for specified tenant' }
  }

  // ── 4. Fetch tenants + users ─────────────────────────────────
  const tenantIds = [...paymentsByTenant.keys()]
  const userIds   = [...new Set(eligiblePayments.map((p: any) => p.user_id).filter(Boolean))]

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, primary_color, logo_wide_url, logo_url, logo_square_url, contact_email')
    .in('id', tenantIds)

  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone')
    .in('id', userIds)

  const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]))
  const userMap   = new Map((users   || []).map((u: any) => [u.id, u]))

  // ── 5. Build and send one email per tenant ───────────────────
  const toInsert: any[] = []

  for (const [tenantId, tenantPayments] of paymentsByTenant) {
    const tenant = tenantMap.get(tenantId)
    if (!tenant?.contact_email) continue

    const tenantName   = tenant.name || 'Ihre Fahrschule'
    const primaryColor = tenant.primary_color || '#2563eb'
    const logoUrl      = tenant.logo_wide_url || tenant.logo_url || tenant.logo_square_url || null
    const reportDate   = now.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    // Group by payment method
    const byMethod = new Map<string, any[]>()
    for (const p of tenantPayments) {
      if (!byMethod.has(p.payment_method)) byMethod.set(p.payment_method, [])
      byMethod.get(p.payment_method)!.push(p)
    }

    const totalRappen = tenantPayments.reduce((s: number, p: any) => s + (p.total_amount_rappen || 0), 0)
    const totalCHF    = chf(totalRappen)

    // Build method sections
    const methodSections = [...byMethod.entries()].map(([method, methodPayments]) => {
      const methodTotal = chf(methodPayments.reduce((s: number, p: any) => s + (p.total_amount_rappen || 0), 0))
      const rows = methodPayments.map((p: any) => {
        const apt     = appointmentMap.get(p.appointment_id)
        const user    = userMap.get(p.user_id)
        const d       = new Date(apt?.start_time || now)
        const dateStr = d.toLocaleDateString('de-CH', { day: 'numeric', month: 'short' })
        const daysAgo = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
        const name    = user ? `${user.first_name} ${user.last_name}` : '—'
        const contact = [user?.email, user?.phone].filter(Boolean).join(' · ')
        const amt     = chf(p.total_amount_rappen || 0)
        return `
          <tr>
            <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;font-weight:500">${name}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280">${dateStr}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af">${daysAgo}T</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:600;color:#374151;text-align:right">CHF ${amt}</td>
          </tr>
          <tr>
            <td colspan="4" style="padding:2px 12px 8px;border-bottom:1px solid #f3f4f6;font-size:11px;color:#9ca3af">${contact}</td>
          </tr>`
      }).join('')

      return `
        <tr><td colspan="4" style="padding:14px 12px 6px;background:#f9fafb">
          <span style="font-size:13px;font-weight:700;color:#374151">${METHOD_LABELS[method] || method}</span>
          <span style="float:right;font-size:13px;font-weight:600;color:#374151">CHF ${methodTotal}</span>
        </td></tr>
        ${rows}`
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
            <h1 style="margin:0;font-size:18px;font-weight:700;color:#fff">Wochenbericht: Offene Zahlungen</h1>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8)">${reportDate} · ${tenantName}</p>
          </div>

          <!-- Summary bar -->
          <div style="background:#f9fafb;padding:16px 28px;border-bottom:1px solid #e5e7eb;display:flex">
            <span style="font-size:13px;color:#6b7280">${tenantPayments.length} offene Zahlung${tenantPayments.length !== 1 ? 'en' : ''}</span>
            <span style="margin-left:auto;font-size:18px;font-weight:700;color:#dc2626">CHF ${totalCHF}</span>
          </div>

          <!-- Payment table -->
          <div style="padding:0 0 8px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead>
                <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Schüler</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Termin</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Alter</th>
                  <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Betrag</th>
                </tr>
              </thead>
              <tbody>${methodSections}</tbody>
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
      tenant_id:       tenantId,
      channel:         'email',
      recipient_email: tenant.contact_email,
      subject:         `Wochenbericht: ${tenantPayments.length} offene Zahlungen — CHF ${totalCHF}`,
      body:            emailBody,
      status:          'pending',
      send_at:         now.toISOString(),
      context_data: {
        stage:       'admin_payment_report',
        tenant_id:   tenantId,
        tenant_name: tenantName,
        total_chf:   totalCHF,
        count:       tenantPayments.length,
      },
    })
  }

  if (toInsert.length === 0) {
    return { success: true, sent: 0, duration_ms: Date.now() - startTime, message: 'No reports to send' }
  }

  const { error: insertError } = await supabase
    .from('outbound_messages_queue')
    .insert(toInsert)

  if (insertError) {
    logger.error('❌ Failed to insert admin payment reports:', insertError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to queue admin reports' })
  }

  logger.debug(`✅ send-admin-payment-report: queued ${toInsert.length} report(s) in ${Date.now() - startTime}ms`)

  return {
    success:     true,
    sent:        toInsert.length,
    duration_ms: Date.now() - startTime,
  }
})
