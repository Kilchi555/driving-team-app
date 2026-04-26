// server/api/leadmagnet/subscribe.post.ts
// Lead-Magnet subscription: sends a category-specific tips email and notifies the team.
// Rate-limited to 5 submissions per IP per hour.

import { createClient } from '@supabase/supabase-js'
import { formatResendFrom } from '~/server/utils/format-resend-from'
import { getSupabaseServiceCredentials } from '~/server/utils/supabase-service-env'

const TENANT_ID = '64259d68-195a-4c68-8875-f1b44d962830'

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

// ─── Category templates (deep-researched, Fahrschule-verified content) ───────

function buildAutoEmail(firstName: string): string {
  const color = '#1C64F2'
  const greeting = `<p style="margin:0 0 8px;font-size:17px;color:#111827;">Hallo <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">hier sind die <strong>10 besten Insider-Tipps</strong> für deinen Führerausweis Kategorie B.</p>`

  const neuBadge = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;margin-bottom:20px;">
      <tr><td style="padding:12px 16px;">
        <p style="margin:0;font-size:13px;color:#92400e;"><strong>🆕 Seit 1. Juli 2025:</strong> Fahrassistenzsysteme (FAS) werden sowohl in der <strong>Theorieprüfung als auch in der praktischen Prüfung</strong> geprüft! Auf dieser Homepage kannst du die wichtigsten Facts dazu nachlesen: <a href="https://www.smartrider.ch/" style="color:#92400e;font-weight:700;">smartrider.ch</a></p>
      </td></tr>
    </table>`

  const tips = [
    tip('📚', 'Theorie wirklich verstehen – nicht auswendig lernen', 'Die meisten Fahrschüler:innen lernen die Theorie mehrheitlich auswendig und sind dann überrascht, wenn sie diese in den Fahrstunden nicht umsetzen können. Schau, dass du die Verkehrsregeln wirklich <strong>verstanden</strong> hast! Frag dich immer: Warum ist die richtige Antwort richtig? Welche Regeln stecken dahinter? So kannst du deutlich Zeit und Geld in der praktischen Fahrausbildung sparen.', color),
    tip('🩺', 'Nothelferkurs früh abhaken (10h, gültig 6 Jahre)', 'Pflicht vor der Theorieprüfung. Tipp: Bereits ab 16 absolvieren – dann ist er bis zum Führerausweis noch gültig und spart dir den Re-Test. Angeboten beim SRK, Samariterverein oder Fahrschule.', color),
    tip('👁', 'Sehtest: gilt nur 24 Monate', 'Beim Optiker oder Augenarzt. Kostet CHF 20–40. Vorsicht: Wenn er abläuft bevor du deinen LFA beantragst, musst du ihn wiederholen. Plane früh!', color),
    tip('🏫', 'VKU sofort nach LFA-Erhalt buchen', 'Du kannst ihn frühestens nach Erhalt des Lernfahrausweises buchen – aber Plätze sind oft <strong>4–8 Wochen im Voraus ausgebucht</strong>. Ohne VKU keine Prüfungsanmeldung! Nimm nicht den billigsten: ein guter VKU spart dir Fahrstunden. Unserer Meinung nach sollte ein VKU mindestens CHF 150.– kosten.', color),
    tip('🚗', 'Privat üben spart CHF 500–1\'000', 'Begleitperson: mind. 23 J., Ausweis seit 3 J., nicht auf Probe, nüchtern (0.0‰). Ziel: 2–3× pro Woche fahren. Wichtig: In den Privatfahrten <strong>exakt gleich fahren wie beim Fahrlehrer gelernt</strong> – sonst brauchst du wieder mehr Stunden zum Umlernen oder fällst wegen falsch Gelerntem durch.', color),
    tip('🅿️', 'Insider: Strassenverkehrsamt-Gelände vorher besichtigen', 'Alle Fahrprüfungen beginnen und enden am gleichen Ort – beim Strassenverkehrsamt deiner Wahl. Fahr dort vorher hin und übe das Ein- und Ausparken – das beruhigt die Nerven massiv und garantiert dir einen soliden Start und ein sicheres Ende der Fahrprüfung.', color),
    tip('👟', 'Richtige Schuhe beim Fahren', 'Klingt trivial, aber: <strong>Keine Flip-Flops, Heels oder Schuhe mit dicker Sohle</strong>. Bequeme Turnschuhe mit gutem Grip sind ideal. Du brauchst feines Gefühl auf Gas-, Brems- und Kupplungspedal.', color),
    tip('⚡', 'Ein Fehler = noch nicht verloren!', 'Viele Fahrschüler:innen brechen mental ein nach dem ersten Fehler. 2–3 kleine Fehler sind erlaubt. Entscheidend ist: Wie reagierst du? Ruhig weiterfahren, Konzentration behalten. Nur grobe Sicherheitsverstösse führen zur negativen Prüfung – und auch dort kann der Verkehrsexperte noch ein Auge zudrücken. <strong>Glaube bis am Schluss daran!</strong> Erst wenn das Fahrzeug wieder parkiert und gesichert ist, ist die Prüfung fertig – eine selbstkritische Beurteilung kann eine knapp negative Prüfung noch ins Positive drehen.', color),
    tip('📏', '2-Sekunden-Abstand', '<strong>2-Sekunden-Abstand:</strong> Wenn der Vordermann an einem fixen Punkt vorbeifährt, zähl "21, 22" – erst dann solltest du selbst dort sein.', color),
    tip('⏱', 'Doppellektionen sind effizienter', '90 Minuten erlauben mehr Übungssequenzen als 2× 45 Min. Du zahlst weniger pro effektiver Fahrminute und baust schneller Routine auf. Empfehlung: grundsätzlich Doppellektionen buchen.', color),
    tip('🎓', 'WAB-Kurs: innerhalb 12 Monate nach Prüfung', 'Nach bestandener Prüfung: 3 Jahre Probezeit mit <strong>0.0 Promille</strong>. WAB-Kurs (1 Tag) muss innerhalb des <strong>ersten Jahres</strong> absolviert werden – sonst droht Busse bei Polizeikontrolle. Wenn möglich: vor der Wintersaison absolvieren – das gibt dir Sicherheit bei rutschigen Strassen.', color),
  ]

  const costBox = `${divider()}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eff6ff;border-radius:8px;border-left:4px solid ${color};margin-bottom:0;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:1px;">💰 Realistischer Kostenüberblick 2026</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#374151;">
          <tr><td style="padding:3px 0;">Nothelferkurs (10h)</td><td align="right" style="font-weight:600;">CHF 99.–</td></tr>
          <tr><td style="padding:3px 0;">VKU Zürich (8h)</td><td align="right" style="font-weight:600;">CHF 190.–</td></tr>
          <tr><td style="padding:3px 0;">StVA-Gebühren gesamt</td><td align="right" style="font-weight:600;">ca. CHF 380.–</td></tr>
          <tr><td style="padding:3px 0;">Fahrstunden (Ø 20 × CHF 95.–)</td><td align="right" style="font-weight:600;">ca. CHF 1\'900.–</td></tr>
          <tr style="border-top:1px solid #bfdbfe;"><td style="padding:8px 0 3px;font-weight:700;color:#1e3a8a;">Realistisch gesamt</td><td align="right" style="padding:8px 0 3px;font-weight:700;color:${color};font-size:15px;">CHF 2\'500–3\'500.–</td></tr>
        </table>
        <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">💡 Mit regelmässigen Privatübungen kannst du die Fahrstunden auf 12–15 reduzieren → spart CHF 700–1\'000.</p>
      </td></tr>
    </table>`

  const body = greeting + neuBadge + tips.join('') + costBox + ctaButton(BOOKING_URL, 'Jetzt erste Fahrstunde buchen', color)
  return emailWrapper(color, '🚗', 'Dein kostenloser Ratgeber', body)
}

function buildMotorradEmail(firstName: string): string {
  const color = '#DC2626'
  const greeting = `<p style="margin:0 0 8px;font-size:17px;color:#111827;">Hallo <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">hier ist dein <strong>kompletter Motorrad-Guide</strong> – von Kategorien über Grundkurs bis zu den 7 Prüfungsübungen mit konkreten Profi-Tipps von erfahrenen Fahrlehrern.</p>`

  const kategorien = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef2f2;border-radius:8px;border-left:4px solid ${color};margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:1px;">🏍️ Die 3 Kategorien im Vergleich</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#374151;">
          <tr style="border-bottom:1px solid #fecaca;">
            <td style="padding:6px 4px;font-weight:700;width:40px;">A1</td>
            <td style="padding:6px 4px;">Ab 16 J. · bis 125 ccm / 11 kW · Grundkurs 12h</td>
          </tr>
          <tr style="border-bottom:1px solid #fecaca;">
            <td style="padding:6px 4px;font-weight:700;">A2</td>
            <td style="padding:6px 4px;">Ab 18 J. · bis 35 kW · Grundkurs 12h</td>
          </tr>
          <tr>
            <td style="padding:6px 4px;font-weight:700;">A</td>
            <td style="padding:6px 4px;">Ab 20 J. (nach 2 J. A2) · unbeschränkt · <strong>kein neuer Grundkurs nötig!</strong></td>
          </tr>
        </table>
        <p style="margin:10px 0 0;font-size:12px;color:#6b7280;">💡 Strategie: A1 ab 16 → A2 ab 18 → A ab 20 ohne neue Grundkurs-Kosten. Günstigster Weg zum grossen Motorrad!</p>
      </td></tr>
    </table>`

  const grundkursBox = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef2f2;border-radius:8px;border-left:4px solid ${color};margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:1px;">📅 Grundkurs (PGS): 3 Tage × 4h = 12h Pflicht</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#374151;">
          <tr style="border-bottom:1px solid #fecaca;"><td style="padding:6px 4px;font-weight:700;">Tag 1</td><td style="padding:6px 4px;">Kupplung, Gas, Bremse, Slalom, Acht, Anhalten</td></tr>
          <tr style="border-bottom:1px solid #fecaca;"><td style="padding:6px 4px;font-weight:700;">Tag 2</td><td style="padding:6px 4px;">Notbremsung, Ausweichmanöver, Kurventechnik, Gewichtsverlagerung</td></tr>
          <tr><td style="padding:6px 4px;font-weight:700;">Tag 3</td><td style="padding:6px 4px;">Strassenverkehr, Gruppenfahren, Überholen, Schräglagentraining</td></tr>
        </table>
        <p style="margin:10px 0 0;font-size:12px;color:#991b1b;font-weight:600;">⚠️ Alle 12h müssen innerhalb von 4 Monaten nach LFA-Ausstellung abgeschlossen sein!</p>
      </td></tr>
    </table>`

  const uebungenBox = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff5f5;border-radius:8px;border-left:4px solid ${color};margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:1px;">🎯 Die 7 Prüfungsübungen – mit Profi-Tipps</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:12px;color:#374151;">
          <tr style="border-bottom:1px solid #fecaca;"><td style="padding:6px 4px;font-weight:700;width:160px;">1. Anhalten &amp; Wegfahren</td><td style="padding:6px 4px;">Linken Fuss auf Boden · Blicksystematik vor Wegfahren einhalten · Nicht zu schnell!</td></tr>
          <tr style="border-bottom:1px solid #fecaca;"><td style="padding:6px 4px;font-weight:700;">2. Gerader Slalom</td><td style="padding:6px 4px;"><strong>Blick nach vorne, nicht auf die Pylonen!</strong> A1: 2.5m Abstand · A: 3.0m</td></tr>
          <tr style="border-bottom:1px solid #fecaca;"><td style="padding:6px 4px;font-weight:700;">3. Kletterübung</td><td style="padding:6px 4px;">Beide Füsse am Boden beim Vorfahren · Mit Gas &amp; Kupplung aufs Böckchen · Blick voraus</td></tr>
          <tr style="border-bottom:1px solid #fecaca;"><td style="padding:6px 4px;font-weight:700;">4. Versetzter Slalom</td><td style="padding:6px 4px;"><strong>Augen fahren der Spur voraus</strong> · Blick zum nächsten Drehpunkt, nicht vor das Vorderrad</td></tr>
          <tr style="border-bottom:1px solid #fecaca;"><td style="padding:6px 4px;font-weight:700;">5. Spurgasse</td><td style="padding:6px 4px;">Ziel: <strong>20–22 Sekunden</strong> durch die Gasse · Mit Schleifpunkt der Kupplung arbeiten · Keine Bremse!</td></tr>
          <tr style="border-bottom:1px solid #fecaca;"><td style="padding:6px 4px;font-weight:700;">6. Acht fahren</td><td style="padding:6px 4px;"><strong>Blick halber Kreis voraus</strong> · Nicht auf den Boden schauen · Am maximalen Lenkeinschlag fahren</td></tr>
          <tr><td style="padding:6px 4px;font-weight:700;">7. Not-Vollbremsung</td><td style="padding:6px 4px;">Auf <strong>50 km/h</strong> beschleunigen · <strong>Erst auf Bremspunkt, dann abrupt bremsen!</strong> Ohne ABS: Vorderbremse sofort dosieren</td></tr>
        </table>
      </td></tr>
    </table>`

  const tips = [
    tip('🔍', 'Motorrad-Check vor der Prüfung', 'Der Experte macht einen technischen Check! Kontrolliere: <strong>Reifenprofil ≥ 1,6 mm</strong> · Luftdruck korrekt · Kein Riss im Reifen · Alle Lichter &amp; Blinker funktionieren · Spiegel links &amp; rechts · Vollen Tank · Sozius-Sitz montiert · Fahrzeugausweis dabei', color),
    tip('🦺', 'Schutzausrüstung: abriebfestes Material mit Protektoren Pflicht', 'Für Grundkurs und Prüfung: <strong>ECE-Helm mit Visier</strong> · Motorradjacke (CE-Protektoren Schultern + Ellbogen) · Motorradhose · Handschuhe · Motorradstiefel. Keine Sportschuhe!', color),
    tip('👁', 'Die häufigsten Prüfungsfehler', '<strong>1. Schulterblick vergessen</strong> vor Spur- und Richtungswechsel – der Klassiker. <strong>2. Blick vor das Vorderrad</strong> statt weit vorausschauen. <strong>3. Zu früh bremsen</strong> bei Notbremsung. <strong>4. Zu schnell</strong> durch Slalom und Spurgasse.', color),
    tip('🆕', 'Neu ab Juli 2025: FAS auch bei Motorrad', 'Fahrassistenzsysteme (ABS, Traktionskontrolle, Kurven-ABS) werden seit dem 1. Juli 2025 <strong>auch in der Motorrad-Theorieprüfung</strong> geprüft. Lerne besonders: Wann deaktiviere ich was?', color),
    tip('💰', 'Kosten im Überblick', 'Grundkurs (12h): CHF 480–620 · Fahrstunden optional: CHF 95/Lekt. · StVA (LFA + Prüfung): CHF 150–200 · Ges. A1: <strong>ca. CHF 800–1\'400</strong> · A2/A: <strong>ca. CHF 1\'200–2\'000</strong>', color),
  ]

  const body = greeting + kategorien + grundkursBox + uebungenBox + tips.join('') + ctaButton(BOOKING_URL, 'Grundkurs buchen', color)
  return emailWrapper(color, '🏍️', 'Dein kostenloser Motorrad-Guide', body)
}

function buildLastwagenEmail(firstName: string): string {
  const color = '#D97706'
  const greeting = `<p style="margin:0 0 8px;font-size:17px;color:#111827;">Hallo <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">hier ist dein vollständiger <strong>Lastwagen-Guide für die Schweiz</strong> – Kategorie C, CZV-Fähigkeitsausweis, digitaler Fahrtenschreiber und Lenk- und Ruhezeiten, alles auf den Punkt.</p>`

  const kategorien = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fffbeb;border-radius:8px;border-left:4px solid ${color};margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;">🚛 Welche Kategorie brauchst du?</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#374151;">
          <tr style="border-bottom:1px solid #fcd34d;">
            <td style="padding:8px 4px;font-weight:700;width:70px;">Kat. C1</td>
            <td style="padding:8px 4px;">3\'500–7\'500 kg · Ab 18 J. · Lieferwagen, Sanitätsfahrzeuge · ideal für Handwerk &amp; Lieferdienste</td>
          </tr>
          <tr style="border-bottom:1px solid #fcd34d;">
            <td style="padding:8px 4px;font-weight:700;">Kat. C</td>
            <td style="padding:8px 4px;">Über 7\'500 kg · Ab 21 J. · Professioneller Gütertransport · <strong>CZV-Fähigkeitsausweis obligatorisch</strong></td>
          </tr>
          <tr>
            <td style="padding:8px 4px;font-weight:700;">Kat. CE</td>
            <td style="padding:8px 4px;">C + Anhänger (&gt; 750 kg) · Sattelzüge, grosse Gespanne · ca. CHF 3\'000 Aufpreis</td>
          </tr>
        </table>
      </td></tr>
    </table>`

  const ablaufBox = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fffbeb;border-radius:8px;border-left:4px solid ${color};margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;">📋 Ablauf Kat. C – der grosse Unterschied zum Auto</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#374151;">
          <tr style="border-bottom:1px solid #fcd34d;"><td style="padding:5px 4px;font-weight:700;width:30px;">1.</td><td style="padding:5px 4px;">Ärztliche Untersuchung (vertrauensärztlich) – <strong>oft vergessen, aber obligatorisch!</strong></td></tr>
          <tr style="border-bottom:1px solid #fcd34d;"><td style="padding:5px 4px;font-weight:700;">2.</td><td style="padding:5px 4px;">Lernfahrausweis Kat. C beantragen (gültig <strong>24 Monate</strong>)</td></tr>
          <tr style="border-bottom:1px solid #fcd34d;"><td style="padding:5px 4px;font-weight:700;">3.</td><td style="padding:5px 4px;"><strong>Fahrstunden können SOFORT beginnen</strong> – parallel zur Theorie! Nicht erst nach Theorieprüfung warten.</td></tr>
          <tr style="border-bottom:1px solid #fcd34d;"><td style="padding:5px 4px;font-weight:700;">4.</td><td style="padding:5px 4px;">Zusatz-Theorieprüfung C: <strong>40 Fragen, 60 Min.</strong> (C1: 30 Fragen)</td></tr>
          <tr style="border-bottom:1px solid #fcd34d;"><td style="padding:5px 4px;font-weight:700;">5.</td><td style="padding:5px 4px;">CZV-Prüfungen (5 Teile, nur für Berufschauffeure)</td></tr>
          <tr><td style="padding:5px 4px;font-weight:700;">6.</td><td style="padding:5px 4px;">Praktische Prüfung beim StVA – <strong>90 Minuten</strong> (doppelt so lang wie beim Auto!)</td></tr>
        </table>
      </td></tr>
    </table>`

  const tips = [
    tip('🎓', 'CZV: Die 5 Prüfungsteile im Detail', '<strong>1. Schriftl. CZV-Theorie</strong> (40 Fragen, 60 Min.) · <strong>2+3. Zwei E-Prüfungen</strong> je 45 Min., Drag&amp;Drop-Aufgaben · <strong>4. Mündliche Prüfung</strong> 30 Min. über Alltagssituationen · <strong>5. Praktische CZV-Prüfung</strong> 30 Min., manuelle Aufgabe. <strong>Alle 5 müssen bestanden werden!</strong>', color),
    tip('🔄', 'CZV-Fähigkeitsausweis: alle 5 Jahre erneuern', 'Der Ausweis ist <strong>5 Jahre gültig</strong>. Verlängerung: 35 Weiterbildungsstunden (= 5 Tage à 7h). Wer die Pflicht versäumt, darf keine gewerblichen Transporte mehr durchführen – sofortiger Verdienstausfall!', color),
    tip('📟', 'Digitaler Fahrtenschreiber: das musst du wissen', 'Alle LKW &gt;3\'500 kg im gewerblichen Einsatz: digitaler Tachograph Pflicht. <strong>Fahrerkarte</strong> beim StVA beantragen (braucht FAK-Führerausweis). <strong>NEU ab 1. Jan. 2025:</strong> Aufzeichnungen der letzten <strong>56 Tage</strong> müssen bei Kontrollen vorlegt werden (früher 28 Tage).', color),
    tip('⏰', 'Lenk- &amp; Ruhezeiten (ARV 1) – dein tägliches Regelwerk', 'Max. <strong>9h Lenkzeit täglich</strong> (2× pro Woche max. 10h) · Nach 4,5h Fahrt: <strong>45 Min. Pause</strong> (oder 15+30 Min.) · Mind. <strong>11h tägliche Ruhezeit</strong> · Max. 56h Lenkzeit pro Woche. <strong>Verstösse → saftige Bussen für Fahrer UND Arbeitgeber!</strong>', color),
    tip('💰', 'Reale Kostenübersicht 2026', 'Fahrstunden C: CHF 170/45 Min. · Theoriekurs: CHF 800–1\'360 · CZV-Grundausbildung: CHF 1\'200–2\'000 · StVA: CHF 300–500 · Gesamt Kat. C: <strong>ca. CHF 3\'500–6\'500</strong> · Mit CE nochmals +CHF 3\'000', color),
  ]

  const body = greeting + kategorien + ablaufBox + tips.join('') + ctaButton(BOOKING_URL, 'Jetzt beraten lassen', color)
  return emailWrapper(color, '🚛', 'Dein kostenloser Lastwagen-Guide', body)
}

