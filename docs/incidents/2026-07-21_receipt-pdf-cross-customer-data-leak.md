# Vorfallsbericht (Incident Report)

**Titel:** Cross-Customer-Datenleck bei PDF-Quittungen (Storage Path Collision)
**Datum des Vorfalls:** 21.07.2026 (bestätigter Einzelfall), systemisches Problem seit Dezember 2025
**Datum der Meldung:** 21.07.2026, ca. 10:54 Uhr (CEST)
**Datum der Behebung (Produktion):** 21.07.2026, 11:08 Uhr (CEST)
**Berichtsdatum:** 21.07.2026
**Autor:** Pascal Kilchenmann, unterstützt durch KI-gestützte Code-Analyse (Cursor Agent)
**Status:** Root Cause behoben, verifiziert, Bestandsdaten aufgeräumt. Rechtliche Einordnung offen (siehe Abschnitt 8).

> Dieser Bericht dient als interne Dokumentation der Analyse, Ursache, des Ausmasses und der Behebung eines Datensicherheitsvorfalls i.S.v. Art. 24 revDSG. Er ersetzt keine Rechtsberatung.

---

## 1. Zusammenfassung

Ein Kunde (Herr Ruedi Menzi) meldete am 21.07.2026, beim Herunterladen seiner Zahlungsquittungen über die Kundenansicht (`payments.vue`) kurzzeitig die Quittung eines **anderen** Kunden angezeigt bekommen zu haben statt seiner eigenen.

Die Analyse ergab eine **serverseitige Sicherheitslücke**: Beim Sammel-Download "Alle Quittungen herunterladen" wurde der generierte PDF-Pfad im Supabase-Storage-Bucket `receipts` ausschliesslich anhand des Kalendertags gebildet (nicht anhand des Kunden), z. B.:

```
2026/07/Alle_Quittungen_2026-07-21.pdf
```

Da der Upload mit `upsert: true` erfolgte, überschrieb **jeder** Kunde, der am selben Tag ebenfalls seine Quittungen herunterlud, die Datei des vorherigen Kunden am exakt gleichen, öffentlich erreichbaren Pfad. Wer die zuvor erhaltene URL erneut abrief (Browser-Tab, Cache, CDN-Edge-Cache mit `max-age=3600`), erhielt dadurch potenziell die Daten eines fremden Kunden.

Die forensische Auswertung der Storage-Metadaten ergab, dass dies **kein Einzelfall**, sondern ein seit mindestens Dezember 2025 wiederkehrendes strukturelles Problem war: **45 von 79 (57 %)** aller kombinierten Quittungs-PDFs wurden am selben Tag mindestens einmal überschrieben.

Die Ursache wurde identifiziert, behoben, in Produktion verifiziert, und die betroffene, weiterhin öffentlich abrufbare Datei wurde gelöscht. Zusätzlich wurde ein automatischer Aufräum-Mechanismus eingeführt, um die künftige Aufbewahrungsdauer solcher PDFs zu minimieren.

---

## 2. Betroffene Systeme

| Komponente | Pfad | Rolle |
|---|---|---|
| Frontend | `pages/customer/payments.vue` | Auslöser: Button "Alle Quittungen herunterladen" |
| Backend-Endpoint | `server/api/payments/receipt.post.ts` | Generiert PDF (Puppeteer) und lädt es zu Supabase Storage hoch |
| Shared Utility | `server/utils/upload-pdf-public.ts` | Gemeinsame Upload-Funktion, auch für Rechnungen/Mahnungen genutzt |
| Weiterer Endpoint | `server/api/evaluations/export-pdf.post.ts` | Export von Fahrschüler-Bewertungen als PDF |
| Storage | Supabase Storage Bucket `receipts` | Öffentlicher Bucket, in dem alle o.g. PDFs abgelegt werden |

Alle vier Code-Stellen verwendeten denselben fehlerhaften Musteransatz (deterministischer, nutzerunabhängiger Dateipfad + `upsert: true`) und waren damit grundsätzlich für dieselbe Art von Kollision anfällig. Tatsächlich bestätigte Überschreibungen liegen für die Quittungs-PDFs und mindestens einen Fall bei den Bewertungs-PDFs vor (siehe Abschnitt 5).

---

## 3. Entdeckung und Meldung

