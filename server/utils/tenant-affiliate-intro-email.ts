/**
 * Intro email for tenants: what Simy's client affiliate / referral program is,
 * how it works, and why it benefits the driving school.
 */

const BASE_URL = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'

export function buildTenantAffiliateIntroEmail(opts?: {
  firstName?: string | null
  tenantName?: string | null
  ctaUrl?: string | null
}): { subject: string; html: string } {
  const firstName = (opts?.firstName || '').trim() || 'du'
  const tenantName = (opts?.tenantName || '').trim()
  const greeting = firstName === 'du' ? 'Hallo,' : `Hallo ${firstName},`
  const schoolLine = tenantName
    ? `Bei <strong>${tenantName}</strong> liegt ungenutztes Potenzial in euren bestehenden Schüler:innen.`
    : `In euren bestehenden Schüler:innen liegt ungenutztes Potenzial.`
  const ctaUrl = opts?.ctaUrl || `${BASE_URL}/admin/affiliate`

  const subject = 'Neue Kunden durch Empfehlungen – so funktioniert Simy Affiliate'

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
        <tr><td style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">

          <div style="background:linear-gradient(135deg,#6000BD,#8B2FE8);padding:36px 32px;text-align:center">
            <div style="font-size:36px;margin-bottom:10px">🤝</div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;line-height:1.3">
              Neue Kunden – dank euren Schüler:innen
            </h1>
            <p style="margin:10px 0 0;color:rgba(255,255,255,.85);font-size:14px">
              Das Empfehlungsprogramm in Simy
            </p>
          </div>

          <div style="padding:32px 32px 8px">
            <p style="margin:0 0 14px;color:#111827;font-size:16px">${greeting}</p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              ${schoolLine}
              Mit dem <strong>Affiliate- / Empfehlungsprogramm</strong> werden zufriedene Kunden zu Botschaftern – und ihr bekommt Neukunden, ohne teure Werbung.
            </p>

            <h2 style="margin:28px 0 12px;color:#111827;font-size:16px;font-weight:700">Was ist das?</h2>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Eure Schüler:innen (und optional Staff) erhalten einen persönlichen Empfehlungslink.
              Teilen sie ihn mit Freunden und Bekannten, und jemand bucht und bezahlt die erste Fahrstunde bei euch,
              erhält die empfehlende Person eine <strong>Gutschrift</strong> – die sie später auszahlen lassen kann.
            </p>

            <h2 style="margin:28px 0 12px;color:#111827;font-size:16px;font-weight:700">Wie funktioniert's?</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px">
              <tr>
                <td style="padding:14px 16px;background:#f9f7ff;border-radius:8px;border-left:4px solid #6000BD">
                  <p style="margin:0;font-size:14px;color:#111827;font-weight:700">① Einmal einrichten</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5">
                    Im Admin unter «Affiliate» aktivieren und pro Kategorie (B, A, BE, …) den Reward-Betrag festlegen.
                  </p>
                </td>
              </tr>
              <tr><td style="height:8px"></td></tr>
              <tr>
                <td style="padding:14px 16px;background:#f9f7ff;border-radius:8px;border-left:4px solid #6000BD">
                  <p style="margin:0;font-size:14px;color:#111827;font-weight:700">② Link teilen</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5">
                    Schüler aktivieren ihren Link in der App und teilen ihn per WhatsApp, Mail oder Social Media.
                  </p>
                </td>
              </tr>
              <tr><td style="height:8px"></td></tr>
              <tr>
                <td style="padding:14px 16px;background:#f9f7ff;border-radius:8px;border-left:4px solid #6000BD">
                  <p style="margin:0;font-size:14px;color:#111827;font-weight:700">③ Freund wird Kunde</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5">
                    Sobald die erste bezahlte Fahrstunde gebucht ist, wird die Gutschrift automatisch ausgelöst.
                  </p>
                </td>
              </tr>
              <tr><td style="height:8px"></td></tr>
              <tr>
                <td style="padding:14px 16px;background:#f9f7ff;border-radius:8px;border-left:4px solid #6000BD">
                  <p style="margin:0;font-size:14px;color:#111827;font-weight:700">④ Auszahlung</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5">
                    Empfehler beantragen die Auszahlung – ihr prüft und bestätigt im Admin. Transparent und nachvollziehbar.
                  </p>
                </td>
              </tr>
            </table>

            <h2 style="margin:28px 0 12px;color:#111827;font-size:16px;font-weight:700">Was bringt's euch?</h2>
            <ul style="margin:0 0 20px;padding:0 0 0 18px;color:#4b5563;font-size:15px;line-height:1.7">
              <li style="margin-bottom:6px"><strong>Organische Neukunden</strong> – Empfehlungen von Menschen, die euch schon kennen und vertrauen</li>
              <li style="margin-bottom:6px"><strong>Erfolgsbasiert</strong> – Reward nur, wenn wirklich eine bezahlte Fahrstunde zustande kommt</li>
              <li style="margin-bottom:6px"><strong>Wenig Aufwand</strong> – Einrichtung in Minuten, danach läuft vieles automatisch (inkl. Mails an Absolvent:innen)</li>
              <li style="margin-bottom:6px"><strong>Motivierte Botschafter</strong> – Schüler und Staff haben einen klaren Anreiz, euch weiterzuempfehlen</li>
            </ul>

            <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;padding:14px 16px;margin:20px 0">
              <p style="margin:0;color:#92400e;font-size:14px;line-height:1.55">
                <strong>Tipp:</strong> Nach bestandener Prüfung verschickt Simy automatisch Follow-up-Mails mit Bewertung und Empfehlungs-Hinweis.
                So bleibt das Programm auch bei Absolvent:innen präsent.
              </p>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td align="center" style="padding:20px 0 8px">
                <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#6000BD,#8B2FE8);color:#fff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:15px;font-weight:600">
                  Affiliate jetzt einrichten →
                </a>
              </td>
            </tr></table>

            <p style="margin:20px 0 0;color:#6b7280;font-size:14px;line-height:1.6">
              Fragen? Einfach antworten oder an
              <a href="mailto:info@simy.ch" style="color:#6000BD;font-weight:600;text-decoration:none">info@simy.ch</a> schreiben.
            </p>
            <p style="margin:16px 0 0;color:#555;font-size:14px">Liebe Grüsse,</p>
            <p style="margin:6px 0 0;color:#333;font-size:14px;font-weight:600">Pascal<br>
              <span style="color:#888;font-weight:400">Simy – Fahrschulsoftware</span>
            </p>
          </div>

          <div style="background:#f9fafb;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb;margin-top:24px">
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

  return { subject, html }
}
