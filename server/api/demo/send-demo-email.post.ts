// server/api/demo/send-demo-email.post.ts
// Sends a personalised demo email to a prospective customer's inbox.
// Rate limited to 3 emails per IP per hour using Nitro storage.

import { sendEmail } from '~/server/utils/email'

type TemplateType = 'reminder' | 'invoice' | 'welcome'

interface DemoEmailBody {
  email: string
  schoolName: string
  templateType: TemplateType
  primaryColor: string
  secondaryColor: string
}

// ─── Template generators ──────────────────────────────────────────────────────

function getReminderHtml(school: string, primary: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);margin:0 auto;">
        <tr><td style="background:${primary};padding:36px 30px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 6px 0;letter-spacing:1px;text-transform:uppercase;">Lektionserinnerung</p>
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">${school}</h1>
        </td></tr>
        <tr><td style="padding:32px 30px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hallo <strong>Anna</strong>,</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px 0;">Wir möchten dich an deine Fahrstunde <strong>morgen</strong> erinnern:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;width:40%;">📅 Datum</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">Morgen, 09:00 Uhr</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;">👤 Fahrlehrer</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">Thomas Meier</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;">📍 Treffpunkt</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">Bahnhof Uster, Gleis 1</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;">⏱ Dauer</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">90 Minuten</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="https://www.simy.ch" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;">
                Termin bestätigen →
              </a>
            </td></tr>
          </table>
          <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">Diese Erinnerung wurde automatisch von Simy erstellt – ohne dass dein Fahrlehrer einen Finger rühren musste.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">${school} · Powered by <strong style="color:${primary}">Simy</strong></p>
          <p style="color:#d1d5db;font-size:11px;margin:6px 0 0 0;">Dies ist eine Demo-E-Mail. <a href="https://www.simy.ch" style="color:#9ca3af;">Mehr über Simy erfahren</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function getInvoiceHtml(school: string, primary: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);margin:0 auto;">
        <tr><td style="background:${primary};padding:36px 30px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 6px 0;letter-spacing:1px;text-transform:uppercase;">Rechnung</p>
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">${school}</h1>
        </td></tr>
        <tr><td style="padding:32px 30px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hallo <strong>Anna</strong>,</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px 0;">Vielen Dank für deine Fahrstunde. Hier ist deine Rechnung:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:8px;">
            <tr><td style="padding:16px 24px 8px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#374151;font-size:14px;padding:8px 0;border-bottom:1px solid #e5e7eb;">Fahrstunde (90 Min.)</td>
                  <td align="right" style="color:#374151;font-size:14px;padding:8px 0;border-bottom:1px solid #e5e7eb;">CHF 115.–</td>
                </tr>
                <tr>
                  <td style="color:#374151;font-size:14px;padding:8px 0;border-bottom:1px solid #e5e7eb;">VKU-Kurs Grundkurs</td>
                  <td align="right" style="color:#374151;font-size:14px;padding:8px 0;border-bottom:1px solid #e5e7eb;">CHF 180.–</td>
                </tr>
                <tr>
                  <td style="color:#111827;font-size:15px;font-weight:700;padding:12px 0 8px 0;">Total</td>
                  <td align="right" style="color:${primary};font-size:18px;font-weight:800;padding:12px 0 8px 0;">CHF 295.–</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px;margin:0 0 24px 0;text-align:right;">Fällig bis: 15.05.2025</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="https://www.simy.ch" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;">
                Jetzt mit TWINT bezahlen →
              </a>
            </td></tr>
          </table>
          <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">Diese Rechnung wurde automatisch nach der Fahrstunde erstellt – du hast dafür keinen Aufwand.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">${school} · Powered by <strong style="color:${primary}">Simy</strong></p>
          <p style="color:#d1d5db;font-size:11px;margin:6px 0 0 0;">Dies ist eine Demo-E-Mail. <a href="https://www.simy.ch" style="color:#9ca3af;">Mehr über Simy erfahren</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function getWelcomeHtml(school: string, primary: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);margin:0 auto;">
        <tr><td style="background:${primary};padding:36px 30px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 6px 0;letter-spacing:1px;text-transform:uppercase;">Willkommen</p>
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">Willkommen bei ${school}!</h1>
        </td></tr>
        <tr><td style="padding:32px 30px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hallo <strong>Anna</strong>,</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px 0;">Schön, dass du dich für uns entschieden hast! Termine buchen, Zahlungen erledigen und deinen Fortschritt verfolgen – alles in deinem persönlichen Dashboard:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;width:50%;">✅ Konto erstellen</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">Klick auf den Button unten</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;">📅 Erste Stunde buchen</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">Direkt im Dashboard</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:14px;padding:6px 0;">💳 Zahlung</td>
                  <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">TWINT, Karte oder Rechnung</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="https://www.simy.ch" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;">
                Konto aktivieren →
              </a>
            </td></tr>
          </table>
          <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">Dieser Link wäre 14 Tage gültig. Fragen? Jederzeit melden.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">${school} · Powered by <strong style="color:${primary}">Simy</strong></p>
          <p style="color:#d1d5db;font-size:11px;margin:6px 0 0 0;">Dies ist eine Demo-E-Mail. <a href="https://www.simy.ch" style="color:#9ca3af;">Mehr über Simy erfahren</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

const SUBJECTS: Record<TemplateType, (school: string) => string> = {
  reminder: (school) => `Demo: So sieht deine Lektionserinnerung aus – ${school}`,
  invoice: (school) => `Demo: So sieht deine Rechnung aus – ${school}`,
  welcome: (school) => `Demo: So begrüsst ${school} neue Schüler`,
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const body = await readBody<DemoEmailBody>(event)

  // Validate inputs
  const { email, schoolName, templateType, primaryColor, secondaryColor } = body ?? {}

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse.' })
  }
  if (!['reminder', 'invoice', 'welcome'].includes(templateType)) {
    throw createError({ statusCode: 400, statusMessage: 'Unbekannter Template-Typ.' })
  }

  const school = (schoolName || 'Fahrschule Muster AG').slice(0, 80)
  const primary = /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : '#6000BD'

  // ─── Rate limiting: max 3 per IP per hour ─────────────────────────────────
  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || getRequestHeader(event, 'x-real-ip')
    || 'unknown'

  const storage = useStorage('cache')
  const rateLimitKey = `demo-ratelimit:${ip}`
  const count = ((await storage.getItem<number>(rateLimitKey)) ?? 0)

  if (count >= 3) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Anfragen. Bitte in einer Stunde nochmals versuchen.',
    })
  }

  await storage.setItem(rateLimitKey, count + 1, { ttl: 3600 })

  // ─── Generate & send ──────────────────────────────────────────────────────
  const htmlGenerators: Record<TemplateType, () => string> = {
    reminder: () => getReminderHtml(school, primary),
    invoice: () => getInvoiceHtml(school, primary),
    welcome: () => getWelcomeHtml(school, primary),
  }

  await sendEmail({
    to: email,
    subject: SUBJECTS[templateType](school),
    html: htmlGenerators[templateType](),
    senderName: school,
  })

  return { success: true }
})
