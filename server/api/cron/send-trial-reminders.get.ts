// server/api/cron/send-trial-reminders.get.ts
// Sends warning emails to tenants whose trial ends in 7 or 1 day.
// Also sends a "trial just expired" email on the day of expiry (0 days).
//
// Schedule: daily at 08:00 UTC
import { getSupabaseAdmin } from '~/utils/supabase'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

const BASE_URL = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'

function gradientHeader(title: string, subtitle: string, color = 'linear-gradient(135deg,#6000BD,#8B2FE8)') {
  return `
    <div style="background:${color};padding:36px 32px;border-radius:12px 12px 0 0;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${title}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:14px">${subtitle}</p>
    </div>`
}

function ctaButton(label: string, url: string) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="center" style="padding:24px 0">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#6000BD,#8B2FE8);color:#fff;text-decoration:none;padding:16px 44px;border-radius:8px;font-size:16px;font-weight:600">
          ${label}
        </a>
      </td>
    </tr></table>`
}

function emailWrapper(content: string) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
        <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">
          ${content}
          <div style="background:#f9fafb;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af">
              Simy.ch · <a href="mailto:support@simy.ch" style="color:#9ca3af">support@simy.ch</a> · 
              <a href="${BASE_URL}/datenschutz" style="color:#9ca3af">Datenschutz</a>
            </p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-trial-reminders')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()
  let totalSent = 0

  // ── Windows: 7d warning, 1d warning, expired today ───────────────────────
  const windows = [
    { days: 7, label: '7 Tagen', type: 'warning' as const },
    { days: 1, label: '1 Tag',   type: 'warning' as const },
    { days: 0, label: 'heute',   type: 'expired' as const },
  ]

  for (const { days, label, type } of windows) {
    const windowStart = new Date(now.getTime() + (days - 0.5) * 24 * 60 * 60 * 1000)
    const windowEnd   = new Date(now.getTime() + (days + 0.5) * 24 * 60 * 60 * 1000)

    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name, contact_email, trial_ends_at')
      .eq('is_trial', true)
      .gte('trial_ends_at', windowStart.toISOString())
      .lt('trial_ends_at', windowEnd.toISOString())

    for (const tenant of tenants ?? []) {
      if (!tenant.contact_email) continue
      const trialEnd = new Date(tenant.trial_ends_at!)
      const tenantName = tenant.name || 'Fahrschule'
      const endDateStr = trialEnd.toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })

      let subject: string
      let bodyHtml: string

      if (type === 'expired') {
        subject = '⏰ Dein Simy Trial ist abgelaufen – jetzt upgraden'
        bodyHtml = emailWrapper(`
          ${gradientHeader('Dein Trial ist abgelaufen', `Abgelaufen am ${endDateStr}`, 'linear-gradient(135deg,#dc2626,#b91c1c)')}
          <div style="padding:32px 32px 8px">
            <p style="color:#111827;font-size:16px;margin:0 0 12px">Hallo <strong>${tenantName}</strong>,</p>
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
              Dein kostenloser Simy-Trial ist heute abgelaufen. Der Zugang zur Plattform ist jetzt eingeschränkt.
            </p>
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
              Deine Daten sind sicher gespeichert und bleiben noch 30 Tage lang erhalten. Wähle jetzt deinen Plan, um sofort wieder vollen Zugang zu erhalten.
            </p>
            <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;padding:14px 16px;margin:20px 0">
              <p style="margin:0;color:#991b1b;font-size:14px">
                <strong>Wichtig:</strong> Nach 30 Tagen ohne Upgrade werden deine Daten unwiderruflich gelöscht.
              </p>
            </div>
            ${ctaButton('Jetzt Plan wählen →', `${BASE_URL}/upgrade`)}
          </div>`)
      } else {
        subject = `⏰ Dein Simy Trial endet in ${label}`
        bodyHtml = emailWrapper(`
          ${gradientHeader(`Dein Trial endet in ${label}`, `Am ${endDateStr} läuft dein Trial ab`)}
          <div style="padding:32px 32px 8px">
            <p style="color:#111827;font-size:16px;margin:0 0 12px">Hallo <strong>${tenantName}</strong>,</p>
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
              Dein kostenloser Simy-Trial endet in <strong>${label}</strong> (${endDateStr}).
            </p>
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
              Um Terminbuchungen, Kundenverwaltung und alle weiteren Funktionen ohne Unterbrechung weiterzuführen, wähle jetzt deinen Plan:
            </p>
            <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;padding:14px 16px;margin:20px 0">
              <p style="margin:0;color:#92400e;font-size:14px">
                <strong>Hinweis:</strong> Nach Ablauf wird der Zugang eingeschränkt. Deine Daten bleiben 30 Tage erhalten.
              </p>
            </div>
            ${ctaButton('Jetzt Plan wählen →', `${BASE_URL}/upgrade`)}
          </div>`)
      }

      try {
        await sendEmail({ to: tenant.contact_email, subject, senderName: 'Simy', html: bodyHtml })
        totalSent++
        logger.debug(`📧 Trial ${type} email sent to ${tenant.contact_email} (${days}d)`)
      } catch (err) {
        logger.error(`❌ Failed to send trial email to ${tenant.contact_email}:`, err)
      }
    }
  }

  return { success: true, sent: totalSent }
})
