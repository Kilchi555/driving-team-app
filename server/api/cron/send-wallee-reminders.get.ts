// server/api/cron/send-wallee-reminders.get.ts
// ─────────────────────────────────────────────────────────────────────────────
// Daily cron that nudges tenants who started Wallee onboarding (have
// wallee_trial_started_at from a legacy Checkout Stripe trial or older flow)
// but have not reached wallee_onboarding_status active/skipped.
//
// New Checkouts no longer create a Stripe trial for Wallee. Reminder copy must
// NOT promise an extra free SaaS period. For legacy tenants still within the
// historical 30-day window after wallee_trial_started_at, we may mention that
// any remaining Stripe probezeitraum ends independently of Wallee setup.
//
// Reminder schedule (based on wallee_trial_started_at):
//   Day 10: application not submitted yet → nudge to submit HR registration
//   Day 20: still not started OR still pending
//   Day 27: last nudge
//
// Schedule: daily at 09:00 UTC (vercel.json)
// ─────────────────────────────────────────────────────────────────────────────

import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { assertCronRequest } from '~/server/utils/cron-auth'

const REMINDER_DAYS = [10, 20, 27]

export default defineEventHandler(async (event) => {
  assertCronRequest(event)

  const supabase = getSupabaseAdmin()
  const now = new Date()
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
  const results: { tenantId: string; day: number; status: string; sent: boolean }[] = []

  // Find all tenants with an active Wallee trial that aren't fully onboarded yet
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, contact_email, wallee_trial_started_at, wallee_onboarding_status')
    .not('wallee_trial_started_at', 'is', null)
    .neq('wallee_onboarding_status', 'active')
    .neq('wallee_onboarding_status', 'skipped')

  for (const tenant of tenants || []) {
    if (!tenant.contact_email || !tenant.wallee_trial_started_at) continue

    const trialStart = new Date(tenant.wallee_trial_started_at)
    const daysSinceStart = (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24)
    const status = tenant.wallee_onboarding_status || 'not_started'

    for (const day of REMINDER_DAYS) {
      // ±12h window around each reminder day
      if (daysSinceStart < day - 0.5 || daysSinceStart >= day + 0.5) continue

      const daysLeft = 30 - day
      const legacyStripeNote = daysLeft > 0
        ? ` Falls bei dir noch ein älterer Stripe-Probezeitraum läuft, endet dieser unabhängig von der Wallee-Einrichtung (noch ca. <strong>${daysLeft} Tage</strong>).`
        : ''
      let subject = ''
      let bodyHtml = ''

      if (day === 10 && status === 'not_started') {
        subject = 'Erinnerung: Online-Zahlungen (Wallee) noch nicht beantragt'
        bodyHtml = reminderBody({
          tenantName: tenant.name,
          daysLeft,
          headline: 'Wallee-Antrag noch ausstehend',
          intro: `Du hast dich für Online-Zahlungen entschieden, aber wir haben noch keinen Antrag von dir erhalten. Online-Kundenzahlungen sind erst nach erfolgreicher Aktivierung möglich. Dein SIMY-Abo läuft unabhängig davon.${legacyStripeNote}`,
          showChecklist: true,
          ctaText: 'Wallee-Antrag jetzt einreichen →',
          ctaUrl: `${baseUrl}/admin/profile`,
          baseUrl,
        })
      } else if (day === 20 && (status === 'not_started' || status === 'pending')) {
        subject = 'Wichtig: Online-Zahlungen (Wallee) einrichten'
        bodyHtml = reminderBody({
          tenantName: tenant.name,
          daysLeft,
          headline: 'Wallee-Einrichtung fortsetzen',
          intro: status === 'pending'
            ? `Dein Wallee-Antrag ist eingegangen und wird bearbeitet. Online-Kundenzahlungen sind erst nach Aktivierung möglich. Dein SIMY-Abo läuft unabhängig davon.${legacyStripeNote}`
            : `Du hast noch keinen Wallee-Antrag eingereicht. Bitte reiche den Antrag ein, damit Kunden online bezahlen können. Dein SIMY-Abo läuft unabhängig davon.${legacyStripeNote}`,
          showChecklist: status === 'not_started',
          ctaText: status === 'pending' ? 'Status prüfen →' : 'Jetzt Antrag einreichen →',
          ctaUrl: `${baseUrl}/admin/profile`,
          baseUrl,
        })
      } else if (day === 27 && (status === 'not_started' || status === 'pending')) {
        subject = '⚠️ Erinnerung: Wallee-Antrag noch offen'
        bodyHtml = reminderBody({
          tenantName: tenant.name,
          daysLeft,
          headline: 'Wallee-Antrag noch offen',
          intro: status === 'pending'
            ? `Dein Wallee-Antrag ist bei uns in Bearbeitung. Bei Fragen melde dich unter info@simy.ch. Dein SIMY-Abo läuft unabhängig von der Wallee-Einrichtung.${legacyStripeNote}`
            : `Dein Wallee-Antrag ist noch nicht eingegangen. Bitte reiche ihn ein, damit Online-Kundenzahlungen möglich werden. Dein SIMY-Abo läuft unabhängig davon.${legacyStripeNote}`,
          showChecklist: false,
          ctaText: status === 'pending' ? 'Zum Admin-Bereich →' : 'Antrag jetzt einreichen →',
          ctaUrl: `${baseUrl}/admin/profile`,
          urgent: true,
          baseUrl,
        })
      } else {
        // Day already passed or status doesn't match → skip
        continue
      }

      try {
        await sendEmail({
          to: tenant.contact_email,
          fromName: 'Simy',
          subject,
          html: bodyHtml,
        })
        console.log(`📧 Wallee reminder day ${day} sent to ${tenant.contact_email} (tenant ${tenant.id}, status: ${status})`)
        results.push({ tenantId: tenant.id, day, status, sent: true })
      } catch (e: any) {
        console.error(`❌ Wallee reminder day ${day} failed for ${tenant.contact_email}:`, e.message)
        results.push({ tenantId: tenant.id, day, status, sent: false })
      }
    }
  }

  return { success: true, sent: results.filter(r => r.sent).length, results }
})

