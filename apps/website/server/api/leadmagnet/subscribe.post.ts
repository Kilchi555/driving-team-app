// server/api/leadmagnet/subscribe.post.ts
// Lead-Magnet subscription: sends a category-specific tips email and notifies the team.
// Rate-limited to 5 submissions per IP per hour.

import { formatResendFrom } from '~/server/utils/format-resend-from'

export type LeadMagnetCategory = 'auto' | 'motorrad' | 'lastwagen' | 'anhaenger' | 'motorboot'

interface SubscribeBody {
  firstName: string
  email: string
  category: LeadMagnetCategory
}

const TENANT_NAME = 'Driving Team Fahrschule'
const TEAM_EMAIL = 'info@drivingteam.ch'
const PRIMARY_COLOR = '#1C64F2'
const BOOKING_URL = 'https://www.simy.ch/booking/availability/driving-team'

// ─── Shared layout helpers ────────────────────────────────────────────────────

function emailWrapper(color: string, headerEmoji: string, headerLabel: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Driving Team</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${color} 0%,${color}dd 100%);padding:36px 28px;text-align:center;">
            <div style="font-size:42px;line-height:1;margin-bottom:12px;">${headerEmoji}</div>
            <p style="margin:0;color:rgba(255,255,255,0.85);font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">${headerLabel}</p>
            <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700;">Driving Team Fahrschule</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:32px 28px;">${body}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 28px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">
              <strong style="color:${color};">Driving Team Fahrschule</strong> · 
              <a href="mailto:info@drivingteam.ch" style="color:${color};text-decoration:none;">info@drivingteam.ch</a> · 
              <a href="https://drivingteam.ch" style="color:${color};text-decoration:none;">drivingteam.ch</a>
            </p>
            <p style="margin:0;font-size:11px;color:#9ca3af;">Du erhältst diese E-Mail, weil du unseren kostenlosen Ratgeber angefordert hast. <a href="mailto:info@drivingteam.ch?subject=Abmeldung%20Ratgeber" style="color:#9ca3af;">Abmelden</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function tip(emoji: string, title: string, text: string, color: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
      <tr>
        <td style="width:44px;vertical-align:top;padding-top:2px;">
          <div style="width:36px;height:36px;background:${color}18;border-radius:8px;text-align:center;line-height:36px;font-size:18px;">${emoji}</div>
        </td>
        <td style="padding-left:12px;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827;">${title}</p>
          <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">${text}</p>
        </td>
      </tr>
    </table>`
}

function ctaButton(url: string, label: string, color: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 0;">
      <tr><td align="center">
        <a href="${url}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.3px;">${label} →</a>
      </td></tr>
    </table>
    <p style="text-align:center;margin:10px 0 0;font-size:12px;color:#9ca3af;">Keine Bindung · Kostenlose Erstberatung</p>`
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">`
}

// ─── Category templates ───────────────────────────────────────────────────────

