# Buchhaltung Roadmap — Von Phase 1 zur Weltklasse-Software

> **Ziel:** Eine vollständige, schweizer-rechtskonforme Buchhaltungslösung, die so einfach ist wie YNAB,
> so professionell wie Bexio, und nahtlos in die Fahrschul-App integriert ist — ohne dass der Nutzer
> je eine andere Software öffnen muss.

---

## ⚠️ Rechtliche Compliance — Was vor dem Produktivgang erledigt sein MUSS

> Dies sind keine Nice-to-haves. Ein erfahrener Schweizer Treuhänder oder Revisor würde diese Punkte
> sofort beanstanden. Sie müssen **vor dem ersten echten Nutzer** umgesetzt sein.

### 🔴 P0 — Kritisch (OR-Pflicht)

#### 1. Buchungs-Unveränderbarkeit (OR Art. 957a Abs. 2 Ziff. 5)

**Was das Gesetz verlangt:** Einmal gebuchte Vorgänge dürfen nicht überschrieben werden.
Korrekturen sind nur durch eine neue Gegenbuchung (Storno) erlaubt.

**Was wir aktuell falsch machen:** `PATCH /entries/[id]` überschreibt Buchungen direkt.
Das ist OR-widrig und würde bei einer Revision sofort auffallen.

**Lösung:**
- Neues Feld `locked_at TIMESTAMPTZ` auf `accounting_entries`
- Buchungen werden nach **30 Tagen automatisch gesperrt** (Cron-Job)
- Admin kann manuell sperren (Monatsabschluss)
- Gesperrte Buchung → kein PATCH, kein DELETE mehr möglich (HTTP 403)
- Korrekturen: neues Feld `storno_of_id UUID` — Storno-Buchung referenziert Original
- Im PDF-Export: stornierte Buchungen erscheinen **durchgestrichen** mit Vermerk

**Neue DB-Migration nötig:**
```sql
ALTER TABLE accounting_entries
  ADD COLUMN locked_at TIMESTAMPTZ,
  ADD COLUMN storno_of_id UUID REFERENCES accounting_entries(id);
```

---

#### 2. Aufbewahrungspflicht nach Vertragsende (OR Art. 958f)

**Was das Gesetz verlangt:** 10 Jahre Aufbewahrung aller Buchungsbelege und Geschäftsbücher.

**Das Risiko:** Wenn eine Fahrschule das Simy-Abo kündigt und ihre Daten werden gelöscht,
begeht *der Kunde* einen OR-Verstoss — den Simy fahrlässig ermöglicht hat.

**Lösung:**
- Beim Abo-Ende: **automatischer vollständiger Export** wird generiert und per Email zugestellt
  (ZIP: alle Jahres-PDFs + CSV aller Buchungen + Belege als separater Ordner)
- **Archiv-Modus** nach Kündigung: Günstiger Tarif (CHF 2–5/Monat), nur Lesezugriff,
  keine Features, läuft 10 Jahre automatisch weiter — optional für Kunden
- In den **AGB explizit**: Kunde ist für 10-jährige Aufbewahrung verantwortlich
- In der UI bei Abo-Kündigung: Pflicht-Bestätigungsschritt "Ich habe meine Buchhaltungsdaten exportiert"

---

#### 3. Belegnummer-Pflicht und Beleglose Buchungen

**Was das Gesetz verlangt (OR Art. 957a):** Jede Buchung muss einem Originalbeleg zugeordnet sein.
Ausgaben ohne Beleg sind steuerlich nicht anerkannt.

**Lösung:**
- Ausgaben ohne Beleg: **gelbes Warning-Badge** in der Tabelle ("Kein Beleg — steuerlich nicht gesichert")
- Im Jahres-PDF: Sektion "Buchungen ohne Beleg" separat ausweisen
- Beim Jahresabschluss: Zusammenfassung "X Buchungen ohne Beleg" mit Download-Liste
- **Keine Hard-Blockierung** (das wäre bevormundend) — aber klare Kommunikation

---

#### 4. Haftungs-Disclaimer (Simy ist kein Steuerberater)

**Das Risiko:** Wenn die Software falsche MWST-Berechnungen produziert oder ein Nutzer der
Software blind vertraut und falsch deklariert, könnte Simy zur Mitverantwortung gezogen werden.