- **21.07.2026, ca. 10:54 Uhr CEST:** interne Meldung an Pascal Kilchenmann, dass ein Kunde eine fremde Quittung erhalten habe.
- **21.07.2026, später:** Herr Ruedi Menzi bestätigte proaktiv gegenüber dem Betrieb, beim Quittungs-Download die Quittung eines anderen Kunden gesehen zu haben.

---

## 4. Technische Ursachenanalyse (Root Cause)

### 4.1 Fehlerhafter Code (vor der Korrektur)

```typescript
// server/api/payments/receipt.post.ts (vorher)
const filename = authorizedPayments.length === 1
  ? `Quittung_${authorizedPayments[0].id}_${new Date().toISOString().split('T')[0]}.pdf`
  : `Alle_Quittungen_${new Date().toISOString().split('T')[0]}.pdf`

const filepath = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${filename}`

// Upload mit upsert: true → überschreibt bestehende Datei am selben Pfad
```

**Kernproblem:** Für den Sammel-Download ("Alle Quittungen") hängt der Speicherpfad **ausschliesslich vom Kalendertag** ab – nicht vom Kunden. Der Einzel-Download war unkritisch, da dort die `payment.id` (eindeutig pro Zahlung) bereits Teil des Dateinamens war.

### 4.2 Ablauf, der zur Datenvermischung führte

1. Kunde A lädt seine Quittungen herunter → PDF wird nach `2026/07/Alle_Quittungen_2026-07-21.pdf` hochgeladen, öffentliche URL wird zurückgegeben, Kunde A ruft sie ab.
2. Kunde B lädt am selben Tag ebenfalls seine Quittungen herunter → sein PDF wird auf **denselben Pfad** hochgeladen und überschreibt Kunde A's Datei.
3. Kunde A öffnet den Link erneut (alter Tab, Verlauf, erneuter Klick) oder sein Abruf war minimal langsamer als der Upload von Kunde B → er erhält **Kunde B's PDF** statt seines eigenen.
4. Zusätzlich verstärkt durch CDN-Edge-Caching der öffentlichen Storage-URL (`Cache-Control: max-age=3600` beobachtet), wodurch auch nach einem erneuten, eigentlich korrekten Überschreiben kurzfristig noch eine ältere, fremde Version ausgeliefert werden konnte.

### 4.3 Korrektur

```typescript
// server/api/payments/receipt.post.ts (nachher)
const uniqueToken = crypto.randomUUID()
const filename = authorizedPayments.length === 1
  ? `Quittung_${authorizedPayments[0].id}_${new Date().toISOString().split('T')[0]}.pdf`
  : `Alle_Quittungen_${new Date().toISOString().split('T')[0]}.pdf`

const filepath = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${user.id}/${uniqueToken}_${filename}`
```

Der Speicherpfad enthält nun zusätzlich die `user.id` sowie ein zufälliges, nicht erratbares `crypto.randomUUID()`-Token. Jeder Request erhält dadurch garantiert einen eindeutigen Pfad – Kollisionen und URL-Guessing sind ausgeschlossen. Der für den Nutzer sichtbare Dateiname (z. B. `Alle_Quittungen_2026-07-21.pdf`) bleibt unverändert; nur der interne Storage-Pfad wurde eindeutig gemacht.

Dieselbe Korrektur wurde präventiv auch angewendet auf:
- `server/utils/upload-pdf-public.ts` (Rechnungs-/Mahnungs-PDFs)
- `server/api/evaluations/export-pdf.post.ts` (Bewertungs-PDFs)

Der gesamte übrige Code wurde systematisch nach demselben Anti-Pattern (`upsert: true` + nutzerunabhängiger Pfad) durchsucht; keine weiteren betroffenen Stellen gefunden (bestehende Upload-Endpunkte für Logos, Dokumente, Lizenzen etc. scopen ihre Pfade bereits korrekt nach `userId`/`tenantId` bzw. verwenden Millisekunden-Zeitstempel).

---

## 5. Forensische Beweise

### 5.1 Bestätigter Vorfall vom 21.07.2026

Auswertung der Supabase-Storage-Metadaten (`storage.objects`) für die Datei `2026/07/Alle_Quittungen_2026-07-21.pdf` sowie der Storage-Zugriffslogs (letzte 24h):