function buildAutoEmail(firstName: string): string {
  const color = '#1C64F2'
  const greeting = `<p style="margin:0 0 8px;font-size:17px;color:#111827;">Hallo <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">hier ist dein persönlicher <strong>7-Schritte-Plan</strong> für den Führerausweis Kategorie B – mit den wichtigsten Insider-Tipps, die dir Zeit und Geld sparen.</p>`

  const tips = [
    tip('🩺', 'Nothelferkurs: frühzeitig machen', 'Der 10-stündige Kurs ist Pflicht und muss vor der Theorieprüfung abgeschlossen sein. Er ist 6 Jahre gültig – also so früh wie möglich erledigen, zum Beispiel schon mit 16 Jahren.', color),
    tip('👁', 'Sehtest: gilt 24 Monate', 'Den Sehtest kannst du beim Optiker oder Augenarzt machen. Er ist 24 Monate gültig. Nicht vergessen: Ohne Sehtest kein Lernfahrausweis.', color),
    tip('📖', 'Theorie: mit offiziellen Fragen üben', 'Über <strong>theorie24.ch</strong> übst du mit den echten StVA-Prüfungsfragen. Die Theorieprüfung beim Strassenverkehrsamt Zürich (Albisgütli) besteht aus 30 Fragen – max. 5 Fehler erlaubt.', color),
    tip('🏫', 'VKU frühzeitig buchen – Plätze sind knapp!', 'Der Verkehrskundeunterricht (8 Stunden) ist Pflicht vor der Fahrprüfung. Wichtig: Du kannst ihn frühestens <strong>3 Monate nach Ausstellung des Lernfahrausweises</strong> absolvieren. Kurse sind oft ausgebucht – direkt nach Erhalt des LFA buchen!', color),
    tip('🚗', 'Privat üben: 2–4× pro Woche', 'Wer regelmässig mit einer Begleitperson (mind. 23 J., Ausweis seit 3 J., nicht auf Probe) übt, braucht deutlich weniger kostenpflichtige Fahrlektionen. Das spart schnell CHF 500–1\'000.', color),
    tip('⏱', 'Doppellektionen statt Einzellektionen', '90 Minuten sind pro Ausfahrt effizienter als 45 Minuten. Du lernst mehr pro Einheit und bezahlst weniger pro Stunde effektiver Fahrzeit.', color),
    tip('🎓', 'WAB-Kurs innerhalb 12 Monate nicht vergessen', 'Nach bestandener Prüfung hast du 3 Jahre Probezeit – während dieser Zeit: <strong>0.0 Promille</strong>. Den eintägigen WAB-Kurs (Weiterausbildung) musst du innerhalb des <strong>ersten Jahres</strong> absolvieren, sonst riskierst du eine Busse.', color),
  ]

  const costBox = `${divider()}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eff6ff;border-radius:8px;border-left:4px solid ${color};margin-bottom:0;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:1px;">💰 Kostenüberblick Kat. B</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#374151;">
          <tr><td style="padding:3px 0;">Nothelferkurs (10h)</td><td align="right" style="font-weight:600;">CHF 99.–</td></tr>
          <tr><td style="padding:3px 0;">VKU Zürich (8h)</td><td align="right" style="font-weight:600;">CHF 190.–</td></tr>
          <tr><td style="padding:3px 0;">StVA-Gebühren (Sehtest, LFA, Theorie, Prüfung)</td><td align="right" style="font-weight:600;">ca. CHF 380.–</td></tr>
          <tr><td style="padding:3px 0;">Fahrstunden (Ø 20 × CHF 95.–)</td><td align="right" style="font-weight:600;">ca. CHF 1\'900.–</td></tr>
          <tr style="border-top:1px solid #bfdbfe;"><td style="padding:8px 0 3px;font-weight:700;color:#1e3a8a;">Gesamtkosten (typisch)</td><td align="right" style="padding:8px 0 3px;font-weight:700;color:${color};font-size:15px;">CHF 2\'500–3\'500.–</td></tr>
        </table>
      </td></tr>
    </table>`

  const body = greeting + tips.join('') + costBox + ctaButton(BOOKING_URL, 'Jetzt erste Fahrstunde buchen', color)
  return emailWrapper(color, '🚗', 'Dein kostenloser Ratgeber', body)
}

