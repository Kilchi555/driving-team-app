/**
 * server/templates/pci-templates.mjs
 *
 * Single source of truth for the per-tenant PCI documents (German).
 * Imported by BOTH:
 *   - scripts/generate-pci-docs.mjs (CLI / offline PDF generation)
 *   - server/api/admin/pci-docs.get.ts (super-admin UI, printable HTML)
 *
 * Because this module is *imported* (not read from disk), it is bundled into
 * the serverless function on Vercel — unlike files under docs/.
 *
 * Placeholders use the {{NAME}} syntax and are filled by fillTemplate().
 */

export const COMPLIANCE_POLICY_DE = `# PCI-Compliance-Richtlinie — {{COMPANY_NAME}}

| | |
|---|---|
| **Unternehmen** | {{COMPANY_NAME}} |
| **Adresse** | {{COMPANY_ADDRESS}} |
| **UID** | {{COMPANY_UID}} |
| **In Kraft seit** | {{EFFECTIVE_DATE}} |
| **Nächste Überprüfung** | {{REVIEW_DATE}} (mindestens jährlich) |
| **Freigegeben durch** | {{APPROVER_NAME}}, {{APPROVER_TITLE}} |
| **Kontakt** | {{CONTACT_EMAIL}} |

---

## Zweck und Geltungsbereich

Diese Richtlinie beschreibt, wie {{COMPANY_NAME}} (im Folgenden «wir» / «das Unternehmen»)
den Payment Card Industry Data Security Standard (PCI DSS) einhält und sicherstellt, dass
alle über Wallee abgewickelten Zahlungen die grundlegenden Sicherheitsanforderungen
erfüllen.

Die Wallee Group AG ist nach PCI DSS **Level 1** zertifiziert und gewährleistet, dass
keine Karteninhaberdaten durch uns gespeichert, verarbeitet oder übertragen werden.
**Wir speichern, verarbeiten oder übertragen keine Karteninhaberdaten (CHD) auf unseren
eigenen Systemen.**

### Anwendbares PCI-DSS-Validierungslevel

Da Kartendaten ausschliesslich auf der extern gehosteten Zahlungsseite von Wallee erfasst
und niemals in unsere Systeme eingegeben, durch sie übertragen oder dort gespeichert
werden, qualifiziert sich unser Umfeld für **SAQ A** (vollständig ausgelagerte
Kartenabwicklung, Redirect-Modell).

## So funktioniert die Zahlung (technischer Geltungsbereich)

1. Die Zahlung wird über die Software-Plattform **Simy** (Simy IT Systems Kilchenmann,
   technischer Integrationspartner) abgewickelt. Beim Erstellen einer Transaktion werden
   **ausschliesslich** Betrag, Währung, Kundenname/-E-Mail sowie eine Auftrags­beschreibung
   an Wallee übermittelt — **niemals Kartendaten**.
2. Der Kunde wird auf die **extern gehostete Zahlungsseite von Wallee** weitergeleitet
   (\`app-wallee.com\`). Die vollständige Kartennummer (PAN), das Ablaufdatum und der
   CVV werden **dort** auf Wallees PCI-zertifizierten Systemen eingegeben — niemals auf
   einer Seite des Unternehmens.
3. Nach der Zahlung leitet Wallee den Kunden zurück. Gespeichert werden **ausschliesslich**
   eine Wallee-Transaktionsreferenz und ggf. ein **opaker Wallee-Zahlungs-Token**. Es
   werden niemals PAN, CVV oder Ablaufdatum gespeichert.
4. Hosting (Vercel) und Datenbank (Supabase) der Plattform erhalten somit niemals
   Karteninhaberdaten.

## Grundsätze

- Alle Kartentransaktionen werden ausschliesslich über die PCI-zertifizierten Systeme der
  Wallee Group AG abgewickelt.
- Wir speichern oder verarbeiten keine Karteninhaberdaten auf eigenen Systemen. Es werden
  nur nicht-sensible Wallee-Referenzen (Transaktions-IDs und opake Tokens) aufbewahrt.
- Auf unseren Seiten werden keine Zahlungs-Eingabe-Skripte Dritter geladen; die
  Karteneingabe erfolgt vollständig auf Wallees gehosteter Seite.
- Die PCI-DSS-Konformität (SAQ A) wird mindestens jährlich überprüft, ausgefüllt und
  dokumentiert.
- Alle Personen mit Zugang zu zahlungsrelevanten Systemen verwenden starke, eindeutige
  Zugangsdaten sowie — wo verfügbar — Mehrfaktor- bzw. Passkey-Authentifizierung.

## Verantwortlichkeiten

| Rolle | Verantwortung |
|------|----------------|
| **PCI-Compliance-Verantwortliche/r** — {{APPROVER_NAME}} | Koordiniert die PCI-Aktivitäten, füllt die jährliche SAQ-A-Selbstbeurteilung aus, prüft sie und dokumentiert die Konformität. |
| **Technischer Plattformpartner** — Simy IT Systems Kilchenmann | Stellt sicher, dass über die Plattform keine Karteninhaberdaten verarbeitet oder gespeichert werden und die Kartenabwicklung ausschliesslich über Wallee erfolgt. |
| **Geschäftsleitung** — {{COMPANY_NAME}} | Genehmigt diese Richtlinie und stellt die erforderlichen Ressourcen bereit. |
| **Alle Mitarbeitenden** | Verstehen und befolgen diese PCI-Compliance-Richtlinie. |

## Überprüfung und Kommunikation

Diese Richtlinie wird mindestens jährlich überprüft oder immer dann, wenn wesentliche
technologische oder geschäftliche Änderungen eintreten (z. B. Wechsel des
Zahlungsabwicklers oder Änderung der Zahlungsintegration). Sie wird allen Mitarbeitenden
zur Verfügung gestellt und Wallee auf Anfrage übermittelt.

## Schulung und Sensibilisierung

Alle relevanten Mitarbeitenden erhalten jährlich eine Schulung und Auffrischung zu
PCI-Themen (mindestens die Bestätigung, dass sie diese PCI-Compliance-Richtlinie kennen
und befolgen).
`

