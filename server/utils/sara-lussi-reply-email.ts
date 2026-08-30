/**
 * Reply to Sara Lussi AG (Fernbehandlungen).
 * Production recipient is info@saralussi.com — always send --test first.
 */

export const SARA_LUSSI_REPLY_TO = 'info@saralussi.com'
export const SARA_LUSSI_REPLY_TEST_TO = 'info@simy.ch'
const SIMY_PRIMARY = '#6000BD'
const WHATSAPP_HREF = 'https://wa.me/41797157027'
const WHATSAPP_DISPLAY = '079 715 70 27'
const REGISTER_URL = 'https://app.simy.ch/tenant-register'

function row(label: string, value: string, last = false, wrap = false): string {
  const border = last ? '' : 'border-bottom:1px solid #eee8f8;'
  const valueStyle = wrap
    ? 'font-weight:500;text-align:left'
    : 'font-weight:600;text-align:right;white-space:nowrap'
  return `<tr>
    <td style="padding:9px 0;${border}color:#4b5563;font-size:14px;line-height:1.45;vertical-align:top;padding-right:16px">${label}</td>
    <td style="padding:9px 0;${border}color:#111827;font-size:14px;line-height:1.45;${valueStyle}">${value}</td>
  </tr>`
}

function sectionHead(title: string): string {
  return `<tr>
    <td colspan="2" style="padding:16px 0 6px;color:#6000BD;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase">${title}</td>
  </tr>`
}