function buildMotorradEmail(firstName: string): string {
  const color = '#DC2626'
  const greeting = `<p style="margin:0 0 8px;font-size:17px;color:#111827;">Hallo <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">hier ist dein persönlicher <strong>Motorrad-Führerschein Guide</strong> – mit dem kompletten Ablauf, den Prüfungs-Übungen und Tipps von erfahrenen Fahrlehrern.</p>`

  const kategorien = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef2f2;border-radius:8px;border-left:4px solid ${color};margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:1px;">🏍️ Die 3 Kategorien im Vergleich</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#374151;">
          <tr style="border-bottom:1px solid #fecaca;">
            <td style="padding:6px 4px;font-weight:700;">A1</td>
            <td style="padding:6px 4px;">Ab 16 Jahren · bis 125 ccm / 11 kW · Grundkurs 12h</td>
          </tr>
          <tr style="border-bottom:1px solid #fecaca;">
            <td style="padding:6px 4px;font-weight:700;">A2</td>
            <td style="padding:6px 4px;">Ab 18 Jahren · bis 35 kW · Grundkurs 12h</td>
          </tr>
          <tr>
            <td style="padding:6px 4px;font-weight:700;">A</td>
            <td style="padding:6px 4px;">Ab 20 J. (nach 2 J. A2) · unbeschränkt · kein neuer Grundkurs</td>
          </tr>
        </table>
        <p style="margin:10px 0 0;font-size:12px;color:#6b7280;">💡 Tipp: Mit A1 ab 16 starten → nach 2 Jahren auf A2 → nach weiteren 2 Jahren auf A unbeschränkt. Jedes Mal ohne neue Theorieprüfung!</p>
      </td></tr>
    </table>`

  const tips = [
    tip('📋', 'Ablauf: 5 Schritte zum Motorrad-Ausweis', '<strong>1.</strong> Nothelferkurs (10h, gültig 6J) · <strong>2.</strong> Sehtest · <strong>3.</strong> Theorieprüfung + Lernfahrausweis · <strong>4.</strong> Grundkurs (12h, 3 Module, innerhalb 4 Monate!) · <strong>5.</strong> Praktische Prüfung', color),
    tip('🏋️', 'Der Grundkurs: Was dich erwartet', 'Modul 1: Anfahren, Bremsen, Slalom, Achtfahren. Modul 2: Notbremsung, Ausweichen, Kurventechnik. Modul 3: Gruppenfahren, Überholen, Schräglagentraining. <strong>Wichtig:</strong> Alle 12h müssen innerhalb der ersten 4 Monate nach LFA-Ausstellung abgeschlossen sein!', color),
    tip('🎯', 'Die 8 Pflichtübungen der Prüfung', '<strong>Acht fahren · Kreisfahren · Langsamfahren · Stop-and-Go · Ausweichen ohne Bremsen · Ausweichen mit Bremsen · Notbremsung aus 50 km/h · Slalom</strong> – alle müssen sicher sitzen.', color),
    tip('⚠️', 'Die 3 häufigsten Prüfungsfehler', '<strong>1. Fehlende Blicktechnik:</strong> Immer weit vorausschauen, nicht auf den Boden! <strong>2. Schulterblick vergessen:</strong> Vor jedem Spurwechsel und Abbiegen. <strong>3. Zu früh bremsen:</strong> Bei der Notbremsung erst auf Markierung, dann voll auf die Bremse.', color),
    tip('🦺', 'Schutzausrüstung Checkliste', 'Für den Grundkurs und Prüfung ist vollständige Ausrüstung Pflicht: <strong>Helm (ECE 22-06) · Motorradjacke mit Protektoren · Handschuhe · Motorradhose · Stiefel</strong>. Leihausrüstung ist bei uns auf Anfrage möglich.', color),
    tip('💰', 'Kosten im Überblick', 'Grundkurs: CHF 480–600 · StVA-Gebühren: CHF 150–220 · Fahrstunden (optional, CHF 95/Lekt.) · Gesamtkosten A1: ca. <strong>CHF 800–1\'500</strong>, A2/A: ca. <strong>CHF 1\'200–2\'000</strong>', color),
  ]

  const body = greeting + kategorien + tips.join('') + ctaButton(BOOKING_URL, 'Grundkurs buchen', color)
  return emailWrapper(color, '🏍️', 'Dein kostenloser Motorrad-Guide', body)
}

function buildLastwagenEmail(firstName: string): string {
  const color = '#D97706'
  const greeting = `<p style="margin:0 0 8px;font-size:17px;color:#111827;">Hallo <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">hier ist dein vollständiger <strong>Lastwagen-Führerschein Guide</strong> – Kategorie C und der Fähigkeitsausweis CZV einfach erklärt.</p>`

  const kategorien = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fffbeb;border-radius:8px;border-left:4px solid ${color};margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;">🚛 C1 oder C – was brauchst du?</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#374151;">
          <tr style="border-bottom:1px solid #fcd34d;">
            <td style="padding:8px 4px;font-weight:700;width:80px;">Kat. C1</td>
            <td style="padding:8px 4px;">3\'500–7\'500 kg · Ab 18 Jahren · Grosse Lieferwagen, kleinere Feuerwehrfahrzeuge · Ideal für Handwerksbetriebe &amp; Lieferdienste</td>
          </tr>
          <tr>
            <td style="padding:8px 4px;font-weight:700;">Kat. C</td>
            <td style="padding:8px 4px;">Über 7\'500 kg · Ab 21 Jahren · Professioneller Gütertransport · <strong>CZV-Fähigkeitsausweis obligatorisch</strong></td>
          </tr>
        </table>
      </td></tr>
    </table>`

  const tips = [
    tip('📋', 'Ablauf: So kommst du zum Kat. C Ausweis', '<strong>1.</strong> Nothelferkurs · <strong>2.</strong> Sehtest · <strong>3.</strong> Theorieprüfung (Basis + Zusatz C) · <strong>4.</strong> Fahrstunden (mind. 3 Doppellektionen) · <strong>5.</strong> CZV-Prüfungen (5 Teile) · <strong>6.</strong> Praktische Prüfung beim StVA', color),
    tip('🎓', 'CZV: Die 5 Prüfungsteile erklärt', '<strong>1. Schriftliche CZV-Theorieprüfung</strong> (40 Fragen, 60 Min.) · <strong>2 + 3. Zwei E-Prüfungen</strong> (je 5 Drag&amp;Drop-Fragen, 45 Min.) · <strong>4. Mündliche Prüfung</strong> (30 Min., Alltagssituationen) · <strong>5. Praktische CZV-Prüfung</strong> (30 Min., manuelle Aufgabe). Alle 5 Teile müssen bestanden werden!', color),
    tip('🔄', 'Fähigkeitsausweis: Alle 5 Jahre erneuern', 'Der CZV-Fähigkeitsausweis ist <strong>5 Jahre gültig</strong>. Für die Verlängerung: 35 Weiterbildungsstunden (= 5 Tage à 7h) innerhalb von 5 Jahren. Wer die Pflicht nicht erfüllt, darf keine gewerblichen Transporte mehr durchführen!', color),
    tip('📟', 'Digitaler Fahrtenschreiber – Pflicht für Berufschauffeure', 'Alle Lastwagen über 3\'500 kg im gewerblichen Einsatz benötigen einen <strong>digitalen Fahrtenschreiber</strong>. Fahrerkarte beantragen beim StVA. Lenk- und Ruhezeiten nach ARV 1 einhalten (max. 9h Lenkzeit/Tag, 45h/Woche).', color),
    tip('⏰', 'Lenk- und Ruhezeiten (ARV 1) – Wichtigstes Kurz-Summary', 'Max. <strong>9h Lenkzeit täglich</strong> (2x/Woche max. 10h) · Nach 4.5h Fahrt: <strong>45 Min. Pause</strong> (oder 15+30 Min.) · Mind. <strong>11h tägliche Ruhezeit</strong> · Verstösse werden mit Bussen geahndet!', color),
    tip('💰', 'Kosten im Überblick', 'Fahrstunden: CHF 150–200/Doppellektion · CZV-Grundausbildung: CHF 1\'200–2\'000 · StVA-Gebühren: CHF 300–500 · Gesamtkosten Kat. C: ca. <strong>CHF 3\'000–6\'000</strong>', color),
  ]

  const body = greeting + kategorien + tips.join('') + ctaButton(BOOKING_URL, 'Jetzt beraten lassen', color)
  return emailWrapper(color, '🚛', 'Dein kostenloser Lastwagen-Guide', body)
}

function buildAnhaengerEmail(firstName: string): string {
  const color = '#059669'
  const greeting = `<p style="margin:0 0 8px;font-size:17px;color:#111827;">Hallo <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">hier ist dein <strong>Anhänger (Kat. BE) Guide</strong> – mit der wichtigen 750 kg-Regel und allem was du für die Prüfung wissen musst.</p>`

  const ruleBox = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0fdf4;border-radius:8px;border-left:4px solid ${color};margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:1px;">⚖️ Brauchst du wirklich das BE?</p>
        <p style="margin:0 0 8px;font-size:13px;color:#374151;">Mit Kategorie B darfst du bereits Anhänger bis <strong>750 kg zGG</strong> (Gesamtgewicht) ziehen. Erst darüber braucht es das BE.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#374151;">
          <tr style="border-bottom:1px solid #a7f3d0;">
            <td style="padding:6px 4px;">🚤 Kleines Schlauchboot (Boot + Anhänger)</td>
            <td style="padding:6px 4px;text-align:right;color:#059669;font-weight:600;">Oft kein BE nötig</td>
          </tr>
          <tr style="border-bottom:1px solid #a7f3d0;">
            <td style="padding:6px 4px;">⛵ Motorboot (600 kg Boot + 250 kg Anhänger)</td>
            <td style="padding:6px 4px;text-align:right;color:#dc2626;font-weight:600;">BE erforderlich</td>
          </tr>
          <tr style="border-bottom:1px solid #a7f3d0;">
            <td style="padding:6px 4px;">🏕️ Wohnwagen (fast immer über 750 kg)</td>
            <td style="padding:6px 4px;text-align:right;color:#dc2626;font-weight:600;">BE erforderlich</td>
          </tr>
          <tr style="border-bottom:1px solid #a7f3d0;">
            <td style="padding:6px 4px;">🐴 Pferdeanhänger (mind. 1\'000 kg)</td>
            <td style="padding:6px 4px;text-align:right;color:#dc2626;font-weight:600;">BE erforderlich</td>
          </tr>
          <tr>
            <td style="padding:6px 4px;">🔧 Kleiner Arbeitsanhänger (400 kg)</td>
            <td style="padding:6px 4px;text-align:right;color:#059669;font-weight:600;">Kein BE nötig</td>
          </tr>
        </table>
        <p style="margin:10px 0 0;font-size:12px;color:#6b7280;">Im Zweifel: Schau auf den Fahrzeugausweis des Anhängers. Massgebend ist das <strong>zulässige Gesamtgewicht (zGG)</strong>, nicht das tatsächliche Beladungsgewicht!</p>
      </td></tr>
    </table>`

  const tips = [
    tip('📏', 'Wichtige Verhältnisregel: Zug vs. Anhänger', 'Der Anhänger darf <strong>maximal so schwer sein wie das Zugfahrzeug</strong> (bei neueren Autos bis 110% des Leergewichts). Prüfe im Fahrzeugausweis: Abschnitt 4 – erlaubtes Anhängegewicht. Achtung: Hersteller-Anhängelast ≠ gesetzliche Grenze!', color),
    tip('🔧', 'Was bei der Prüfung geprüft wird', '<strong>1. Ankuppeln &amp; Abkuppeln</strong> des Anhängers korrekt und sicher · <strong>2. Rückwärtsfahren</strong> (in Parklücke einfahren – der Schwierigkeitsgrad!) · <strong>3. Breit-Fahrt</strong> auf der Strasse · <strong>4. Sicherheitschecks</strong>: Licht, Bremsen, Stützlast, Überladungskontrolle', color),
    tip('⏱', 'Kurze Ausbildung: 3–5 Doppellektionen', 'Wer bereits Kategorie B besitzt, braucht für BE keine vollständige Fahrausbildung von vorne. Typisch sind <strong>3–5 Doppellektionen</strong> (à 90 Min.) plus die Prüfungsfahrt. Das spart viel Zeit und Geld!', color),
    tip('🎯', 'Prüfungstipps: Rückwärtsfahren meistern', 'Das Rückwärtsfahren ist die grösste Herausforderung – der Anhänger lenkt umgekehrt. Tipp: <strong>Kleine, ruhige Lenkbewegungen</strong> und weit genug zurückschauen. Im Grundkurs werden diese Manöver intensiv geübt.', color),
    tip('💡', 'Bonus: Stützlast nicht vergessen', 'Die Stützlast (Gewicht auf der Anhängerkupplung) muss zwischen dem Minimum (mind. 25 kg) und dem erlaubten Maximum liegen. Zu wenig Stützlast → Schlingern. Zu viel → Überlastung der Kupplung.', color),
    tip('💰', 'Kosten im Überblick', 'Fahrstunden (3–5 Doppellektionen × CHF 190.–): ca. CHF 570–950 · StVA-Prüfungsgebühr: ca. CHF 120–160 · Gesamtkosten BE: ca. <strong>CHF 700–1\'200</strong>', color),
  ]

  const body = greeting + ruleBox + tips.join('') + ctaButton(BOOKING_URL, 'Jetzt BE-Kurs buchen', color)
  return emailWrapper(color, '🚐', 'Dein kostenloser Anhänger-Guide', body)
}

function buildMotorbootEmail(firstName: string): string {
  const color = '#0284C7'
  const greeting = `<p style="margin:0 0 8px;font-size:17px;color:#111827;">Hallo <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">hier ist dein vollständiger <strong>Motorboot-Führerschein Guide</strong> – Theorieprüfung, Prüfungsthemen und praktische Infos für den Kanton Zürich.</p>`

  const wann = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f9ff;border-radius:8px;border-left:4px solid ${color};margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#0c4a6e;text-transform:uppercase;letter-spacing:1px;">⛵ Ab wann braucht man den Bootsausweis?</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#374151;">
          <tr style="border-bottom:1px solid #bae6fd;">
            <td style="padding:6px 4px;">Motorboote bis 6 kW (8 PS)</td>
            <td style="padding:6px 4px;text-align:right;color:#059669;font-weight:600;">Kein Ausweis nötig (ab 14 J.)</td>
          </tr>
          <tr style="border-bottom:1px solid #bae6fd;">
            <td style="padding:6px 4px;">Motorboote über 6 kW (8 PS)</td>
            <td style="padding:6px 4px;text-align:right;color:#dc2626;font-weight:600;">Kat. A Pflicht (ab 18 J.)</td>
          </tr>
          <tr style="border-bottom:1px solid #bae6fd;">
            <td style="padding:6px 4px;">Bodensee: schon ab 4.4 kW (6 PS)</td>
            <td style="padding:6px 4px;text-align:right;color:#dc2626;font-weight:600;">Kat. A Pflicht (ab 18 J.)</td>
          </tr>
          <tr>
            <td style="padding:6px 4px;">Rhein (Stein am Rhein – Schaffhausen)</td>
            <td style="padding:6px 4px;text-align:right;color:#d97706;font-weight:600;">Zusätzliche Prüfung!</td>
          </tr>
        </table>
      </td></tr>
    </table>`

  const theorieFaecher = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border-radius:8px;margin-bottom:16px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#0c4a6e;text-transform:uppercase;letter-spacing:1px;">📚 Die 11 Theorieprüfungs-Themen</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#374151;">
          <tr><td style="padding:3px 4px;width:50%;">🗺️ Navigation</td><td style="padding:3px 4px;">⚓ Seemannschaft (inkl. Knoten)</td></tr>
          <tr><td style="padding:3px 4px;">🚦 Vorfahrtsregeln Motor/Segel</td><td style="padding:3px 4px;">💡 Lichter &amp; Signale</td></tr>
          <tr><td style="padding:3px 4px;">🪧 Schifffahrtszeichen</td><td style="padding:3px 4px;">🌊 Grenzgewässer</td></tr>
          <tr><td style="padding:3px 4px;">🆘 Notfälle &amp; Havarien</td><td style="padding:3px 4px;">☁️ Wetterkunde</td></tr>
          <tr><td style="padding:3px 4px;">🪪 Ausweise &amp; Ausrüstung</td><td style="padding:3px 4px;">🔒 Pflichten des Schiffsführers</td></tr>
          <tr><td style="padding:3px 4px;" colspan="2">🔤 Fachausdrücke Schifffahrt</td></tr>
        </table>
      </td></tr>
    </table>`

  const tips = [
    tip('✍️', 'Theorieprüfung: 60 Fragen, max. 15 Fehlerpunkte', 'Am Computer (Strassenverkehrsamt Zürich-Albisgütli oder Winterthur), <strong>50 Minuten</strong> Zeit. Pro Frage 3 Antworten, 1–2 können richtig sein. Jede falsche Antwort = 1 Fehlerpunkt. Maximal <strong>15 Fehlerpunkte</strong> zum Bestehen. Kein Voranmelden nötig – einfach mit der Bewilligungskarte erscheinen!', color),
    tip('🌊', 'Theorieprüfung bestanden – was kommt dann?', 'Du hast <strong>24 Monate</strong> Zeit für die praktische Prüfung. Die Fahrschule vereinbart den Termin für dich beim Strassenverkehrsamt. Prüfungsorte im Kanton Zürich: <strong>Oberrieden, Zürich oder Eglisau</strong>.', color),
    tip('⚡', 'Praktische Prüfung: Wetter-Tipps', 'Die Prüfung findet bei jedem Wetter statt – ausser: Aussentemperatur unter dem Gefrierpunkt, Sicht unter 300 m oder Sturmwarnzeichen. Prüfungstag-Info: ab 7:30 Uhr unter <strong>043 257 00 80</strong>. Mit dem Prüfungsboot brauchst du: Seekarte, Kursdreieck, Kompass, Schreibzeug.', color),
    tip('📖', 'Lernmaterial-Empfehlung', 'Offizielles Lehrbuch: <strong>«Gute Fahrt auf schweizerischen Gewässern»</strong> der Vereinigung der Schifffahrtsämter (vks). Erhältlich über das Strassenverkehrsamt oder beim Verlag. Kein Auswendiglernen der Fragen – Verstehen ist wichtiger, denn neue Fragen kommen laufend dazu!', color),
    tip('💰', 'Kosten im Überblick', 'Theorieprüfungs-Gesuch: ca. CHF 30–50 · Lernmaterial: ca. CHF 40–60 · Fahrstunden (10–20h × CHF 95.–): ca. CHF 950–1\'900 · Praktische Prüfung: ca. CHF 150–200 · Gesamtkosten: ca. <strong>CHF 800–1\'600</strong>', color),
  ]

  const body = greeting + wann + theorieFaecher + tips.join('') + ctaButton(BOOKING_URL, 'Jetzt Bootsstunden buchen', color)
  return emailWrapper(color, '⛵', 'Dein kostenloser Boot-Guide', body)
}

// ─── Template registry ────────────────────────────────────────────────────────

const TEMPLATES: Record<LeadMagnetCategory, {
  emoji: string
  label: string
  subject: (n: string) => string
  build: (firstName: string) => string
}> = {
  auto: {
    emoji: '🚗',
    label: 'Auto (Kat. B)',
    subject: (firstName: string) => `🚗 ${firstName}, dein 7-Schritte-Plan zum Führerausweis`,
    build: buildAutoEmail,
  },
  motorrad: {
    emoji: '🏍️',
    label: 'Motorrad',
    subject: (firstName: string) => `🏍️ ${firstName}, dein kostenloser Motorrad-Führerschein Guide`,
    build: buildMotorradEmail,
  },
  lastwagen: {
    emoji: '🚛',
    label: 'Lastwagen (Kat. C)',
    subject: (firstName: string) => `🚛 ${firstName}, alles zum Lastwagen-Ausweis & CZV`,
    build: buildLastwagenEmail,
  },
  anhaenger: {
    emoji: '🚐',
    label: 'Anhänger (Kat. BE)',
    subject: (firstName: string) => `🚐 ${firstName}, brauchst du wirklich das BE? (+ Prüfungstipps)`,
    build: buildAnhaengerEmail,
  },
  motorboot: {
    emoji: '⛵',
    label: 'Motorboot',
    subject: (firstName: string) => `⛵ ${firstName}, dein Motorboot-Führerschein Guide für die Schweiz`,
    build: buildMotorbootEmail,
  },
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const body = await readBody<SubscribeBody>(event)
  const { firstName, email, category } = body ?? {}

  if (!firstName?.trim() || firstName.trim().length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte gib deinen Vornamen ein.' })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse.' })
  }
  if (!category || !TEMPLATES[category]) {
    throw createError({ statusCode: 400, statusMessage: 'Unbekannte Kategorie.' })
  }

  // Rate limiting: max 5 per IP per hour
  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || getRequestHeader(event, 'x-real-ip')
    || 'unknown'
  const storage = useStorage('cache')
  const rateLimitKey = `leadmagnet-ratelimit:${ip}`
  const count = ((await storage.getItem<number>(rateLimitKey)) ?? 0)
  if (count >= 5) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Anfragen. Bitte warte eine Stunde.' })
  }
  await storage.setItem(rateLimitKey, count + 1, { ttl: 3600 })

  const name = firstName.trim()
  const tmpl = TEMPLATES[category]

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'
    const fromWithName = formatResendFrom(TENANT_NAME, fromEmail)

    // Send lead magnet guide to subscriber
    await resend.emails.send({
      from: fromWithName,
      to: email.trim(),
      subject: tmpl.subject(name),
      html: tmpl.build(name),
    })

    // Internal notification
    const dateStr = new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })
    await resend.emails.send({
      from: fromWithName,
      to: TEAM_EMAIL,
      subject: `${tmpl.emoji} Neuer Lead-Magnet: ${tmpl.label} – ${name} (${email})`,
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px;color:#374151;">
        <h2 style="color:${PRIMARY_COLOR};">📬 Neuer Lead-Magnet Subscriber</h2>
        <table cellpadding="6" style="font-size:14px;">
          <tr><td style="color:#6b7280;">Zeitpunkt</td><td><strong>${dateStr}</strong></td></tr>
          <tr><td style="color:#6b7280;">Vorname</td><td><strong>${name}</strong></td></tr>
          <tr><td style="color:#6b7280;">E-Mail</td><td><a href="mailto:${email}" style="color:${PRIMARY_COLOR};">${email}</a></td></tr>
          <tr><td style="color:#6b7280;">Kategorie</td><td><strong>${tmpl.emoji} ${tmpl.label}</strong></td></tr>
        </table>
        <p style="margin-top:20px;font-size:13px;color:#9ca3af;">Automatisch generiert · Lead-Magnet Driving Team Website</p>
      </body></html>`,
    })
  } catch (err: any) {
    console.warn('⚠️ Lead magnet email failed:', err.message)
    throw createError({ statusCode: 500, statusMessage: 'E-Mail konnte nicht gesendet werden.' })
  }

  return { success: true }
})