export const INCIDENT_RESPONSE_PLAN_DE = `# PCI Incident-Response-Plan — {{COMPANY_NAME}}

| | |
|---|---|
| **Unternehmen** | {{COMPANY_NAME}} |
| **Adresse** | {{COMPANY_ADDRESS}} |
| **UID** | {{COMPANY_UID}} |
| **In Kraft seit** | {{EFFECTIVE_DATE}} |
| **Nächste Überprüfung** | {{REVIEW_DATE}} (mindestens jährlich getestet) |
| **Freigegeben durch** | {{APPROVER_NAME}}, {{APPROVER_TITLE}} |
| **Kontakt** | {{CONTACT_EMAIL}} |

---

## Zweck und Zielsetzung

Dieser Plan definiert, wie {{COMPANY_NAME}} (im Folgenden «wir» / «das Unternehmen») auf
Sicherheitsvorfälle reagiert, die Karteninhaberdaten oder die PCI-DSS-Konformität
betreffen könnten. Ziel ist es, Risiken zu minimieren, Vorfälle rasch einzudämmen und eine
wirksame Kommunikation mit den betroffenen Parteien sicherzustellen.

Dieser Prozess gilt für alle Systeme, Netzwerke und Personen, die an der Verarbeitung,
Übertragung oder Speicherung zahlungsrelevanter Daten beteiligt sind. Er umfasst alle
Arten von Sicherheitsvorfällen, einschliesslich vermuteter Datenschutzverletzungen,
Malware-Infektionen, unbefugtem Zugriff, Kontokompromittierung und Datenverlust.

> **Kontext:** Karteninhaberdaten werden niemals auf den Systemen des Unternehmens oder
> der Plattform Simy gespeichert, verarbeitet oder übertragen — sie werden ausschliesslich
> von Wallees PCI-zertifizierter, gehosteter Zahlungsseite verarbeitet. Die relevantesten
> Vorfallarten sind daher: Kompromittierung eines administrativen Kontos, Kompromittierung
> der Wallee-API-Zugangsdaten, unbefugter Zugriff auf die Datenbank oder Kompromittierung
> der Hosting-Umgebung.

## Rollen und Verantwortlichkeiten

| Rolle | Verantwortung |
|------|----------------|
| **Incident-Koordinator/in** — {{APPROVER_NAME}} ({{CONTACT_EMAIL}}) | Koordiniert das Vorfallmanagement, dokumentiert den Vorfall und informiert relevante Parteien (z. B. Acquirer, Wallee, Behörden, betroffene Kunden). |
| **Technische Leitung** — Simy IT Systems Kilchenmann (Plattformpartner) | Analysiert technische Ursachen, führt die Eindämmung (Rotation von Zugangsdaten, Sperren von Zugängen) und die Wiederherstellung durch. |
| **Kommunikationsleitung** — {{COMPANY_NAME}} | Steuert die interne und externe Kommunikation, einschliesslich mit Kunden und Behörden. |

## Wichtige Kontakte

| Partei | Kontakt |
|-------|---------|
| Wallee Support | support@wallee.com |
| Eidg. Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB) | https://www.edoeb.admin.ch — bei Verletzungen des Personendatenschutzes nach revDSG |
| Kantonspolizei | bei Verdacht auf strafbare Handlungen (z. B. Cyberkriminalität) |
| Plattformpartner | Simy IT Systems Kilchenmann — info@simy.ch |

## Vorgehen bei einem Vorfall

1. **Erkennung und Meldung** — Jede verdächtige Aktivität wird unverzüglich an den/die
   Incident-Koordinator/in ({{CONTACT_EMAIL}}) gemeldet.
2. **Identifikation und Erstbeurteilung** — Der Vorfall wird protokolliert (Datum,
   Uhrzeit und detaillierte Beobachtungen) und es erfolgt eine vorläufige Analyse von Art
   und Umfang des Vorfalls.
3. **Eindämmung** — Betroffene Systeme werden isoliert, um weiteren Schaden zu verhindern.
   Typische Eindämmungsmassnahmen:
   - Rotation der Wallee-API-Zugangsdaten (Space-User / API-Secret) in der Konfiguration.
   - Rotation der Datenbank-Schlüssel und Überprüfung der Zugriffsrichtlinien (RLS).
   - Sperren/Deaktivieren kompromittierter Admin-Konten; erzwungener Passwort-Reset und erneute Passkey-/MFA-Registrierung.
   - Bei Bedarf betroffene Deployments offline nehmen oder zurückrollen.
4. **Kommunikation** — Wallee (support@wallee.com) und betroffene Kunden werden ohne
   unangemessene Verzögerung benachrichtigt. Sind Personendaten betroffen, wird der EDÖB
   gemäss revDSG informiert; bei Verdacht auf strafbare Handlungen wird die Kantonspolizei
   eingeschaltet.
5. **Beseitigung** — Die Bedrohung wird aus dem System entfernt, Ursache und
   Schwachstellen werden identifiziert und allfällige Malware oder unbefugte Zugangspunkte
   beseitigt.
6. **Wiederherstellung** — Systeme werden überprüft, bereinigt und sicher in den Betrieb
   zurückgeführt. Vor der Wiederaufnahme des Normalbetriebs wird getestet, dass alles
   sicher läuft.
7. **Nachbearbeitung** — Der Vorfall wird dokumentiert, analysiert und es werden
   Korrekturmassnahmen definiert und umgesetzt, um eine Wiederholung zu verhindern.

## Kommunikation

Alle Vorfälle, die Karteninhaberdaten oder die PCI-Konformität betreffen, müssen **ohne
Verzögerung** an Wallee (support@wallee.com) und — sofern zutreffend — an die zuständigen
Behörden gemeldet werden (EDÖB bei Personendatenverletzungen; Kantonspolizei bei
strafbaren Handlungen). Die interne Kommunikation erfolgt stets über sichere Kanäle.

## Schulung und Überprüfung

Alle relevanten Mitarbeitenden erhalten jährlich eine Schulung zum Incident-Response-
Prozess. Dieser Plan wird mindestens einmal jährlich getestet und bei Bedarf aktualisiert.
`