// ─── Email template helper ────────────────────────────────────────────────────

function reminderBody(opts: {
  tenantName: string | null
  daysLeft: number
  headline: string
  intro: string
  showChecklist: boolean
  ctaText: string
  ctaUrl: string
  urgent?: boolean
  baseUrl: string
}): string {
  const headerBg = opts.urgent
    ? 'background:linear-gradient(135deg,#b45309,#92400e)'
    : 'background:linear-gradient(135deg,#1e293b,#334155)'

  const checklist = opts.showChecklist ? `
    <p style="margin:20px 0 8px;font-size:14px;font-weight:700;color:#111827">Checkliste HR-Eintragung</p>
    <table cellpadding="4" style="font-size:14px;color:#374151;width:100%;border-collapse:collapse">
      <tr><td style="padding:5px 0;border-bottom:1px solid #f3f4f6">☐ 1. Personalausweis / Pass bereithalten</td></tr>
      <tr><td style="padding:5px 0;border-bottom:1px solid #f3f4f6">☐ 2. Firmenname festlegen (muss deinen Nachnamen enthalten)</td></tr>
      <tr><td style="padding:5px 0;border-bottom:1px solid #f3f4f6">☐ 3. Anmeldeformular ausfüllen (hr-amt.ch oder EasyGov.swiss)</td></tr>
      <tr><td style="padding:5px 0;border-bottom:1px solid #f3f4f6">☐ 4. Unterschrift amtlich beglaubigen (Gemeindeamt, CHF 15–30)</td></tr>
      <tr><td style="padding:5px 0;border-bottom:1px solid #f3f4f6">☐ 5. Unterlagen beim kantonalen HR-Amt einreichen (CHF 120–150)</td></tr>
      <tr><td style="padding:5px 0;border-bottom:1px solid #f3f4f6">☐ 6. UID-Nummer erhalten (5–10 Werktage)</td></tr>
      <tr><td style="padding:5px 0">☐ 7. UID in Simy hinterlegen und Wallee-Antrag einreichen</td></tr>
    </table>` : ''

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
      <tr><td style="background:#fff;border-radius:12px;overflow:hidden">
        <div style="${headerBg};padding:28px 32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">${opts.headline}</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.7);font-size:14px">Online-Zahlungen · Simy</p>
        </div>
        <div style="padding:32px">
          <p style="color:#111827;font-size:15px;margin:0 0 16px">Hallo ${opts.tenantName || 'Team'},</p>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">${opts.intro}</p>
          ${checklist}
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="center" style="padding:20px 0">
              <a href="${opts.ctaUrl}"
                 style="display:inline-block;${opts.urgent ? 'background:linear-gradient(135deg,#b45309,#92400e)' : 'background:linear-gradient(135deg,#1e293b,#334155)'};color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">
                ${opts.ctaText}
              </a>
            </td>
          </tr></table>
          <p style="color:#6b7280;font-size:13px;margin:0">Fragen? <a href="mailto:info@simy.ch" style="color:#6000BD">info@simy.ch</a></p>
        </div>
        <div style="background:#f9fafb;padding:14px 32px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:12px;color:#9ca3af">Powered by <a href="https://simy.ch" style="color:#9ca3af">Simy.ch</a></p>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}