**Lösung:**
- **Permanenter Info-Banner** oben auf der Buchhaltungsseite:
  > *"Simy Buchhaltung ist ein digitales Hilfsmittel. Es ersetzt keine professionelle Steuer-
  > oder Rechtsberatung. Als Unternehmer tragen Sie die volle Verantwortung für die Korrektheit
  > Ihrer Buchführung und Steuererklärungen."*
- In den **AGB**: Haftungsausschluss für Buchführungsfehler (Anwalt reviewen lassen)
- MWST-Berechnungen immer mit Hinweis: "Bitte mit Ihrem Treuhänder prüfen lassen"
- Jahres-PDF-Footer: "Dieser Bericht ersetzt keinen beglaubigten Jahresabschluss"

---

#### 5. Privat vs. Geschäft (häufigster Fehler bei Einzelfirmen)

**Was Treuhänder täglich sehen:** Einzelfirmen buchen private Ausgaben als Geschäftsausgaben
— das ist Steuerhinterziehung, auch wenn sie es nicht absichtlich tun.

**Lösung:**
- Neue Kategorie-Gruppe "Eigenverbrauch / Privat" mit orangem Hinweis
- Beim Onboarding expliziter Hinweis: "Erfassen Sie nur Ausgaben, die direkt mit
  Ihrer Geschäftstätigkeit zusammenhängen. Private Ausgaben gehören nicht in die Buchhaltung."
- Optional: "Privat"-Flag auf Buchungen, die im PDF-Export separat ausgewiesen werden

---

### 🟡 P1 — Wichtig (professioneller Standard)

#### 6. MWST-Fristen (ESTV)

Fristen sind **nicht verhandelbar**: 60 Tage nach Quartalsende.
Verspätung = Verzugszinsen (aktuell 4% p.a.) + Mahngebühren.

**Q1:** bis 30. Mai | **Q2:** bis 30. August | **Q3:** bis 30. November | **Q4:** bis 28. Februar

**Lösung:**
- MWST-Fälligkeits-Widget auf dem Buchhaltungs-Dashboard
- **60 Tage vor Fälligkeit**: In-App-Banner + Email
- **30 Tage vor Fälligkeit**: Push-Notification (Capacitor)
- **7 Tage vor Fälligkeit**: Rote Warnung, tägliche Email

---

#### 7. Kassenbuch-Integration

Fahrschulen nehmen Bargeld an. Das Kassenbuch unterliegt in der Schweiz strengen Regeln:

- Täglicher Kassenschluss muss mit physischem Bargeld übereinstimmen
- Kassendifferenzen müssen als Buchung erfasst werden
- Kassenführung ohne lückenlosem Kassenbuch ist steuerlich verdächtig

**Lösung:**
- Bestehende `cash-management`-Funktion mit der Buchhaltung verknüpfen
- Tägliche Kassenabschlüsse → automatisch als Buchung in `accounting_entries`
- Kassendifferenzen als eigene Kategorie ("Kassendifferenz +/-")

---

#### 8. Fremdwährungen

Alle Buchungen müssen in CHF geführt werden. Bei EUR-Rechnungen muss der
Wechselkurs zum Buchungsdatum dokumentiert werden.

**Lösung:**
- Optionales Feld `original_currency` + `original_amount` + `exchange_rate` auf `accounting_entries`
- CHF-Betrag bleibt die massgebliche Grösse
- Wechselkurs-Quelle dokumentieren (z.B. SNB-Tageskurs)

---

#### 9. Jahresabschluss-Prozess / Perioden-Sperrung

Ein Jahresabschluss ist keine einmalige Aktion — es ist ein **Prozess**:

1. Alle Buchungen des Jahres prüfen
2. Abgrenzungsbuchungen machen (Versicherung Jan–Dez, bezahlt aber im Nov für 18 Monate)
3. Offene Posten klären
4. **Periode sperren** (danach keine Buchungen mehr möglich)
5. Jahresabschluss-PDF generieren und archivieren

**Lösung:** Jahresabschluss-Wizard (Phase 2.x, siehe unten)

---

## Aktueller Stand (Phase 1 — fertig ✅)

