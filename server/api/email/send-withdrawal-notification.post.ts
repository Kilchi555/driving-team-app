// server/api/email/send-withdrawal-notification.post.ts
// Email notifications for the withdrawal flow:
// - iban_changed: customer IBAN was saved/updated
// - withdrawal_requested: customer submitted a payout request
// - withdrawal_completed: admin confirmed the bank transfer was done
// - admin_new_withdrawal: notify admin when a new request arrives

import { defineEventHandler, readBody } from 'h3'
import { sendEmail } from '~/server/utils/email'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const PRIMARY_COLOR = '#16a34a' // green-700
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'info@drivingteam.ch' // last-resort fallback

function baseLayout(title: string, body: string): string {
  return `
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr><td>
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);margin:0 auto;">
        <tr>
          <td style="background-color:${PRIMARY_COLOR};padding:32px 30px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:bold;">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:30px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="background-color:#f9fafb;padding:20px 30px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="color:#6b7280;font-size:12px;margin:0;">Driving Team Zürich GmbH · Baslerstrasse 145 · 8048 Zürich</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>`
}

const TEMPLATES: Record<string, (data: any) => { subject: string; html: string }> = {
  iban_changed: (data) => ({
    subject: 'Deine Auszahlungs-IBAN wurde gespeichert',
    html: baseLayout('IBAN gespeichert', `
      <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hallo ${data.studentName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;">Deine Auszahlungs-IBAN wurde erfolgreich gespeichert:</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#166534;font-size:14px;"><strong>Kontoinhaber:</strong> ${data.accountHolder}</p>
        <p style="margin:8px 0 0 0;color:#166534;font-size:14px;"><strong>IBAN:</strong> ****${data.ibanLast4}</p>
      </div>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 8px 0;">
        <strong>Wichtig:</strong> Aus Sicherheitsgründen sind Auszahlungen erst nach einer Wartezeit von 24 Stunden möglich.
      </p>
      <p style="color:#6b7280;font-size:13px;">Falls du diese Änderung nicht vorgenommen hast, kontaktiere uns sofort unter info@drivingteam.ch.</p>
    `)
  }),

  withdrawal_requested: (data) => ({
    subject: 'Dein Auszahlungsantrag wurde eingereicht',
    html: baseLayout('Auszahlungsantrag eingereicht', `
      <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hallo ${data.studentName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;">Dein Auszahlungsantrag wurde erfolgreich eingereicht:</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#166534;font-size:15px;"><strong>Betrag:</strong> CHF ${data.amountChf}</p>
        <p style="margin:8px 0 0 0;color:#166534;font-size:14px;"><strong>Konto:</strong> ${data.accountHolder} (****${data.ibanLast4})</p>
      </div>
      <p style="color:#374151;font-size:14px;line-height:1.6;">Die Überweisung wird innerhalb der nächsten 1–3 Werktage verarbeitet.</p>
      <p style="color:#6b7280;font-size:13px;">Bei Fragen erreichst du uns unter info@drivingteam.ch.</p>
    `)
  }),

  withdrawal_completed: (data) => ({
    subject: `CHF ${data.amountChf} wurden überwiesen`,
    html: baseLayout('Überweisung abgeschlossen', `
      <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hallo ${data.studentName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;">Deine Guthaben-Auszahlung wurde verarbeitet:</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#166534;font-size:18px;font-weight:bold;">CHF ${data.amountChf}</p>
        <p style="margin:8px 0 0 0;color:#166534;font-size:13px;">Der Betrag wurde auf dein hinterlegtes Konto überwiesen. Je nach Bank dauert der Eingang 1–2 Werktage.</p>
      </div>
      <p style="color:#6b7280;font-size:13px;">Bei Fragen erreichst du uns unter info@drivingteam.ch.</p>
    `)
  }),

  admin_new_withdrawal: (data) => ({
    subject: `💸 Neuer Auszahlungsantrag: CHF ${data.amountChf}`,
    html: baseLayout('Neuer Auszahlungsantrag', `
      <p style="color:#374151;font-size:15px;line-height:1.6;">Ein Schüler hat einen Auszahlungsantrag gestellt:</p>
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#92400e;font-size:14px;"><strong>Name:</strong> ${data.studentName}</p>
        <p style="margin:6px 0 0 0;color:#92400e;font-size:14px;"><strong>E-Mail:</strong> ${data.studentEmail}</p>
        <p style="margin:6px 0 0 0;color:#92400e;font-size:15px;"><strong>Betrag:</strong> CHF ${data.amountChf}</p>
        <p style="margin:6px 0 0 0;color:#92400e;font-size:14px;"><strong>IBAN:</strong> ****${data.ibanLast4}</p>
      </div>
      <p style="color:#374151;font-size:14px;">Bitte exportiere das Zahlungsfile im Admin-Bereich unter <strong>Schüler-Guthaben → Ausstehende Auszahlungen</strong>.</p>
    `)
  })
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { type, ...data } = body

    const template = TEMPLATES[type]
    if (!template) {
      return { success: false, error: `Unknown email type: ${type}` }
    }

    const { subject, html } = template(data)

    // Admin emails go to fixed address, customer emails go to their own
    const to = type === 'admin_new_withdrawal'
      ? await getAdminEmail(data.tenantId)
      : data.email

    if (!to) {
      logger.warn('⚠️ No recipient email for type:', type)
      return { success: false, error: 'No recipient' }
    }

    await sendEmail({ to, subject, html })
    logger.debug('✅ Withdrawal notification sent:', { type, to })
    return { success: true }

  } catch (error: any) {
    logger.error('❌ send-withdrawal-notification error:', error)
    return { success: false, error: error.message }
  }
})

async function getAdminEmail(tenantId?: string): Promise<string> {
  if (!tenantId) return ADMIN_EMAIL
  try {
    const supabase = getSupabaseAdmin()
    // 1. First admin user of the tenant
    const { data: admin } = await supabase
      .from('users')
      .select('email')
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle()
    if (admin?.email) return admin.email

    // 2. Fallback: tenant's contact_email
    const { data: tenant } = await supabase
      .from('tenants')
      .select('contact_email')
      .eq('id', tenantId)
      .single()
    return tenant?.contact_email || ADMIN_EMAIL
  } catch {
    return ADMIN_EMAIL
  }
}