| Zeit (UTC) | Zeit (CEST) | Ereignis |
|---|---|---|
| 06:53:48 | 08:53:48 | Datei neu erstellt (1. Kunde), unmittelbar danach von einem iPhone abgerufen |
| 08:46:33 | 10:46:33 | **Überschrieben** durch einen weiteren Kunden |
| 08:47:13 | 10:47:13 | **Erneut überschrieben**, nur 40 Sekunden später – bestätigt als Upload von Herrn Ruedi Menzi |

Die Meldung ging um 10:54 Uhr CEST ein – 7 Minuten nach der letzten Überschreibung. Die zeitliche Nähe stützt die Kausalkette.

**Direkte Verifikation:** Die zum Zeitpunkt der Untersuchung unter der öffentlichen URL abrufbare Datei wurde heruntergeladen und ausgelesen. Sie enthielt die Daten von **Ruedi Menzi** (16 Fahrstunden Kategorie CE, Zeitraum 28.04.–18.06.2026, Gesamtbetrag CHF 3'198.00, inkl. Name, Adresse, Telefonnummer, E-Mail).

Herr Menzis eigener Upload (08:47:13 UTC) war der letzte der drei Schreibvorgänge – seine Angabe, eine fremde Quittung gesehen zu haben, ist damit durch einen Race-Condition-/Caching-Effekt erklärbar: Sein Abruf traf kurz zuvor auf die noch nicht ersetzte bzw. zwischenzeitlich gecachte Version des vorherigen (dritten) Kunden.

**Nicht identifizierbar:** Die Identität des Kunden, dessen Daten Herr Menzi zu sehen bekam (Upload von 08:46:33 UTC), konnte nicht ermittelt werden. Gründe:
- Uploads erfolgen über den Service-Role-Key des Servers; Storage-Logs zeigen nur den Server ("node"), nicht den einzelnen Endnutzer.
- Supabase-Auth-Logs sind plattformweit (Multi-Tenant-SaaS mit vielen Fahrschulen) mit Token-Refresh-Ereignissen überlagert und liessen keine eindeutige Zuordnung zu.
- Vercel-Function-Logs sind ohne konfigurierten Log-Drain nur für ca. 5 Minuten live abrufbar; historische Daten von heute Morgen waren nicht mehr verfügbar.
- Auf Wunsch des Betriebs wurde die weitere Identifikation dieses dritten Kunden nicht fortgeführt (Option: nachträglich möglich, falls Herr Menzi sich an den angezeigten Namen erinnert).

### 5.2 Ausmass seit Dezember 2025

Auswertung sämtlicher kombinierten Quittungs-PDFs (`Alle_Quittungen_*.pdf`) im Bucket `receipts` seit Einführung des Features:

| Kennzahl | Wert |
|---|---|
| Zeitraum | Dezember 2025 – 21.07.2026 (~7,5 Monate) |
| Erzeugte kombinierte Quittungs-PDFs gesamt | 79 |
| Davon am selben Tag mindestens einmal überschrieben | 45 (57 %) |

Weitere bestätigte Einzelfälle von Überschreibung (Beispiele, `created_at ≠ updated_at`):
- `2026/07/Alle_Quittungen_2026-07-13.pdf` – überschrieben ~7 h später
- `2026/07/Alle_Quittungen_2026-07-12.pdf` – überschrieben ~8,5 h später
- `2026/06/Alle_Quittungen_2026-06-30.pdf` – überschrieben ~11 h später
- `2026/05/Alle_Quittungen_2026-05-26.pdf` – überschrieben ~1 h später
- `evaluations/2026/07/Bewertungen_Loris_Mehmeti_2026-07-02.pdf` – überschrieben ~5 h später (identisches Kollisionsmuster auch bei Bewertungs-PDFs bestätigt, hier gleicher Schüler)

**Wichtige Einordnung:** Eine Überschreibung allein bedeutet nicht automatisch, dass ein Kunde tatsächlich fremde Daten zu Gesicht bekommen hat – dafür braucht es zusätzlich einen (erneuten) Abruf der URL nach der Überschreibung. Die tatsächliche Zahl konkreter Fremdzugriffe lässt sich mit den vorhandenen Log-Daten nicht rückwirkend bestimmen. Bekannt und bestätigt ist ein Fall (Herr Menzi). Angesichts der hohen Kollisionsrate (57 % über 7+ Monate) ist jedoch von einer nicht unerheblichen Wahrscheinlichkeit weiterer, nicht gemeldeter Fälle auszugehen.

---

## 6. Betroffene Datenkategorien

Bei den kombinierten Quittungs-PDFs sind je nach Kunde folgende Personendaten enthalten:
- Name, Adresse
- E-Mail-Adresse, Telefonnummer
- Zahlungsbeträge, Zahlungsmethode, Zahlungsdaten/-zeitpunkte
- Termin-/Lektionsdaten, Kategorie (z. B. Führerscheinkategorie), Instruktorname

Bei den Bewertungs-PDFs (`evaluations/`) zusätzlich:
- Fahrschüler-Bewertungsdetails (fachliche Beurteilungen der Fahrstunden)

Es handelt sich um Personendaten i.S.v. Art. 5 lit. a DSG. Keine der betroffenen Kategorien fällt unter "besonders schützenswerte Personendaten" nach Art. 5 lit. c DSG (z. B. Gesundheitsdaten), mit möglicher Ausnahme einzelner Formulierungen in Bewertungstexten, die im Einzelfall zu prüfen wären.

---

## 7. Massnahmen

### 7.1 Sofortmassnahmen (21.07.2026)

| Zeit (CEST) | Massnahme | Referenz |
|---|---|---|
| 11:08 | Root-Cause-Fix committet und in Produktion deployed: eindeutige Storage-Pfade (User-ID + `crypto.randomUUID()`) für Quittungen, Rechnungen/Mahnungen und Bewertungs-PDFs | Commit `e98b9557` |
| nach Fix | Verifikation in Produktion: neue Uploads erzeugen nachweislich eindeutige, nicht kollidierende Pfade (z. B. `2026/07/{user.id}/{uuid}_Alle_Quittungen_...pdf`) | manueller Test durch Pascal Kilchenmann |
| nach Fix | Löschung der weiterhin öffentlich abrufbaren, Herrn Menzis Daten enthaltenden Datei `2026/07/Alle_Quittungen_2026-07-21.pdf`; Löschung verifiziert (HTTP 404 auf öffentlicher URL) | Supabase Storage API |

### 7.2 Strukturelle / präventive Massnahmen

| Zeit (CEST) | Massnahme | Referenz |
|---|---|---|
| 11:40 | Einführung einer SQL-Funktion `list_expired_receipts()` zur Identifikation abgelaufener PDF-Objekte | Migration `sql_migrations/20260721_add_cleanup_expired_receipts_function.sql` |
| 11:40 | Neuer täglicher Cron-Job `cleanup-expired-receipts` (03:15 Uhr): löscht Quittungs-/Bewertungs-PDFs, die älter als 48 Stunden sind, automatisch über die Storage-API | Commit `adfe17e8`, `server/api/cron/cleanup-expired-receipts.get.ts` |
| 11:40 | Einmaliger Bereinigungslauf des Datenbestands: 116 bereits über 48h alte Quittungs-/Bewertungs-PDFs aus dem Zeitraum Dez. 2025 – Jul. 2026 gelöscht | manueller Lauf, verifiziert (0 verbleibende abgelaufene Objekte) |

**Begründung für die verkürzte Aufbewahrung:** Quittungs- und Bewertungs-PDFs werden bei jedem Abruf vollständig neu aus den Datenbanktabellen (`payments`, `appointments`, Bewertungsdaten) generiert. Die PDF-Datei im Storage ist reine Darstellung, nicht die massgebliche Datenquelle, und wird ausschliesslich benötigt, um Capacitor-Apps eine abrufbare HTTPS-URL bereitzustellen. Eine dauerhafte Aufbewahrung ist damit weder technisch nötig noch mit dem Grundsatz der Datenminimierung (Art. 6 Abs. 4 revDSG) vereinbar; sie vergrössert lediglich unnötig die Angriffs- und Expositionsfläche. Rechnungen (`invoices/`) und Mahnungen (`dunning/`) sind von dieser verkürzten Aufbewahrung bewusst ausgenommen, bis die formellen Aufbewahrungspflichten (Art. 958f OR) mit der Treuhandstelle abschliessend geklärt sind.

### 7.3 Verifikation der Behebung

Nach dem Fix wurden zwei neue Testuploads durch Pascal Kilchenmann (User-ID `1c492300-d9b5-4339-8c57-ae2d7e972197`) am selben Tag ausgeführt:

```
2026/07/1c492300-d9b5-4339-8c57-ae2d7e972197/ed641c3e-6fda-4b9f-9a7e-1859c17929fa_Alle_Quittungen_2026-07-21.pdf
2026/07/1c492300-d9b5-4339-8c57-ae2d7e972197/2a54de2b-938e-466e-8826-0f442028fa6e_Alle_Quittungen_2026-07-21.pdf
```

Ergebnis: Zwei eigenständige Objekte mit unterschiedlichen Zufalls-Token, `created_at = updated_at` bei beiden (keine nachträgliche Überschreibung) – der Fix funktioniert nachweislich auch bei mehreren Downloads durch dieselbe Person am selben Tag.

---

## 8. Rechtliche Einordnung (unverbindlich – keine Rechtsberatung)

Gemäss revDSG (in Kraft seit 1.9.2023) handelt es sich bei diesem Vorfall um eine **Verletzung der Datensicherheit** i.S.v. Art. 24 DSG.

Relevante Punkte für die weitere rechtliche Prüfung:
- **Meldepflicht an den EDÖB** besteht, wenn die Verletzung voraussichtlich zu einem **hohen Risiko** für die Persönlichkeit oder Grundrechte der betroffenen Personen führt (Art. 24 Abs. 1 DSG). Dies ist eine Einzelfall-Risikobewertung.
- Für die Risikobewertung relevant: Art der Daten (keine besonders schützenswerten Kategorien, ausser ggf. bei Bewertungstexten), Anzahl potenziell Betroffener, **Wiederholungscharakter über 7+ Monate**, tatsächlich eingetretener (mind. 1 bestätigter Fall) vs. nur potenzieller Schaden.
- Falls eine Meldung erforderlich ist, muss sie "so schnell wie möglich" erfolgen.
- Betroffene Personen sind zu informieren, wenn dies zu ihrem Schutz notwendig ist oder der EDÖB dies verlangt (Art. 24 Abs. 4 DSG).
- Bei EU-Kundschaft wäre zusätzlich die DSGVO zu prüfen (Meldung an die zuständige Aufsichtsbehörde innerhalb von 72h, Art. 33 DSGVO).

**Empfehlung:** Diesen Bericht einer Datenschutz-/Rechtsberatung vorlegen, um verbindlich zu klären, ob und in welchem Umfang eine Meldung an den EDÖB sowie eine Information der betroffenen Kundschaft erforderlich ist.

---

## 9. Offene Punkte / Empfehlungen

1. Rechtliche Prüfung der Meldepflicht (Abschnitt 8) mit Datenschutzberatung.
2. Prüfung, ob eine Cyber-/Vertrauensschaden-Versicherung besteht und einzubeziehen ist.
3. Entscheidung, ob Herr Menzi nach dem Namen auf der fälschlich erhaltenen Quittung gefragt wird, um den dritten betroffenen Kunden nachträglich zu identifizieren und zu informieren.
4. Formelle Klärung der Aufbewahrungsfrist für Rechnungs-/Mahnungs-PDFs mit der Treuhandstelle (aktuell von der automatischen Löschung ausgenommen).
5. Optional: Log-Drain für Vercel-Function-Logs einrichten, um bei künftigen Vorfällen eine schnellere und vollständigere forensische Rekonstruktion zu ermöglichen.

---

## Anhang A: Betroffener Code (Diff-Zusammenfassung)

- `server/api/payments/receipt.post.ts` – Storage-Pfad um `user.id` + `crypto.randomUUID()` ergänzt
- `server/utils/upload-pdf-public.ts` – Storage-Pfad um `crypto.randomUUID()` ergänzt
- `server/api/evaluations/export-pdf.post.ts` – Storage-Pfad um `crypto.randomUUID()` ergänzt
- `sql_migrations/20260721_add_cleanup_expired_receipts_function.sql` – neue Funktion `list_expired_receipts()`
- `server/api/cron/cleanup-expired-receipts.get.ts` – neuer täglicher Cleanup-Cron
- `vercel.json` – Cron-Eintrag für `cleanup-expired-receipts` ergänzt

## Anhang B: Relevante Commits

| Commit | Zeitpunkt (CEST) | Beschreibung |
|---|---|---|
| `e98b9557` | 21.07.2026, 11:08:02 | fix(security): prevent cross-customer PDF leakage in receipts storage |
| `adfe17e8` | 21.07.2026, 11:40:08 | Add automatic cleanup for expired receipt/evaluation PDFs |
