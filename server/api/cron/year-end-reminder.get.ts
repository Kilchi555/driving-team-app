/**
 * GET /api/cron/year-end-reminder
 *
 * Sends reminder emails to tenant admins asking them to verify
 * that all staff hours for the previous year have been entered.
 *
 * Triggered twice:
 *   Jan 2nd  08:00  – gentle first reminder
 *   Jan 9th  08:00  – final reminder with Jan 15th deadline
 *
 * The round is determined automatically from the current date.
 */
import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const secret = event.node.req.headers.authorization?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - invalid CRON_SECRET' })
  }

  const now = new Date()
  const day = now.getDate()   // 1-31
  const month = now.getMonth() + 1 // 1-based
  const prevYear = now.getFullYear() - 1

  // Determine which round: Jan 2–8 = round 1, Jan 9–15 = round 2
  const isJanuary = month === 1
  const round = (isJanuary && day <= 8) ? 1 : (isJanuary && day <= 15) ? 2 : null
  if (!round) {
    return { success: true, skipped: true, reason: 'Not in reminder window' }
  }

  const supabase = getSupabaseAdmin()

  // Load all tenants that have at least one monthly-salary staff member
  const { data: monthlyStaff } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('role', 'staff')
    .eq('salary_type', 'monthly')

  const tenantIds = [...new Set((monthlyStaff || []).map((u: any) => u.tenant_id))]
  if (tenantIds.length === 0) return { success: true, emailsSent: 0 }

  // Load admin users + tenant info for those tenants
  const { data: admins } = await supabase
    .from('users')
    .select('email, first_name, tenant_id, tenants(name, from_email, resend_domain_verified)')
    .eq('role', 'admin')
    .in('tenant_id', tenantIds)

  // Load monthly-salary staff for those tenants
  const { data: staffUsers } = await supabase
    .from('users')
    .select('email, first_name, tenant_id, tenants(name, from_email, resend_domain_verified)')
    .eq('role', 'staff')
    .eq('salary_type', 'monthly')
    .in('tenant_id', tenantIds)

  // Merge: admins get "admin" copy, staff get personalised copy
  const recipients: Array<{ email: string; first_name: string; tenant_id: string; tenant: any; isAdmin: boolean }> = [
    ...(admins || []).map((u: any) => ({ ...u, tenant: u.tenants, isAdmin: true })),
    ...(staffUsers || []).map((u: any) => ({ ...u, tenant: u.tenants, isAdmin: false })),
  ]

  let emailsSent = 0
  for (const recipient of recipients) {
    if (!recipient.email) continue
    const tenant = recipient.tenant
    const tenantName = tenant?.name || 'Ihre Fahrschule'

    const subject = round === 1
      ? `Jahresabschluss ${prevYear}: Bitte Arbeitsstunden prüfen`
      : `Letzte Erinnerung: Arbeitsstunden ${prevYear} bis 15. Januar vervollständigen`

    const urgencyBlock = round === 2
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
           <strong style="color:#dc2626;">⏰ Deadline: 15. Januar ${now.getFullYear()}</strong><br>
           <span style="color:#7f1d1d;font-size:14px;">Nach dem 15. Januar werden die Jahresstunden finalisiert und der Saldo automatisch ins neue Jahr übertragen.</span>
         </div>`
      : `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
           <strong style="color:#d97706;">📅 Deadline: 15. Januar ${now.getFullYear()}</strong><br>
           <span style="color:#78350f;font-size:14px;">Du hast bis zum 15. Januar Zeit, allfällige Nachträge vorzunehmen.</span>
         </div>`

    const bodyText = recipient.isAdmin
      ? (round === 1
          ? `Das Jahr ${prevYear} ist abgeschlossen. Bitte überprüfe, ob alle Arbeitsstunden deiner Monatslohn-Mitarbeiter vollständig und korrekt erfasst sind.`
          : `Dies ist die letzte Erinnerung: Bitte stelle sicher, dass alle Arbeitsstunden für ${prevYear} bis zum <strong>15. Januar</strong> erfasst sind.`)
      : (round === 1
          ? `Das Jahr ${prevYear} ist abgeschlossen. Bitte überprüfe, ob deine Arbeitsstunden vollständig und korrekt erfasst sind.`
          : `Dies ist die letzte Erinnerung: Bitte stelle sicher, dass deine Arbeitsstunden für ${prevYear} bis zum <strong>15. Januar</strong> korrekt eingetragen sind.`)

    const checklistItems = recipient.isAdmin
      ? `<li>Sind alle Dezember-Stunden aller Mitarbeiter korrekt im System?</li>
         <li>Wurden Krankheitstage korrekt eingetragen?</li>
         <li>Stimmt der Ferien-Saldo?</li>`
      : `<li>Sind deine Dezember-Stunden vollständig erfasst?</li>
         <li>Wurden deine Krankheitstage eingetragen?</li>
         <li>Stimmt dein aktueller Saldo?</li>`

    const ctaLink = recipient.isAdmin
      ? `${process.env.APP_URL || 'https://app.simy.ch'}/admin/staff-hours`
      : `${process.env.APP_URL || 'https://app.simy.ch'}/settings`

    const ctaLabel = recipient.isAdmin ? 'Arbeitsstunden prüfen →' : 'Meine Stunden prüfen →'

    const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <!-- Header -->
        <tr><td style="background:#1e40af;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">📋 Jahresabschluss ${prevYear}</h1>
          <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">${tenantName}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#374151;font-size:15px;">
            Hallo ${recipient.first_name || (recipient.isAdmin ? 'Admin' : 'Team')},
          </p>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;">${bodyText}</p>
          ${urgencyBlock}
          <p style="margin:16px 0;color:#374151;font-size:14px;">Was du prüfen solltest:</p>
          <ul style="margin:0 0 16px;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
            ${checklistItems}
          </ul>
          <div style="margin:24px 0;text-align:center;">
            <a href="${ctaLink}"
               style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
              ${ctaLabel}
            </a>
          </div>
          <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">
            Diese E-Mail wurde automatisch generiert. Nach dem 15. Januar wird der Jahressaldo automatisch finalisiert.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    try {
      await sendEmail({
        to: recipient.email,
        subject,
        html,
        fromName: 'Simy HR',
        fromEmail: tenant?.from_email,
        domainVerified: tenant?.resend_domain_verified,
      })
      emailsSent++
    } catch (err: any) {
      logger.error(`❌ Failed to send year-end reminder to ${recipient.email}:`, err.message)
    }
  }

  logger.debug(`✅ Year-end reminder round ${round}: sent ${emailsSent} emails`)
  return { success: true, round, emailsSent, year: prevYear }
})