| Was | Status |
|---|---|
| DB-Tabellen (`accounting_entries`, `accounting_categories`) | ✅ Live in Supabase |
| Einfache Buchungserfassung (Einnahmen/Ausgaben) | ✅ |
| Beleg-Upload (PDF/Bild → Supabase Storage) | ✅ |
| QR-Rechnung scannen (BillScan API) | ✅ BillScan-Key konfiguriert |
| pain.001 Zahlungsfile (alle CH-Banken) | ✅ |
| Jahres-PDF-Export | ✅ |
| MWST-Felder (optional) | ✅ Felder vorhanden, UI fehlt noch |
| 14 Standard-Kategorien | ✅ Auto-Init beim ersten Besuch |
| Nav-Link in Admin | ✅ |
| Soft Delete (OR-Grundlage) | ✅ Vorhanden, muss gehärtet werden |

**Gesetzliche Abdeckung Phase 1:** OR Art. 957 Abs. 2 — Einzelfirmen unter CHF 500k ✅
**Lücken Phase 1:** Buchungs-Unveränderbarkeit, Disclaimer, Datenexport bei Kündigung

---

## Fahrplan — Detailliert nach Sprint

---

### Sprint 1 — Compliance-Härtung (Woche 1–2)
**Priorität: MUSS vor Produktivgang**

#### Backend
- [ ] Migration: `locked_at`, `storno_of_id` auf `accounting_entries`
- [ ] `PATCH /entries/[id]`: Prüfung ob `locked_at IS NOT NULL` → 403 mit klarer Message
- [ ] `DELETE /entries/[id]`: Gleiche Prüfung
- [ ] Neuer Endpoint `POST /entries/[id]/storno`: Erstellt Gegenbuchung mit `storno_of_id`
- [ ] Cron-Job: Täglich Buchungen die >30 Tage alt sind → `locked_at = NOW()` setzen
- [ ] Abrufen gesperrter Buchungen: `locked_at` im Response mitliefern

#### Frontend
- [ ] Buchungs-Tabelle: Gesperrte Buchungen mit Schloss-Icon markieren
- [ ] Statt "Bearbeiten"-Button bei gesperrten Buchungen: "Storno"-Button
- [ ] Storno-Buchung in Tabelle: durchgestrichen, grau, mit Verweis auf Original
- [ ] Disclaimer-Banner oben auf der Seite (dismissable, kommt nach 24h wieder)
- [ ] Ausgaben ohne Beleg: gelbes Warning-Badge in der Tabelle
- [ ] Warnung-Zusammenfassung im Header: "3 Buchungen ohne Beleg"

---

### Sprint 2 — MWST-Modul (Woche 3–4)

#### Backend
- [ ] Neue Seite `/admin/accounting/vat`
- [ ] Endpoint `GET /admin/accounting/vat-summary?year=&quarter=`
  - Umsatzsteuer (eingenommene MWST auf Einnahmen)
  - Vorsteuer (bezahlte MWST auf Ausgaben mit MWST-Beleg)
  - Zahlbare MWST = Umsatzsteuer − Vorsteuer
- [ ] MWST-Satz-Einstellungen in Mandanten-Profil (MWST-pflichtig ja/nein, MWST-Nr., Abrechnungsart)
- [ ] Email-Cron: MWST-Erinnerungen 60/30/7 Tage vor Fälligkeit

#### Frontend
- [ ] MWST-Dashboard mit 4 Quartalen, Ampelfarben (Frist ok/bald/überfällig)
- [ ] "MWST-Abrechnung erstellen" → PDF im ESTV-Format
- [ ] MWST-Einstellungen-Tab im Buchhaltungs-Profil
- [ ] Fälligkeits-Widget auf Buchhaltungs-Hauptseite

---

### Sprint 3 — Wiederkehrende Buchungen & UX-Upgrade (Woche 5–6)

#### Backend
- [ ] Migration: neue Tabelle `accounting_recurring_entries`
  ```sql
  id, template_entry JSONB, interval (monthly/quarterly/yearly/weekly),
  next_due_date DATE, last_created_at, is_active, tenant_id
  ```
- [ ] Cron-Job: Täglich fällige recurring entries → neue `accounting_entries` erstellen
- [ ] Endpoint `GET/POST/PATCH /admin/accounting/recurring`

#### Frontend
- [ ] Beim Erstellen einer Buchung: Toggle "Wiederkehrend"
  - Intervall wählen (monatlich/quartärlich/jährlich)
  - Nächste Fälligkeit anzeigen