export function buildSaraLussiReplyEmail(opts: { test?: boolean } = {}): {
  subject: string
  html: string
  to: string
} {
  const test = !!opts.test
  const subject = test
    ? '[TEST] Ihre Anfrage zur Onlinebuchung von Fernbehandlungen'
    : 'Ihre Anfrage zur Onlinebuchung von Fernbehandlungen'

  const testBanner = test
    ? `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin:0 0 24px">
        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5">
          <strong>Testversand an info@simy.ch.</strong>
          Die echte Mail geht an Frau Lussi (info@saralussi.com) — ohne diesen Hinweis.
        </p>
      </div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
        <tr><td style="text-align:center;padding:0 0 20px">
          <img src="https://simy.ch/simy-logo.png" alt="Simy" width="120" style="max-width:120px;height:auto;display:inline-block">
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)">
          <div style="background:linear-gradient(135deg,#6000BD,#8B2FE8);padding:32px 28px">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.35">Ihre Anfrage zur Onlinebuchung</h1>
            <p style="margin:10px 0 0;color:rgba(255,255,255,0.88);font-size:14px">Eine ehrliche Einschätzung — ohne Umschweife</p>
          </div>
          <div style="padding:32px 28px">
            ${testBanner}
            <p style="margin:0 0 16px;color:#111827;font-size:16px">Guten Tag Frau Lussi</p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              vielen Dank für Ihre sehr präzise Anfrage. Wir haben Ihren gewünschten Ablauf Punkt für Punkt mit unserer Software verglichen — nicht anhand der Marketingseite, sondern anhand dessen, was Simy heute tatsächlich kann.
            </p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Kurz und ehrlich: <strong>Einen Grossteil Ihrer Anforderungen — grob rund 70&nbsp;% — decken wir heute schon ab</strong>, zum Teil mit kleinen Einstellungen. Den Rest können wir bis zu einem gewissen Grad bauen. Eine Lösung, die jedes Detail Ihrer Mail ohne Kompromiss abbildet, gibt es am Markt kaum. Deshalb sagen wir lieber klar, was steht, was wir nachziehen und wo ein pragmatischer Kompromiss nötig ist.
            </p>

            <p style="margin:24px 0 10px;color:#111827;font-size:15px;font-weight:700">Was heute schon passt</p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Kundinnen können online buchen, auch ohne eigenes Konto. Name, Adresse, Geburtsdatum und weitere Felder lassen sich im Formular verbindlich machen. Pro Tag können Sie über Ihre Arbeitszeiten und die Dauer einer Behandlung eine feste Anzahl Plätze öffnen — ist der Tag voll, ist er nicht mehr buchbar. Buchungen am selben Tag sind möglich. Sie sehen die Buchungen eines Tages im Kalender, die Historie einer Kundin in der Akte und können eine Behandlung als erledigt markieren.
            </p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Bezahlt wird über Wallee mit <strong>TWINT und Kreditkarte</strong>, auch mit ausländischen Karten (in CHF). Der Preis, den Ihre Kundin sieht, ist der Preis, den sie zahlt — <strong>inkl. MWST</strong>, ausgewiesen im Checkout. Nach der Zahlung geht automatisch eine <strong>Quittung per E-Mail</strong> (kein QR-Einzahlungsschein — das Geld ist ja schon da). Gesundheitsangaben gehören nicht auf die Quittung und nicht in die Buchhaltung. Ein Volumen von über 1'000 Buchungen pro Monat ist technisch kein Problem; es gibt keine volumenabhängige Simy-Gebühr.
            </p>

            <p style="margin:24px 0 10px;color:#111827;font-size:15px;font-weight:700">Ein Punkt, den wir mit Ihnen klären möchten</p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Simy arbeitet mit <strong>Plätzen, die im System eine Uhrzeit haben</strong>. Beispiel: Sie arbeiten von 8–12 und 13–17 Uhr, eine Behandlung dauert eine Stunde — dann entstehen automatisch acht Plätze. Für Ihre Kundinnen wäre das der gewählte Platz, nicht der Zeitpunkt der Fernbehandlung. Genau so beschreiben Sie es bereits in Ihren AGB.
            </p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Die Alternative — ein Kalender nur mit Datum, ganz ohne Uhrzeit — ist bei uns nicht das Standardmodell. Das könnten wir bauen, wäre aber ein eigener Entwicklungsschritt. Viele Praxen leben sehr gut mit dem Platz-Modell und einem klaren Hinweis auf der Buchungsseite. <strong>Ob das für Sie in Ordnung ist, würden wir gerne in einem kurzen Gespräch klären.</strong>
            </p>

            <p style="margin:24px 0 10px;color:#111827;font-size:15px;font-weight:700">Was wir noch bauen würden</p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Diese Punkte sind bei uns für Kurse oder intern schon gelöst, für Ihren Ablauf aber noch nicht durchgängig im Online-Formular:
            </p>
            <ul style="margin:0 0 16px;padding-left:20px;color:#4b5563;font-size:15px;line-height:1.7">
              <li style="margin:0 0 8px"><strong>Zuerst zahlen, dann ist der Platz fest</strong> — genau so läuft es bei uns bereits bei Kursanmeldungen. Diesen Ablauf können wir auf Behandlungen übertragen. Das wollen auch einzelne Fahrschulen. Erst nach erfolgreicher Zahlung ist die Buchung bestätigt.</li>
              <li style="margin:0 0 8px"><strong>Buchende Person und behandelte Person getrennt</strong> — inkl. Kind oder Tier, Freitext für Beschwerden sowie Zustimmung zu AGB und Datenschutz. Die Rechnung geht an die zahlende Person, ohne Gesundheitsdaten.</li>
              <li style="margin:0"><strong>Mehrere Behandlungstage in einem Checkout</strong> — eine Zahlung, eine Quittung mit den entsprechenden Positionen.</li>
            </ul>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Das ist kein Neuschreiben der Software, sondern gezielte Ergänzungen auf einem bestehenden Fundament. Einen verbindlichen Termin dafür nennen wir Ihnen nach einem kurzen Gespräch, sobald klar ist, welche dieser Punkte für Sie zwingend sind.
            </p>

            <p style="margin:24px 0 10px;color:#111827;font-size:15px;font-weight:700">Datenschutz</p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Kundendaten liegen in der Datenbank im Rechenzentrum <strong>Zürich</strong> (Supabase). Die Anwendungsserver laufen in der EU (Vercel). Zahlungen laufen über <strong>Wallee in der Schweiz</strong>. E-Mails über Resend, SMS über Twilio. Beschwerden und Angaben zur behandelten Person speichern wir bei Ihnen in Simy; sie erscheinen nicht auf der Rechnung und gehen nicht an die Buchhaltung. Marketing-Pixel können für Ihren Betrieb deaktiviert werden.
            </p>

            <p style="margin:24px 0 10px;color:#111827;font-size:15px;font-weight:700">Buchhaltung und Kosten</p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              In Simy sehen Sie Bruttoumsatz, MWST, einzelne Transaktionen, Rückerstattungen und einen CSV-Export. Die Wallee-Gebühr rechnen wir pauschal mit <strong>1.7&nbsp;%</strong> aus — pro Zahlung und gesammelt — damit Sie sie ohne Handrechnung als Aufwand verbuchen können. Die Auszahlung auf Ihr Bankkonto erfolgt durch Wallee; den detaillierten Settlement-Abgleich macht deren Portal. Einen DATEV- oder Bexio-Direktexport haben wir bewusst noch nicht.
            </p>
            <p style="margin:0 0 12px;color:#4b5563;font-size:15px;line-height:1.65">
              Damit nichts überrascht: Es gibt zwei getrennte Kosten. Das <strong>Simy-Abo</strong> zahlen Sie an uns. Die <strong>1.7&nbsp;% Transaktionsgebühr</strong> fällt nur an, wenn eine Kundin online bezahlt. Viele Betriebe heben ihre Preise um 2–3&nbsp;% an: Die App hat laufende Kosten, die Gebühr ist damit gedeckt, es bleibt ein kleiner Gewinn — und automatische Zahlungen sparen Zeit und Nachfassen. Abo-Preise sind <strong>exkl. 8.1&nbsp;% MWST</strong>. Die Preise, die Ihre Kundinnen sehen, sind inkl. MWST. Monatlich kündbar, 30 Tage Frist, keine Mindestlaufzeit.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#faf8ff;border:1px solid #eee8f8;border-radius:12px">
              <tr><td style="padding:12px 18px 16px">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${sectionHead('Software-Abo')}
                  ${row('In jedem Plan', 'Buchung, Kundenakte, Kalender, Rechnungen, Quittungen, Kasse, Auswertungen, Erinnerungen, App, Wallee', false, true)}
                  ${row('Starter — 1 Mitarbeiter, 20 SMS, E-Mail-Support', 'CHF 49 / Monat')}
                  ${row('Professional — 5 Mitarbeiter, 50 SMS, Kursbuchung, Prioritäts-Support', 'CHF 149 / Monat')}
                  ${row('Enterprise — 10 Mitarbeiter, 100 SMS, Affiliate, Dedizierter Support', 'CHF 259 / Monat')}
                  ${row('Einrichtung Software', 'keine Gebühr')}
                  ${sectionHead('Zahlungen Ihrer Kundinnen')}
                  ${row('TWINT &amp; Karte (Wallee)', 'kein Monatsaufpreis')}
                  ${row('Transaktionsgebühr', '1.7 % vom Brutto')}
                  ${row('Beispiel 1’000 × CHF 180', 'rund CHF 3’060 / Monat')}
                  ${sectionHead('Optional — nur wenn Sie es brauchen')}
                  ${row('Weiterer Mitarbeiter', 'CHF 19 / Monat')}
                  ${row('SMS über Kontingent', 'CHF 0.15 / Segment')}
                  ${row('Google Business Profile Automation', 'CHF 19 / Monat')}
                  ${row('Kursbuchungsseite (im Professional inkl.)', 'CHF 29 / Monat')}
                  ${row('Affiliate-System (im Enterprise inkl.)', 'CHF 39 / Monat')}
                  ${row('Website-Setup (eigenes Produkt)', 'einmalig CHF 490')}
                  ${row('Website Hosting', 'CHF 19 / Monat')}
                  ${row('Website Care (inkl. 1h Support)', 'CHF 49 / Monat', true)}
                </table>
              </td></tr>
            </table>

            <p style="margin:24px 0 10px;color:#111827;font-size:15px;font-weight:700">Testaccount und 60 Tage zum Ausprobieren</p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Sie können sich jederzeit selbst einen Testaccount anlegen und sich so ein konkretes Bild machen — Buchungsseite, Kalender, Kundinnenakte und Quittungen, so wie sie heute stehen:
            </p>
            <p style="margin:0 0 16px;text-align:center">
              <a href="${REGISTER_URL}" style="display:inline-block;background:${SIMY_PRIMARY};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:700">Testaccount erstellen</a>
            </p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Ich gebe Ihnen gerne <strong>60 Tage zum Testen</strong>. So haben wir genug Zeit, die genannten Anpassungen umzusetzen — und Sie zahlen erst, wenn Simy Ihnen auch einen Nutzen bringt.
            </p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Wir sind ein junges, motiviertes Entwicklerteam. Genau das ist unser Vorteil gegenüber Softwarehäusern, die seit Jahrzehnten am Markt sind: Wir betreiben bewusst viel Aufwand, um den Ansprüchen unserer Kundinnen und Kunden gerecht zu werden — und können das, weil wir die Software selbst bauen.
            </p>

            <p style="margin:24px 0 10px;color:#111827;font-size:15px;font-weight:700">Kurzes Telefon</p>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Gerne kläre ich die offenen Punkte in einem kurzen Gespräch mit Ihnen — einmal aus Kundensicht, einmal in der Administration. Zwei konkrete Termine:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#faf8ff;border:1px solid #eee8f8;border-radius:12px">
              <tr><td style="padding:16px 18px">
                <p style="margin:0 0 8px;color:#111827;font-size:15px;line-height:1.55"><strong>Donnerstag, 27. August, 13:00 Uhr</strong></p>
                <p style="margin:0;color:#111827;font-size:15px;line-height:1.55"><strong>Freitag, 28. August, 09:00 Uhr</strong></p>
              </td></tr>
            </table>
            <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65">
              Passt einer der beiden? Ansonsten schlagen Sie gerne eine andere Zeit vor — per Mail an
              <a href="mailto:info@simy.ch" style="color:${SIMY_PRIMARY};font-weight:600;text-decoration:none">info@simy.ch</a>
              oder per WhatsApp unter
              <a href="${WHATSAPP_HREF}" style="color:${SIMY_PRIMARY};font-weight:600;text-decoration:none">${WHATSAPP_DISPLAY}</a>.
            </p>

            <p style="margin:28px 0 0;color:#111827;font-size:15px;line-height:1.6">
              Freundliche Grüsse<br><br>
              <strong>Pascal Kilchenmann</strong><br>
              <span style="color:#6b7280;font-size:13px">Simy IT Systems</span>
            </p>
          </div>
          <div style="background:#f9fafb;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af">Simy IT Systems · <a href="https://simy.ch" style="color:#9ca3af;text-decoration:none">simy.ch</a> · info@simy.ch</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return {
    subject,
    html,
    to: test ? SARA_LUSSI_REPLY_TEST_TO : SARA_LUSSI_REPLY_TO,
  }
}
