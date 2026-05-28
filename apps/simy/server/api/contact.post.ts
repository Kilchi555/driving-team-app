import { sendEmail } from '~/server/utils/email'

interface ContactBody {
  name: string
  email: string
  topic: string
  message: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ContactBody>(event)
  const { name, email, topic, message } = body ?? {}

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse.' })
  }
  if (!message?.trim() || message.trim().length < 10) {
    throw createError({ statusCode: 400, statusMessage: 'Nachricht zu kurz.' })
  }

  const ip =
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    getRequestHeader(event, 'x-real-ip') ||
    'unknown'

  const storage = useStorage('cache')
  const key = `contact-ratelimit:${ip}`
  const count = (await storage.getItem<number>(key)) ?? 0

  if (count >= 5) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Anfragen. Bitte später nochmals versuchen.' })
  }
  await storage.setItem(key, count + 1, { ttl: 3600 })

  const safeName = (name || '').slice(0, 80) || 'Unbekannt'
  const safeTopic = (topic || 'Allgemein').slice(0, 80)

  await sendEmail({
    to: 'info@simy.ch',
    subject: `Kontaktanfrage: ${safeTopic} – ${safeName}`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;margin:0 auto;">
        <tr><td style="background:#6000BD;padding:28px 30px;">
          <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:1px;">Neue Kontaktanfrage</p>
          <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">${safeTopic}</h1>
        </td></tr>
        <tr><td style="padding:28px 30px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:20px;">
            <tr><td style="padding:16px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#6b7280;font-size:13px;padding:5px 0;width:30%;">Name</td>
                  <td style="color:#111827;font-size:13px;font-weight:600;padding:5px 0;">${safeName}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:13px;padding:5px 0;">E-Mail</td>
                  <td style="color:#111827;font-size:13px;font-weight:600;padding:5px 0;"><a href="mailto:${email}" style="color:#6000BD;">${email}</a></td>
                </tr>
                <tr>
                  <td style="color:#6b7280;font-size:13px;padding:5px 0;">Thema</td>
                  <td style="color:#111827;font-size:13px;font-weight:600;padding:5px 0;">${safeTopic}</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${message.trim().slice(0, 2000)}</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 30px;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:11px;margin:0;">simy.ch Kontaktformular · Eingelangt: ${new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  })

  await sendEmail({
    to: email,
    subject: 'Deine Anfrage bei simy – wir haben sie erhalten',
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;margin:0 auto;">
        <tr><td style="background:#6000BD;padding:28px 30px;">
          <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Vielen Dank, ${safeName}!</h1>
        </td></tr>
        <tr><td style="padding:28px 30px;">
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px 0;">Wir haben deine Anfrage erhalten und melden uns innerhalb von <strong>24 Stunden</strong> zurück.</p>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 24px 0;">Möchtest du simy schon jetzt ausprobieren? Der Gratis-Test läuft 60 Tage — ohne Kreditkarte.</p>
          <a href="https://app.simy.ch/tenant-register" style="display:inline-block;background:#6000BD;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;">Kostenlos starten →</a>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 30px;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:11px;margin:0;">Simy IT Systems · Pascal Kilchenmann · <a href="https://simy.ch" style="color:#9ca3af;">simy.ch</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  })

  return { success: true }
})