- [ ] Wiederkehrende Buchungen verwalten unter `/admin/accounting?tab=recurring`
- [ ] Dashboard-Widget: "Nächste Fälligkeiten (7 Tage)" — kleine Karte auf der Hauptseite
- [ ] **Inline-Bearbeitung** in der Buchungstabelle (Klick auf Zeile → Felder editierbar)
- [ ] **Bulk-Aktionen**: Checkboxen → als bezahlt markieren / Kategorie zuweisen / pain.001

---

### Sprint 4 — Jahresabschluss-Assistent (Woche 7–8)

#### Backend
- [ ] Migration: neue Tabelle `accounting_periods`
  ```sql
  id, year INTEGER, status (open/closing/closed), closed_at, closed_by,
  opening_balance_rappen, closing_result_rappen, tenant_id
  ```
- [ ] Periode sperren: Alle Buchungen des Jahres → `locked_at = NOW()`
- [ ] Abschluss-PDF wird in Supabase Storage archiviert (URL in `accounting_periods`)
- [ ] Endpoint `POST /admin/accounting/periods/[year]/close`

#### Frontend
- [ ] Jahresabschluss-Wizard als Drawer/Seite:
  - **Schritt 1**: Übersicht — "Das Jahr im Überblick" (Einnahmen, Ausgaben, Ergebnis)
  - **Schritt 2**: Offene Posten — alle unbezahlten Ausgaben, alle ausstehenden Einnahmen
  - **Schritt 3**: Buchungen ohne Beleg — Liste mit Möglichkeit Belege nachzureichen
  - **Schritt 4**: MWST-Check — MWST-Abrechnung Q4 erledigt?
  - **Schritt 5**: Periode sperren — Bestätigung, PDF generieren, archivieren
- [ ] Abgeschlossene Jahre: Badge "Abgeschlossen" + Download-Button im Jahr-Selector

---

### Sprint 5 — Treuhänder-Zugang (Woche 9–10)

#### Backend
- [ ] Migration: neue Rolle `accountant` in `users.role` (bestehende Enum erweitern)
- [ ] RLS-Policies anpassen: Rolle `accountant` darf `accounting_*` Tabellen lesen + schreiben,
  aber nicht `users`, `payments`, `appointments`, `categories` etc.
- [ ] Einlade-Endpoint: Admin lädt Treuhänder via Email ein (Magic Link, kein Passwort nötig)
- [ ] Treuhänder-Session: Gleicher Auth-Flow, aber unterschiedliche Middleware-Checks

#### Frontend
- [ ] Einlade-UI unter `/admin/accounting/settings` → Tab "Treuhänder"
  - Email eingeben → Einladung versenden
  - Bestehende Treuhänder auflisten mit "Zugang entziehen"
- [ ] Treuhänder-Login: Landet direkt auf `/admin/accounting` ohne andere Nav-Links
- [ ] Treuhänder-Layout: Vereinfachte Navigation (nur Buchhaltung sichtbar)
- [ ] "Im Namen von [Fahrschule]"-Banner wenn Treuhänder eingeloggt ist

---

### Sprint 6 — CAMT-Import für Ausgaben (Woche 11)

> Heute kann CAMT nur für Rechnungs-Eingänge genutzt werden.
> Erweiterung: Ausgaben-Seite des Kontoauszugs ebenfalls verarbeiten.

#### Backend
- [ ] Bestehenden CAMT-Parser erweitern: Debit-Transaktionen extrahieren
- [ ] Matching-Logik: Debit-Transaktion ↔ offene Ausgabe (nach IBAN + Betrag + Referenz)
- [ ] Endpoint `POST /admin/accounting/import-camt` (separate von Rechnungs-CAMT)

#### Frontend
- [ ] CAMT-Import-Button auf Buchhaltungsseite: "Kontoauszug importieren"
- [ ] Nach Import: Matching-Vorschläge anzeigen ("Diese 3 Ausgaben wurden als bezahlt erkannt")
- [ ] Ungematchte Transaktionen: manuell einer Buchung zuweisen oder als neue Buchung erfassen

---

### Sprint 7 — Doppelte Buchhaltung: Kontenplan (Woche 12–14)

> Ab hier: OR Art. 957a — vollständige Buchführung für GmbHs, AGs, Einzelfirmen >CHF 500k