export const PCI_DOCS = [
  { key: 'compliance', title: 'PCI-Compliance-Richtlinie', filenameBase: 'PCI-Compliance-Richtlinie', template: COMPLIANCE_POLICY_DE },
  { key: 'irp', title: 'PCI-Incident-Response-Plan', filenameBase: 'PCI-Incident-Response-Plan', template: INCIDENT_RESPONSE_PLAN_DE },
]

/** Placeholder for missing fields — never silently wrong. */
export const placeholder = (label, val) => val || `[BITTE AUSFÜLLEN: ${label}]`

/** Build the standard {{...}} replacement map. */
export function buildReplacements({ company, address, uid, email, approver, title, effectiveDate, reviewDate }) {
  const today = new Date()
  const eff = effectiveDate || today.toISOString().slice(0, 10)
  const rev = reviewDate ||
    `${today.getFullYear() + 1}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return {
    COMPANY_NAME:    company,
    COMPANY_ADDRESS: placeholder('Adresse', address),
    COMPANY_UID:     placeholder('UID', uid),
    CONTACT_EMAIL:   placeholder('Kontakt-E-Mail', email),
    APPROVER_NAME:   placeholder('Name Unterzeichner', approver),
    APPROVER_TITLE:  placeholder('Funktion', title),
    EFFECTIVE_DATE:  eff,
    REVIEW_DATE:     rev,
  }
}

/** Replace {{NAME}} placeholders with values from the map. */
export function fillTemplate(template, replacements) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    k in replacements ? replacements[k] : `{{${k}}}`)
}

/** Minimal, dependency-free Markdown → HTML (supports the constructs used in the templates). */
export function mdToHtml(src) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (s) => esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
  const lines = src.split('\n')
  let html = '', i = 0, inUl = false, inOl = false
  const closeLists = () => { if (inUl) { html += '</ul>\n'; inUl = false } if (inOl) { html += '</ol>\n'; inOl = false } }
  while (i < lines.length) {
    const line = lines[i]
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      closeLists()
      const header = line.split('|').slice(1, -1).map((c) => c.trim())
      i += 2
      html += '<table><thead><tr>' + header.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>\n'
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim())
        html += '<tr>' + cells.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>\n'
        i++
      }
      html += '</tbody></table>\n'; continue
    }
    if (/^#\s+/.test(line)) { closeLists(); html += `<h1>${inline(line.replace(/^#\s+/, ''))}</h1>\n`; i++; continue }
    if (/^##\s+/.test(line)) { closeLists(); html += `<h2>${inline(line.replace(/^##\s+/, ''))}</h2>\n`; i++; continue }
    if (/^###\s+/.test(line)) { closeLists(); html += `<h3>${inline(line.replace(/^###\s+/, ''))}</h3>\n`; i++; continue }
    if (/^---\s*$/.test(line)) { closeLists(); html += '<hr/>\n'; i++; continue }
    if (/^>\s?/.test(line)) { closeLists(); html += `<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>\n`; i++; continue }
    if (/^\s*[-*]\s+/.test(line)) { if (!inUl) { closeLists(); html += '<ul>\n'; inUl = true } html += `<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>\n`; i++; continue }
    if (/^\s*\d+\.\s+/.test(line)) { if (!inOl) { closeLists(); html += '<ol>\n'; inOl = true } html += `<li>${inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>\n`; i++; continue }
    if (line.trim() === '') { closeLists(); i++; continue }
    closeLists(); html += `<p>${inline(line)}</p>\n`; i++
  }
  closeLists()
  return html
}

/** Standalone print CSS shared by CLI PDF and the UI print page. */
export const PRINT_CSS = `
@page { margin: 22mm 18mm; }
body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 11pt; line-height: 1.5; }
h1 { font-size: 20pt; border-bottom: 3px solid #7C3AED; padding-bottom: 6px; }
h2 { font-size: 14pt; color: #7C3AED; margin-top: 22px; }
h3 { font-size: 12pt; margin-top: 16px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
th { background: #f3effc; }
blockquote { border-left: 4px solid #A855F7; background: #faf8ff; margin: 12px 0; padding: 8px 14px; color: #444; }
code { background: #f0f0f3; padding: 1px 5px; border-radius: 3px; font-size: 9.5pt; }
hr { border: none; border-top: 1px solid #ddd; margin: 18px 0; }
a { color: #7C3AED; }
li { margin: 3px 0; }
`

/** Wrap rendered body HTML into a full standalone HTML document. */
export function htmlDocument(bodyHtml, { title = 'PCI-Dokument', includePrintButton = false } = {}) {
  const printBtn = includePrintButton
    ? `<div class="no-print" style="position:sticky;top:0;background:#fff;padding:12px 0;border-bottom:1px solid #eee;margin-bottom:16px;">
         <button onclick="window.print()" style="background:#7C3AED;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:14px;cursor:pointer;">Drucken / Als PDF speichern</button>
       </div>`
    : ''
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_CSS}
@media print { .no-print { display: none !important; } }
.pci-doc + .pci-doc { page-break-before: always; }
body { max-width: 820px; margin: 0 auto; padding: 0 16px 40px; }
</style></head><body>${printBtn}${bodyHtml}</body></html>`
}
