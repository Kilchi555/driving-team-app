// server/api/cron/send-booking-proposal-reminders.get.ts
// ============================================================
// Sends a daily digest email to tenant admins listing all
// open (pending) booking proposals.
// Only sends if there are actually open proposals.
//
// Schedule: daily at 07:30 UTC (09:30 CH time)
// ============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { sendTenantEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-booking-proposal-reminders')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()

  // Fetch all pending proposals grouped by tenant
  const { data: proposals, error } = await supabase
    .from('booking_proposals')
    .select(`
      id,
      first_name,
      last_name,
      category_code,
      duration_minutes,
      created_at,
      status,
      tenant_id,
      tenant:tenants!inner(id, name, slug, contact_email, primary_color)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('❌ Failed to fetch pending booking proposals:', error)
    throw createError({ statusCode: 500, statusMessage: 'DB error' })
  }

  if (!proposals || proposals.length === 0) {
    logger.debug('✅ No pending booking proposals — skipping reminder emails')
    return { sent: 0, skipped: true }
  }

  // Group by tenant_id
  const byTenant = new Map<string, { tenant: any; proposals: any[] }>()
  for (const p of proposals) {
    const tenant = p.tenant as any
    if (!byTenant.has(p.tenant_id)) {
      byTenant.set(p.tenant_id, { tenant, proposals: [] })
    }
    byTenant.get(p.tenant_id)!.proposals.push(p)
  }

  let sent = 0
  let skipped = 0

  for (const [tenantId, { tenant, proposals: tenantProposals }] of byTenant) {
    const adminEmail = tenant?.contact_email
    if (!adminEmail) {
      logger.warn(`⚠️ Tenant ${tenantId} has no contact_email — skipping`)
      skipped++
      continue
    }

    const count = tenantProposals.length
    const appUrl = `https://app.simy.ch`
    const primaryColor = tenant?.primary_color || '#111827'

    const proposalRows = tenantProposals.map((p: any) => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unbekannt'
      const category = p.category_code || 'Allgemeine Anfrage'
      const received = new Date(p.created_at).toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      return `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 10px 12px; font-size: 14px; color: #111827; font-weight: 500;">${name}</td>
          <td style="padding: 10px 12px; font-size: 14px; color: #6b7280;">${category}</td>
          <td style="padding: 10px 12px; font-size: 13px; color: #9ca3af; white-space: nowrap;">${received}</td>
        </tr>`
    }).join('')

    const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: ${primaryColor}; padding: 24px 32px;">
      <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">${tenant.name}</h1>
      <p style="margin: 4px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Tägliche Erinnerung – Offene Anfragen</p>
    </div>

    <!-- Body -->
    <div style="padding: 28px 32px;">
      <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #111827;">
        ${count === 1 ? 'Es liegt 1 offene Anfrage vor.' : `Es liegen ${count} offene Anfragen vor.`}
      </p>
      <p style="margin: 0 0 24px; font-size: 14px; color: #6b7280;">
        Bitte diese zeitnah bearbeiten, damit Interessenten nicht auf eine Antwort warten müssen.
      </p>

      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">Name</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">Kategorie</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">Eingegangen</th>
          </tr>
        </thead>
        <tbody>${proposalRows}</tbody>
      </table>

      <!-- CTA -->
      <div style="margin-top: 28px; text-align: center;">
        <a href="${appUrl}" style="display: inline-block; background: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
          Anfragen jetzt öffnen →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #f3f4f6;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
        Diese E-Mail wird täglich versendet, solange offene Anfragen vorhanden sind.
      </p>
    </div>
  </div>
</body>
</html>`

    try {
      await sendTenantEmail(tenantId, {
        to: adminEmail,
        subject: `${count === 1 ? '1 offene Anfrage' : `${count} offene Anfragen`} – ${tenant.name}`,
        html
      })
      sent++
      logger.debug(`✅ Reminder sent to ${adminEmail} (${count} proposals) for tenant ${tenant.name}`)
    } catch (err) {
      logger.error(`❌ Failed to send reminder to ${adminEmail}:`, err)
      skipped++
    }
  }

  const elapsed = Date.now() - startTime
  logger.debug(`📊 send-booking-proposal-reminders done in ${elapsed}ms — sent: ${sent}, skipped: ${skipped}`)

  return { sent, skipped, elapsed }
})
