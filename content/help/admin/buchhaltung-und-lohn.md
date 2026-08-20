---
title: Buchhaltung, Lohn und Stunden
summary: Spesen, Einnahmen/Ausgaben, Payroll und Stundenerfassung
order: 50
---

# Buchhaltung, Lohn und Stunden

## Buchhaltung

`/admin/accounting`

- Spesen genehmigen/ablehnen
- Inbox «ohne Beleg»: jede Ausgabe, Spesen und Kreditor ohne Originalbeleg — Beleg direkt hochladen und verknüpfen
- Einnahme/Ausgabe: zuerst Beleg hochladen — Foto wird automatisch ausgelesen (Betrag, Datum, Lieferant, MWST, Kategorie). PDF muss manuell ausgefüllt werden
- Beim Upload: Notiz und Beleg-Art (Ausgabe, Spesen, Kreditor, Debitor, Vertrag). Verträge sind nur Ablage, nicht im Gewinn
- QR-Rechnung einlesen (Scan oder aus dem Beleg-Foto)
- Kontoauszug (CAMT.053/054): Lastschriften offenen Ausgaben zuordnen oder als neue bezahlte Ausgabe anlegen. Gutschriften bleiben auf der Rechnungsseite.
- Wiederkehrende Buchungen (Miete, Versicherung, Software): einmal erfassen, danach monatlich/quartalsweise/jährlich automatisch. Pausieren im Tab Wiederkehrend.
- Abgeschlossene Kundenzahlungen erscheinen automatisch als Einnahme
- Korrekturen nach 24 Stunden nur noch per Storno
- Zahlungsfile (pain.001)
- Vermögenslage (Kasse, Bank, Debitoren, Kreditoren) und Kassendifferenz
- MWST-Quartale (Umsatzsteuer, Vorsteuer, ESTV-Frist, PDF) — mit Treuhänder prüfen
- Treuhänder einladen (nur Lesen oder Lesen & Schreiben, nachträglich änderbar)
- CSV-Export (Buchungen, Journal, Kontenplan) und CSV-Import von Buchungen — Semikolon wie Excel DE. Duplikate nach Datum + Betrag + Beschreibung werden übersprungen, max. 500 Zeilen
- Voll-Export als ZIP (10-Jahres-Aufbewahrung)
- Monatsübersicht Einnahmen / Ausgaben / Ergebnis
- Doppelte Buchhaltung: Journal (Soll/Haben), Bilanz/Erfolgsrechnung, anpassbarer KMU-Kontenplan. Buchungsregeln sind fest: bezahlte Ausgabe → Aufwand/Bank, offene Ausgabe → Aufwand/Kreditoren, Einnahme analog Debitoren. Kategorie → Konto kannst du im Tab Kontenplan ändern.

## Lohnbuchhaltung

`/admin/payroll` – Tabs **Mitarbeiter · Lohnabrechnungen · Rentabilität**. Hinweise je Rechtsform (Einzelfirma vs. GmbH/AG) in den Einstellungen unter Rechtsform.

Lohnblatt-PDF pro Mitarbeiter oder für den ganzen Monat (AHV/ALV/NBU/BVG, Auszahlung, Arbeitgeberbeiträge). Stunden und Ferien kommen aus dem Kalender (gleiche Regeln wie Stundenerfassung). Stundenlohn zahlt die gearbeiteten Termine, nicht die Ferien. Mitarbeiter dafür mit dem Benutzer verknüpfen. Das ist keine amtliche Lohnausweis-Meldung (Formular 11).

## Stunden

Wenn freigeschaltet: `/admin/staff-hours` – Tabs **Stundenerfassung · Monatslohn · Lohneinstellungen**; Filter Jahr/Monat; Summen aktive Staff und Stunden.