function buildAnhaengerEmail(firstName: string): string {
  const color = '#059669'
  const greeting = `<p style="margin:0 0 8px;font-size:17px;color:#111827;">Hallo <strong>${firstName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">hier ist dein <strong>Anhänger (Kat. BE) Guide</strong> – mit der 750 kg-Regel, den Prüfungs-Manövern und dem einzigen wirklichen Rückwärts-Trick, der wirklich funktioniert.</p>`

  const ruleBox = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0fdf4;border-radius:8px;border-left:4px solid ${color};margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:1px;">⚖️ Brauchst du wirklich das BE?</p>
        <p style="margin:0 0 8px;font-size:13px;color:#374151;">Mit Kategorie B darfst du bereits Anhänger bis <strong>750 kg zGG</strong> ziehen – ODER wenn Zugfahrzeug + Anhänger zusammen unter 3\'500 kg bleiben. Erst darüber braucht es das BE.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#374151;">
          <tr style="border-bottom:1px solid #a7f3d0;"><td style="padding:6px 4px;">Fahrradanhänger (50–100 kg)</td><td style="padding:6px 4px;text-align:right;color:#059669;font-weight:600;">✅ Kein BE nötig</td></tr>
          <tr style="border-bottom:1px solid #a7f3d0;"><td style="padding:6px 4px;">Kleiner Gartenabfall-Hänger (&lt;750 kg)</td><td style="padding:6px 4px;text-align:right;color:#059669;font-weight:600;">✅ Kein BE nötig</td></tr>
          <tr style="border-bottom:1px solid #a7f3d0;"><td style="padding:6px 4px;">Wohnwagen (meist 1\'000–2\'500 kg)</td><td style="padding:6px 4px;text-align:right;color:#dc2626;font-weight:600;">❌ BE erforderlich</td></tr>
          <tr style="border-bottom:1px solid #a7f3d0;"><td style="padding:6px 4px;">Pferdeanhänger (oft 1\'800–3\'500 kg)</td><td style="padding:6px 4px;text-align:right;color:#dc2626;font-weight:600;">❌ BE erforderlich</td></tr>
          <tr><td style="padding:6px 4px;">Bootsanhänger mit schwerem Boot</td><td style="padding:6px 4px;text-align:right;color:#dc2626;font-weight:600;">❌ Oft BE erforderlich</td></tr>
        </table>
        <p style="margin:10px 0 0;font-size:12px;color:#065f46;font-weight:600;">💡 Prüfe immer: Fahrzeugausweis deines Autos → Abschnitt 4 → erlaubte Anhängelast!</p>
      </td></tr>
    </table>`

  const manoevrBox = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0fdf4;border-radius:8px;border-left:4px solid ${color};margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:1px;">🔧 Prüfungs-Manöver (alle rückwärts!)</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#374151;">
          <tr style="border-bottom:1px solid #a7f3d0;"><td style="padding:6px 4px;font-weight:700;width:220px;">Rückwärts gerade</td><td style="padding:6px 4px;">Schritttempo, kleine Korrekturen, immer Spiegel kontrollieren</td></tr>
          <tr style="border-bottom:1px solid #a7f3d0;"><td style="padding:6px 4px;font-weight:700;">Rückwärts in Kurve</td><td style="padding:6px 4px;">Lenkrad unten anfassen (6-Uhr-Position) → der Trick!</td></tr>
          <tr style="border-bottom:1px solid #a7f3d0;"><td style="padding:6px 4px;font-weight:700;">Seitliches Versetzen</td><td style="padding:6px 4px;">Mind. 1 Fahrzeugbreite seitlich verschieben</td></tr>
          <tr style="border-bottom:1px solid #a7f3d0;"><td style="padding:6px 4px;font-weight:700;">Rückwärts zur Rampe</td><td style="padding:6px 4px;">Präzise an Verladerampe heranfahren</td></tr>
          <tr><td style="padding:6px 4px;font-weight:700;">An-/Abkuppeln</td><td style="padding:6px 4px;">Vollständiger Sicherheitscheck: Licht, Bremsen, Stützlast</td></tr>
        </table>
      </td></tr>
    </table>`

  const tips = [
    tip('🤯', 'Der Game-Changer beim Rückwärtsfahren', 'Greife das Lenkrad mit einer Hand ganz <strong>unten (6-Uhr-Position)</strong>. Willst du, dass der Anhänger nach links fährt? Hand nach links. Nach rechts? Hand nach rechts. Diese Methode synchronisiert deine Intuition mit der Physik – absoluter Gamechanger!', color),
    tip('⚠️', 'Den Jackknife-Effekt vermeiden', 'Wenn der Winkel zwischen Auto und Anhänger über 90° geht, kann man den Hänger nicht mehr retten → Jackknife. Sofortige Lösung: <strong>Vorwärtsfahren und neu ausrichten</strong>. Deshalb immer bei kleinen Lenkbewegungen bleiben und langsam fahren!', color),
    tip('🔊', 'Fenster runter, Radio aus', 'Beim Manövrieren: Seitenfenster öffnen für bessere Geräusch-Wahrnehmung und Kommunikation mit dem Einweiser. Radio aus – volle Konzentration! In der Schweiz ist eine <strong>Hilfsperson bei eingeschränkter Rücksicht Pflicht</strong> (z.B. Planenanhänger).', color),
    tip('🔩', 'An-/Abkuppeln: vollständiger Sicherheitscheck', '<strong>1.</strong> Steckverbindung (7-polig) einstecken · <strong>2.</strong> Beleuchtung testen (Bremslicht, Blinker, Rückfahrlicht) · <strong>3.</strong> Stützlast kontrollieren (25–75 kg für die meisten Anhänger) · <strong>4.</strong> Sicherungskette befestigen · <strong>5.</strong> Bremsprobe machen', color),
    tip('📏', 'Stützlast: der unterschätzte Faktor', 'Zu wenig Stützlast (unter 25 kg) → Anhänger schlingert gefährlich auf der Autobahn. Zu viel → Überlastung der Kupplung und Hinterachse des Autos. Optimum: <strong>ca. 60–80% der max. erlaubten Stützlast</strong>. Bei jedem Beladen neu kontrollieren!', color),
    tip('💰', 'Kosten im Überblick', 'Fahrstunden (Ø 6 Doppellektionen × CHF 190): ca. CHF 1\'140 · StVA: ca. CHF 150–200 · Gesamt: ca. <strong>CHF 950–1\'500</strong>. Mit Eigenübungen: bis zu <strong>CHF 500 sparen</strong>!', color),
  ]

  const body = greeting + ruleBox + manoevrBox + tips.join('') + ctaButton(BOOKING_URL, 'Jetzt BE-Kurs buchen', color)
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
    subject: (firstName: string) => `🚗 ${firstName}, deine 10 Insider-Tipps für den Führerausweis`,
    build: buildAutoEmail,
  },
  motorrad: {
    emoji: '🏍️',
    label: 'Motorrad',
    subject: (firstName: string) => `🏍️ ${firstName}, dein kompletter Motorrad-Guide + Prüfungsübungen`,
    build: buildMotorradEmail,
  },
  lastwagen: {
    emoji: '🚛',
    label: 'Lastwagen (Kat. C)',
    subject: (firstName: string) => `🚛 ${firstName}, Kat. C, CZV & Fahrtenschreiber – alles erklärt`,
    build: buildLastwagenEmail,
  },
  anhaenger: {
    emoji: '🚐',
    label: 'Anhänger (Kat. BE)',
    subject: (firstName: string) => `🚐 ${firstName}, der Rückwärts-Trick + alles zum BE-Ausweis`,
    build: buildAnhaengerEmail,
  },
  motorboot: {
    emoji: '⛵',
    label: 'Motorboot',
    subject: (firstName: string) => `⛵ ${firstName}, dein Motorboot-Guide: Theorie, Praxis & Bootsausweis`,
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

  // ─── Save lead to database (non-blocking — email still sends on DB error) ──
  try {
    const { supabaseUrl, supabaseServiceKey } = getSupabaseServiceCredentials(event)
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const { error: dbError } = await supabase.from('website_leads').insert({
        tenant_id: TENANT_ID,
        first_name: name,
        email: email.trim().toLowerCase(),
        category,
        source: 'lead_magnet',
        ip_hash: ip === 'unknown' ? null : ip,
      })
      if (dbError) console.error('⚠️ Lead DB insert error:', dbError.message)
    }
  } catch (dbErr: any) {
    console.error('⚠️ Lead DB error (non-fatal):', dbErr.message)
  }

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