#### Backend
- [ ] Migration: neue Tabellen `accounting_accounts`, `accounting_journal_entries`,
  `accounting_journal_lines`
  ```sql
  -- accounting_accounts
  id, account_number VARCHAR(10), name, type (asset/liability/equity/income/expense),
  parent_id, is_system, is_active, tenant_id

  -- accounting_journal_entries
  id, date, entry_number (fortlaufend), description, receipt_url, locked_at, tenant_id

  -- accounting_journal_lines
  id, journal_entry_id, account_id, debit_rappen, credit_rappen
  -- Constraint: pro journal_entry muss sum(debit) = sum(credit)
  ```
- [ ] Schweizer KMU-Kontenrahmen (Käfer) als Seed-Daten (~100 Konten):
  - 1000–1999 Aktiven (Kasse, Bank, Debitoren, Fahrzeuge, …)
  - 2000–2999 Passiven (Kreditoren, Darlehen, Eigenkapital, …)
  - 3000–3999 Betriebsertrag (Fahrschulertrag, Kursertrag, …)
  - 4000–4999 Materialaufwand
  - 5000–5999 Personalaufwand (Löhne, Sozialversicherungen, …)
  - 6000–6999 Übriger Betriebsaufwand (Miete, Fahrzeugunterhalt, Versicherungen, …)
  - 7000–7999 Finanzaufwand / -ertrag
  - 8000–8999 Ausserordentliches
  - 9000–9999 Abschlusskonten

#### Frontend
- [ ] Kontenplan-Editor unter `/admin/accounting/chart-of-accounts`
  - Baumstruktur mit Gruppen (aufklappbar)
  - Konto hinzufügen / umbenennen / deaktivieren
  - Saldo des laufenden Jahres direkt am Konto anzeigen
  - Konto-Typ-Badge (Aktiv/Passiv/Ertrag/Aufwand)

---

### Sprint 8 — Doppelte Buchhaltung: Journal & Buchungsmaske (Woche 15–17)

#### Backend
- [ ] Validierung: Buchungssatz darf nur gespeichert werden wenn Soll = Haben
- [ ] Auto-Buchungsregeln: `accounting_auto_rules` — jede neue `payment` → Journal-Buchung
  - Zahlung Fahrstunde bar: Kasse 1000 Soll / Fahrschulertrag 3000 Haben
  - Zahlung Fahrstunde online: Bank 1020 Soll / Fahrschulertrag 3000 Haben
  - Einmalig konfigurieren, danach automatisch
- [ ] Rückwirkender Import: Alle historischen Zahlungen auf Knopfdruck in Journal übertragen
- [ ] Materialisierten Konten-Saldo: `accounting_account_balances` täglich per Cron (Performance)

#### Frontend
- [ ] Journal-Ansicht unter `/admin/accounting/journal`
  - Alle Buchungssätze (Datum, Nr., Text, Betrag, Soll-Konto, Haben-Konto)
  - Filter nach Konto, Datum, Belegnummer
  - Klick → Buchungssatz-Detail mit allen Zeilen
- [ ] Manuelle Buchungsmaske (für Treuhänder oder Fortgeschrittene):
  - Datum + Belegnummer (auto-vorgeschlagen) + Beschreibung
  - Zeilen-Editor: Konto-Suche (nach Nummer oder Name), Soll/Haben
  - Beliebig viele Zeilen (+ Zeile hinzufügen)
  - Live-Validierung: Saldo-Anzeige (Differenz Soll − Haben), rot wenn ≠ 0
  - Speichern erst wenn ausgeglichen

---

### Sprint 9 — Berichte & Abschlüsse (Woche 18–20)

#### Backend
- [ ] Bilanz-Berechnung: Aktiven/Passiven per Stichtag aus `accounting_journal_lines`
- [ ] Erfolgsrechnung: Ertrag − Aufwand = Ergebnis
- [ ] Probebalance (Trial Balance): Alle Konten mit Soll/Haben-Summen und Saldo

#### Frontend
- [ ] **Bilanz** unter `/admin/accounting/balance-sheet`
  - Stichtag-Datepicker
  - Aktiven vs. Passiven, Eigenkapital
  - Vergleich Vorjahr als zweite Spalte
  - Export als PDF (Standardformat für Treuhänder)
- [ ] **Erfolgsrechnung** unter `/admin/accounting/income-statement`
  - Monats- / Jahresansicht
  - Wasserfall-Chart: Ertrag → Aufwand-Blöcke → Ergebnis
  - Export als PDF
