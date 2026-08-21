---
title: Firmenkunden, Rechnungen und Zahlungen
summary: Firmen, Offerten, Rechnungen, CAMT, Mahnwesen und Korrespondenz
order: 40
---

# Firmenkunden, Rechnungen und Zahlungen

## Voraussetzung

Diese Menüpunkte erscheinen, wenn **Rechnungen** unter **Einstellungen → Funktionen** aktiv ist.

## Firmenkunden

**Menü: Firmenkunden** → [/admin/companies](/admin/companies)

Firmen suchen, **Neue Firma**. Klick öffnet die Firma.

**Details** — Name, Adresse, UID, Zahlungsziel und weitere Stammdaten. **Speichern** oder **Archivieren**.

**Mitarbeiter** — Benutzer suchen und zuordnen. Beim Zuordnen fragt die App, ob die **Rechnungsadresse** der Firma übernommen werden soll oder die bestehende Adresse bleibt. Zuordnung kann entfernt werden.

**Rechnungen** — **+ Rechnung erstellen**, bestehende Rechnungen mit Status Entwurf / Offen / Überfällig / Bezahlt. **Brief schreiben** öffnet die Korrespondenz für diese Firma.

## Zahlungsübersicht

**Menü: Zahlungen** → [/admin/payment-overview](/admin/payment-overview)

Kacheln: Alle Benutzer, Unbezahlt, Firmenrechnung, Offener Betrag.

Filter: Suche, **Unbezahlt**, **Überfällig**, **Firmenrechnung**, **Barzahler**, **Rechnungszahler**. Optional **Gelöschte einschliessen**. Zeile öffnet die Zahlungen der Person.

## Rechnungen und Offerten

**Menü: Rechnungen** → [/admin/invoices](/admin/invoices)

Oben umschalten: **Rechnungen** | **Offerten**.

Aktionen:

- **Neue Rechnung** / **Neue Offerte**
- **Zahlungen importieren** (CAMT) — nur bei Rechnungen
- **Mahnwesen** — nur bei Rechnungen

Kacheln bei Rechnungen: Bezahlt, Ausstehend, **Überfällig** (springt ins Mahnwesen).

Filter: Name/Nummer, Status (Entwurf, PDF erstellt, Versendet, plus bei Rechnungen Bezahlt / Überfällig / Storniert), Zahlungsstatus, Datum, **Mit Mahnung**.

Zeile öffnet das Detail:

- PDF (Rechnung, Offerte oder Mahnung)
- Zahlung manuell erfassen
- **Bearbeiten**
- **Versenden**
- Bei Offerten: **Als Rechnung übernehmen** — die Offerte wird zur Rechnung, die Nummer wechselt von OF-… auf RE-…
- Zahlungserinnerung oder nächste Mahnung
- Stornieren bzw. Offerte ablehnen
- Verlauf, Mahnungen, Zahlungshistorie

## Mahnwesen

**Menü über Rechnungen oder** [/admin/dunning](/admin/dunning)

Überfällige Rechnungen mit nächster Mahnstufe. Kacheln: überfällig, aktionsbedürftig, pausiert, total offen.

- Einzelne Mahnung **Senden**
- Mehrere wählen → **Mahnungen für Auswahl senden**
- **Pausieren** / **Reaktivieren**
- **Vorlagen & Fristen** für Texte und Fristen

Nicht fällige oder pausierte Zeilen lassen sich nicht ankreuzen. Ist alles aktuell: «Keine überfälligen Rechnungen».

## Korrespondenz

**Menü: Korrespondenz** → [/admin/correspondence](/admin/correspondence)

DIN-Fensterbrief im gleichen Layout wie die Rechnung. **Brief schreiben**, Filter Entwurf / Versendet. Pro Brief: **PDF**, Entwürfe **Senden**.

## Erinnerungen

**Menü: Erinnerungen** → [/admin/payment-reminders](/admin/payment-reminders)

Nur Historie: gesendete E-Mails und SMS, inkl. Fehlgeschlagen. Versenden tust du von der Rechnung oder aus dem Mahnwesen.

## Hinweis

Offerten gehören nicht ins Mahnwesen und nicht in den CAMT-Abgleich der offenen Rechnungen. Erst nach **Als Rechnung übernehmen** gelten die üblichen Zahlungs- und Mahnregeln.
