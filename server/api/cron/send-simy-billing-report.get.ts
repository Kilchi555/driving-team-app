// server/api/cron/send-simy-billing-report.get.ts
// ============================================================
// Weekly Simy super-admin billing overview for info@simy.ch.
// Shows all tenant Stripe subscription payments from the
// past 7 days (successes + failures) and total MRR snapshot.
//
// Schedule: every Monday at 07:00 UTC (after per-tenant reports)
// Recipient: info@simy.ch
// ============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

// Approximate monthly prices in CHF (Rappen) — kept in sync with Stripe manually
const PLAN_PRICES: Record<string, number> = {
  starter:      4900,   // CHF 49.–
  professional: 9900,   // CHF 99.–
  enterprise:   19900,  // CHF 199.–
}
const SEAT_PRICE = 1900  // CHF 19.– per extra seat

function chf(rappen: number): string {
  return `CHF ${(rappen / 100).toFixed(2).replace('.', '.')}.–`
}

function estimateMRR(plan: string, addonSeats: number): number {
  return (PLAN_PRICES[plan] ?? 0) + (addonSeats || 0) * SEAT_PRICE
}

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-simy-billing-report')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // ── 1. All non-trial tenants ──────────────────────────────────────────────
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name, contact_email, subscription_plan, addon_seats, addon_courses_enabled, addon_affiliate_enabled, current_period_end, is_active, created_at, slug')
    .neq('subscription_plan', 'trial')
    .not('subscription_plan', 'is', null)
    .order('created_at', { ascending: false })

  if (tenantsError) {
    logger.error('❌ Billing report: failed to fetch tenants:', tenantsError)
    throw createError({ statusCode: 500, statusMessage: 'DB error' })
  }

  if (!tenants || tenants.length === 0) {
    logger.debug('ℹ️ Billing report: no paying tenants yet')
    return { success: true, message: 'No paying tenants' }
  }

  // ── 2. Subscription status per tenant ─────────────────────────────────────
  const tenantIds = tenants.map(t => t.id)
  const { data: statusRows } = await supabase
    .from('tenant_settings')
    .select('tenant_id, setting_value')
    .in('tenant_id', tenantIds)
    .eq('setting_key', 'subscription_status')

  const statusMap = new Map<string, { status: string; failed_at?: string }>()
  for (const row of statusRows ?? []) {
    try { statusMap.set(row.tenant_id, JSON.parse(row.setting_value)) } catch { /* skip */ }
  }

  // ── 3. Categorise tenants ─────────────────────────────────────────────────
  // Successful billing this week: current_period_end ~1 month in the future → billed recently
  const successfulThisWeek = tenants.filter(t => {
    if (!t.current_period_end) return false
    const periodEnd = new Date(t.current_period_end)
    // If period ends within 20–35 days → billed within last ~7 days (monthly cycle)
    const daysUntilEnd = (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntilEnd >= 20 && daysUntilEnd <= 35 && statusMap.get(t.id)?.status !== 'past_due'
  })

  // Failed payments this week
  const failedThisWeek = tenants.filter(t => {
    const st = statusMap.get(t.id)
    if (st?.status !== 'past_due' || !st.failed_at) return false
    return new Date(st.failed_at) >= weekAgo
  })

  // All past_due (ongoing)
  const allPastDue = tenants.filter(t => statusMap.get(t.id)?.status === 'past_due')

  // New this week
  const newThisWeek = tenants.filter(t => new Date(t.created_at) >= weekAgo)

  // ── 4. MRR snapshot ───────────────────────────────────────────────────────
  const totalMRR = tenants.reduce((sum, t) => sum + estimateMRR(t.subscription_plan, t.addon_seats), 0)
  const activeMRR = tenants
    .filter(t => statusMap.get(t.id)?.status !== 'past_due')
    .reduce((sum, t) => sum + estimateMRR(t.subscription_plan, t.addon_seats), 0)

  // ── 5. Build email ────────────────────────────────────────────────────────
  const reportDate = now.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const tenantRow = (t: any, status?: string) => {
    const mrr = estimateMRR(t.subscription_plan, t.addon_seats)
    const addons = [
      t.addon_seats > 0 ? `+${t.addon_seats} Seats` : '',
      t.addon_courses_enabled ? 'Kurse' : '',
      t.addon_affiliate_enabled ? 'Affiliate' : '',
    ].filter(Boolean).join(', ')

    return `<tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:9px 12px;font-size:13px;font-weight:500;color:#111827">${t.name || t.id}</td>
      <td style="padding:9px 12px;font-size:13px;color:#6b7280">${t.contact_email || '–'}</td>
      <td style="padding:9px 12px;font-size:13px;color:#374151">${t.subscription_plan}</td>
      <td style="padding:9px 12px;font-size:12px;color:#9ca3af">${addons || '–'}</td>
      <td style="padding:9px 12px;font-size:13px;font-weight:600;color:#374151;text-align:right">${chf(mrr)}/Mt</td>
      ${status ? `<td style="padding:9px 12px;font-size:12px;font-weight:600;color:${status === '✅' ? '#16a34a' : '#dc2626'};text-align:center">${status}</td>` : ''}
    </tr>`
  }

  const tableHeader = (withStatus = false) => `
    <thead>
      <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb">
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase">Fahrschule</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase">E-Mail</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase">Plan</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase">Add-ons</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase">MRR</th>
        ${withStatus ? '<th style="padding:8px 12px;text-align:center;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase">Status</th>' : ''}
      </tr>
    </thead>`

  const successSection = successfulThisWeek.length > 0 ? `
    <h3 style="margin:24px 28px 4px;font-size:15px;color:#16a34a">✅ Eingegangene Zahlungen (${successfulThisWeek.length})</h3>
    <p style="margin:0 28px 12px;font-size:12px;color:#6b7280">Tenants deren Abrechnungszeitraum diese Woche verlängert wurde</p>
    <div style="padding:0 0 8px">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${tableHeader(false)}
        <tbody>${successfulThisWeek.map(t => tenantRow(t)).join('')}</tbody>
      </table>
    </div>` : `
    <div style="margin:24px 28px 12px;padding:12px 16px;background:#f0fdf4;border-radius:8px;font-size:13px;color:#15803d">
      ✅ Keine Zahlungseingänge diese Woche (oder alle bereits länger aktiv)
    </div>`

  const failedSection = failedThisWeek.length > 0 ? `
    <h3 style="margin:24px 28px 4px;font-size:15px;color:#dc2626">❌ Fehlgeschlagene Zahlungen diese Woche (${failedThisWeek.length})</h3>
    <p style="margin:0 28px 12px;font-size:12px;color:#6b7280">Stripe wird automatisch nochmals versuchen (bis zu 4× in ~2 Wochen)</p>
    <div style="padding:0 0 8px">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${tableHeader(false)}
        <tbody>${failedThisWeek.map(t => tenantRow(t, '❌')).join('')}</tbody>
      </table>
    </div>` : `
    <div style="margin:24px 28px 12px;padding:12px 16px;background:#fef2f2;border-radius:8px;font-size:13px;color:#dc2626">
      Keine neuen Zahlungsfehler diese Woche
    </div>`

  const pastDueSection = allPastDue.length > 0 ? `
    <h3 style="margin:24px 28px 4px;font-size:15px;color:#b45309">⚠️ Aktuell ausstehend / past_due (${allPastDue.length})</h3>
    <p style="margin:0 28px 12px;font-size:12px;color:#6b7280">Diese Tenants haben ungelöste Zahlungsprobleme</p>
    <div style="padding:0 0 8px">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${tableHeader(false)}
        <tbody>${allPastDue.map(t => tenantRow(t, '⚠️')).join('')}</tbody>
      </table>
    </div>` : ''

  const newSection = newThisWeek.length > 0 ? `
    <h3 style="margin:24px 28px 4px;font-size:15px;color:#2563eb">🆕 Neue Abonnenten diese Woche (${newThisWeek.length})</h3>
    <div style="padding:0 0 8px">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${tableHeader(false)}
        <tbody>${newThisWeek.map(t => tenantRow(t)).join('')}</tbody>
      </table>
    </div>` : ''

  const emailBody = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px">

        <tr><td style="text-align:center;padding-bottom:16px">
          <div style="display:inline-block;width:44px;height:44px;border-radius:10px;background:#2563eb;color:white;font-size:22px;font-weight:700;line-height:44px;text-align:center;margin:0 auto 8px">S</div>
          <p style="margin:0;font-size:13px;color:#6b7280">Simy Super-Admin Report</p>
        </td></tr>

        <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:24px 28px">
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff">📊 Wöchentlicher Billing-Report</h1>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8)">${reportDate}</p>
          </div>

          <!-- KPI Bar -->
          <div style="display:flex;background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:0">
            <div style="flex:1;padding:18px 20px;border-right:1px solid #e5e7eb;text-align:center">
              <div style="font-size:24px;font-weight:800;color:#1e40af">${tenants.length}</div>
              <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Zahlende Tenants</div>
            </div>
            <div style="flex:1;padding:18px 20px;border-right:1px solid #e5e7eb;text-align:center">
              <div style="font-size:24px;font-weight:800;color:#16a34a">${chf(activeMRR)}</div>
              <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Akt. MRR (geschätzt)</div>
            </div>
            <div style="flex:1;padding:18px 20px;border-right:1px solid #e5e7eb;text-align:center">
              <div style="font-size:24px;font-weight:800;color:${failedThisWeek.length > 0 ? '#dc2626' : '#16a34a'}">${failedThisWeek.length}</div>
              <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Fehlgeschlagen (7T)</div>
            </div>
            <div style="flex:1;padding:18px 20px;text-align:center">
              <div style="font-size:24px;font-weight:800;color:#2563eb">${newThisWeek.length}</div>
              <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Neu (7T)</div>
            </div>
          </div>

          <!-- Sections -->
          ${successSection}
          ${failedSection}
          ${pastDueSection}
          ${newSection}

          <!-- All Tenants -->
          <h3 style="margin:24px 28px 4px;font-size:15px;color:#374151">📋 Alle zahlenden Tenants (${tenants.length})</h3>
          <p style="margin:0 28px 12px;font-size:12px;color:#6b7280">Gesamt MRR (geschätzt): <strong>${chf(totalMRR)}/Mt</strong></p>
          <div style="padding:0 0 16px">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${tableHeader(true)}
              <tbody>${tenants.map(t => tenantRow(t, statusMap.get(t.id)?.status === 'past_due' ? '⚠️' : '✅')).join('')}</tbody>
            </table>
          </div>

          <!-- Footer -->
          <div style="background:#f9fafb;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af">
              Simy.ch Super-Admin Report · Automatisch generiert · 
              <a href="https://dashboard.stripe.com/subscriptions" style="color:#2563eb;text-decoration:none">Stripe Dashboard →</a>
            </p>
          </div>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  // ── 6. Send ────────────────────────────────────────────────────────────────
  await sendEmail({
    to: 'info@simy.ch',
    subject: `📊 Simy Billing-Report ${now.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })} – ${tenants.length} Tenants · ${chf(activeMRR)}/Mt MRR`,
    html: emailBody
  })

  logger.debug(`✅ send-simy-billing-report: sent report (${tenants.length} tenants, MRR ${chf(activeMRR)})`)

  return {
    success: true,
    tenants: tenants.length,
    mrr_chf: activeMRR / 100,
    failed_this_week: failedThisWeek.length,
    new_this_week: newThisWeek.length,
  }
})