- [ ] **Jahresabschluss-Assistent** erweitert (Sprint 4 + doppelte Buchhaltung):
  - Abgrenzungsbuchungen-Helper (Ausgabe für mehrere Perioden aufteilen)
  - Abschreibungs-Preview für Anlagen
  - Eigenkapital-Übertrag vorbereiten

---

### Sprint 10 — Mobile & UX-Excellence (Woche 21–22)

- [ ] **Kamera-Belegerfassung** (Capacitor): Direkt Beleg fotografieren → Auto-OCR
- [ ] **Offline-Support**: Buchung erstellen ohne Internet → sync wenn wieder online
- [ ] **Command Palette** (`⌘K`): Suche + Schnellaktionen in der Buchhaltung
- [ ] **KI-Kategorisierung**: Buchungstext → automatischer Kategorie-Vorschlag
  - Lokal heuristic zuerst (Muster aus letzten 50 Buchungen)
  - Fallback: GPT-4o-mini für unbekannte Texte
- [ ] **Keyboard Shortcuts**: `N` Ausgabe, `I` Einnahme, `Q` QR-Scan, `Esc` Modal
- [ ] **Drag & Drop** Beleg-Upload: Rechnung auf Buchungszeile ziehen

---

### Sprint 11 — Bexio/AbaNinja API-Integration (Woche 23–24, optional)

Für Nutzer die bereits externe Software haben oder bevorzugen.

- [ ] Neue Seite `/admin/accounting/integrations`
- [ ] **Bexio OAuth2-Flow**: "Mit Bexio verbinden" → Token gespeichert in `tenant_settings`
- [ ] **AbaNinja Token-Setup** (API-Key statt OAuth)
- [ ] Sync-Service: Neue Buchungen → an Bexio/AbaNinja pushen
  - Mapping: Simy-Kategorie → Bexio-Konto (einmalig konfigurieren)
  - Belege werden als Anhang übertragen
- [ ] Sync-Status-UI: Letzter Sync, Fehler, manueller Re-Sync
- [ ] **Bidirektionaler Sync** (optional): Buchungen aus Bexio/AbaNinja auch in Simy anzeigen

---

### Sprint 12 — eBilanz Vorbereitung (Woche 25–26, Pilotphase 2026)

Swissdec startet 2026 die Pilotphase. Noch nicht produktiv, aber vorbereiten.

- [ ] CH-XBRL Taxonomie studieren (Swissdec-Dokumentation)
- [ ] Jahresabschluss-Daten → XBRL-Format-Mapping vorbereiten
- [ ] Export-Funktion als XBRL-Datei (vorerst nur Download, keine direkte Übermittlung)
- [ ] Swissdec-Zertifizierung beantragen sobald Produktivbetrieb bereit

---

## Technische Architektur

### Datenbank-Schema (Zielzustand Phase 3)

```
tenants
  └── accounting_categories        (Buchungskategorien)
  └── accounting_recurring_entries (Vorlage für Wiederkehrendes)
  └── accounting_entries           (Phase 1 — einfache Buchungen)
        locked_at, storno_of_id    (Sprint 1 Erweiterung)
  └── accounting_periods           (Jahresabschlüsse)
  └── accounting_accounts          (Kontenplan Phase 3)
  └── accounting_journal_entries   (Buchungssatz-Header Phase 3)
        └── accounting_journal_lines (Soll/Haben-Zeilen)
  └── accounting_auto_rules        (Automatische Buchungsregeln)
  └── accounting_account_balances  (Materialisierte Salden, täglich)
```

### Unveränderbarkeit — Implementierungsdetail

```typescript
// PATCH /entries/[id] — ab Sprint 1
if (entry.locked_at) {
  throw createError({ statusCode: 403,
    statusMessage: 'Buchung ist gesperrt. Bitte Storno-Buchung verwenden.' })
}

// POST /entries/[id]/storno
const storno = {
  type: entry.type === 'expense' ? 'income' : 'expense',
  amount_rappen: entry.amount_rappen,
  entry_date: new Date().toISOString().split('T')[0],
  description: `Storno: ${entry.description}`,
  storno_of_id: entry.id,
  category_id: entry.category_id,
  tenant_id: entry.tenant_id
}
```

### Performance für Berichte

Salden werden **nicht live** berechnet, sondern täglich materialisiert:

```sql
-- accounting_account_balances (täglich per Cron aktualisiert)
account_id, year, month, opening_balance, debit_total, credit_total, closing_balance
```

Dadurch sind Bilanz und Erfolgsrechnung <100ms, auch mit 10'000 Buchungen.

---

## Vergleich: Simy vs. Markt

| Feature | Bexio | AbaNinja | **Simy** |
|---|---|---|---|
| In Fahrschul-App integriert | ❌ | ❌ | ✅ |
| Zahlungen auto-gebucht | ❌ manuell | ❌ | ✅ Sprint 8 |
| QR-Rechnung scannen | ✅ | ✅ | ✅ Phase 1 |
| pain.001 generieren | ✅ | ✅ | ✅ Phase 1 |
| Lohnkosten aus Stundenerfassung | ❌ | ❌ | ✅ Sprint 8 |
| Kamera-Beleg Handy | ❌ | teilweise | ✅ Sprint 10 |
| KI-Kategorisierung | ❌ | ❌ | ✅ Sprint 10 |
| Cashflow-Prognose | ❌ | ❌ | ✅ Sprint 10 |
| Treuhänder-Zugang | ✅ kostenpflichtig | ✅ | ✅ inklusive Sprint 5 |
| MWST-Fälligkeits-Alerts | ❌ | ❌ | ✅ Sprint 2 |
| Jahresabschluss-Wizard | ❌ | ❌ | ✅ Sprint 4 |
| Offline-fähig | ❌ | ❌ | ✅ Sprint 10 |
| Preis | CHF 40–70/Mo | CHF 20–40/Mo | **Im Abo inklusive** ✅ |

---

## Rechtliche Checkliste — Vor dem ersten Nutzer

- [ ] **Sprint 1 abgeschlossen**: Buchungs-Unveränderbarkeit implementiert
- [ ] **Disclaimer-Banner** sichtbar auf der Seite
- [ ] **Datenexport bei Kündigung** implementiert
- [ ] **AGB angepasst**: Haftungsausschluss + 10-Jahres-Aufbewahrungshinweis
- [ ] **Anwalt-Review** der AGB-Anpassungen (einmalig, ~CHF 500–1000)
- [ ] **Treuhänder-Review** des PDF-Reports (ein echter Treuhänder schaut drüber)
- [ ] Jahres-PDF-Footer: "Dieser Bericht ersetzt keinen beglaubigten Jahresabschluss"

---

## Zeitplan (Übersicht)

| Sprint | Inhalt | Dauer | Wann |
|---|---|---|---|
| **Sprint 1** | Compliance-Härtung + Disclaimer | 2 Wochen | **Sofort** |
| **Sprint 2** | MWST-Modul | 2 Wochen | KW 3–4 |
| **Sprint 3** | Wiederkehrend + UX-Upgrade | 2 Wochen | KW 5–6 |
| **Sprint 4** | Jahresabschluss-Wizard | 2 Wochen | KW 7–8 |
| **Sprint 5** | Treuhänder-Zugang | 2 Wochen | KW 9–10 |
| **Sprint 6** | CAMT-Import Ausgaben | 1 Woche | KW 11 |
| **Sprint 7** | Kontenplan (Phase 3 Start) | 3 Wochen | KW 12–14 |
| **Sprint 8** | Journal & Auto-Buchungen | 3 Wochen | KW 15–17 |
| **Sprint 9** | Bilanz & Erfolgsrechnung | 3 Wochen | KW 18–20 |
| **Sprint 10** | Mobile & UX-Excellence | 2 Wochen | KW 21–22 |
| **Sprint 11** | Bexio/AbaNinja (optional) | 2 Wochen | KW 23–24 |
| **Sprint 12** | eBilanz-Vorbereitung | 2 Wochen | KW 25–26 |

**Meilensteine:**
- 🟢 **Woche 2**: Rechtlich abgesicherte einfache Buchhaltung — produktiv für alle Einzelfirmen
- 🟢 **Woche 8**: Vollständige Jahresabschluss-Funktion inklusive MWST
- 🟢 **Woche 10**: Treuhänder können direkt in der App arbeiten
- 🟢 **Woche 20**: Vollständige doppelte Buchhaltung (OR Art. 957a) — GmbHs & AGs
- 🟢 **Woche 22**: Beste Buchhaltungs-UX auf dem Schweizer Markt

---

*Erstellt: 09.06.2026 — Phase 1 live. Sprint 1 als nächstes.*
