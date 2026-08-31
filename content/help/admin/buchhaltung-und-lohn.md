---
title: Buchhaltung
summary: Belege, Journal, MWST, Treuhänder, Wiederkehrend und Export
order: 50
---

# Buchhaltung

**Menü: Buchhaltung** → [/admin/accounting](/admin/accounting)

Geschäftsjahr oben wählen. Ein Treuhänder mit **Nur Lesen** sieht alles, kann aber nichts erfassen oder ändern.

## Wichtig

Simy Buchhaltung ist ein digitales Hilfsmittel, kein Ersatz für Treuhänder oder ESTV-Abrechnung. Belege 10 Jahre aufbewahren (OR Art. 958f). Ausgaben, Spesen und Kreditoren brauchen einen Originalbeleg (OR Art. 957a).

## Wo die Belege liegen

Es gibt keine separate Beleg-Galerie. Die Dateien hängen an den Buchungen.

1. Gelber Kasten **Spesen-Einreichungen ausstehend** — Fahrlehrer haben einen Beleg eingereicht. Vorschaubild oder PDF, dann **Genehmigen** oder **Ablehnen** (optionaler Grund). Erst nach Freigabe zählt der Betrag in Gewinn und Rentabilität.
2. Kasten **Buchungen ohne Beleg** — Ausgabe ohne Original. **Beleg hochladen** verknüpft die Datei.
3. Tab **Buchungen**, Spalte **Beleg** — Foto oder PDF öffnen.

## Neue Ausgabe oder Einnahme

1. **Ausgabe** oder **Einnahme**
2. Zuerst Beleg hochladen. Ein Foto wird ausgelesen (Betrag, Datum, Lieferant, MWST, Kategorie). Ein PDF füllst du selbst aus.
3. **Beleg-Art** wählen: Ausgabe, Spesen, Kreditor, Debitor, Vertrag
4. Datum, Betrag, Beschreibung, Kategorie prüfen
5. Optional: Lieferant (Name, IBAN, Referenz), **Bereits bezahlt**, MWST-Satz, Notiz
6. Optional **Wiederkehrend** mit Rhythmus Monatlich / Quartalsweise / Jährlich
7. **Speichern**

**QR-Rechnung** liest QR-Rechnungen per Scan oder aus dem Beleg-Foto.

## Beleg-Arten

| Art | Wirkung |
| --- | --- |
| Ausgabe / Spesen / Kreditor | Aufwand, zählt in Gewinn und MWST (Vorsteuer nur mit Beleg) |
| Debitor | Einnahme |
| Vertrag | Nur Ablage — nicht in Gewinn, nicht in der MWST |

Private Ausgaben gehören nicht in den geschäftlichen Gewinn — die App warnt bei der Kategorie.

Abgeschlossene Kundenzahlungen erscheinen automatisch als Einnahme. Dieselbe Zahlung nicht nochmals manuell buchen.

## Buchungen bearbeiten

Filter: Suche, **Alle / Einnahmen / Ausgaben / Spesen / Kreditor / Debitor / Verträge**, Monat (auch über die Monatsübersicht).

Nach 24 Stunden nur noch per **Storno-Buchung erstellen**. Gesperrte Zeilen zeigen das Schloss «Buchung gesperrt (OR Art. 957a)». Kreditoren mit IBAN: **pain.001** für das Zahlungsfile der Bank.

## Journal, Bilanz, Kontenplan

Tabs:

- **Buchungen** — Belegliste
- **Journal** — Soll/Haben, CSV
- **Bilanz / ER** — Aktiven, Passiven, Ertrag, Aufwand, Saldenliste
- **Kontenplan** — Konto anlegen (Nr., Name, Typ), umbenennen, deaktivieren. **Kategorie → Konto** legt fest, auf welches Konto eine Kategorie bucht. Systemkonten bleiben geschützt.
- **Wiederkehrend** — Serien **Pausieren** / **Fortsetzen**. Neue Serie: beim Erfassen **Wiederkehrend** aktivieren.

Feste Buchungslogik: bezahlte Ausgabe → Aufwand/Bank, offene Ausgabe → Aufwand/Kreditoren, Einnahmen analog über Debitoren.

## Vermögenslage und Kasse

Kasse, Bank (**ändern**), Debitoren, Kreditoren, Reinvermögen. Gezählten Kassenbestand eintragen → **Kassendifferenz buchen**.

## MWST

Quartale Q1–Q4, **Quartal-PDF**. Schwellen-Hinweis bei Nähe oder Überschreiten von CHF 100'000. Sätze und Pflicht unter **Einstellungen → Rechtsform & Steuern**. Vorsteuer nur mit Beleg. Bitte mit dem Treuhänder prüfen.

## Kontoauszug (CAMT)

**Kontoauszug** — CAMT.053/054. Lastschriften offenen Ausgaben zuordnen oder als neue bezahlte Ausgabe anlegen. Gutschriften bleiben auf der Rechnungsseite (CAMT dort unter **Zahlungen importieren**).

## Treuhänder

E-Mail einladen, Recht **Nur Lesen** oder **Lesen & Schreiben**, später **Entziehen**. Der Treuhänder sieht nur Buchhaltung und Lohn.

## Export und Import

- **CSV** — Buchungen, Journal, Kontenplan
- **CSV import** — Semikolon wie Excel DE. Duplikate (Datum + Betrag + Beschreibung) werden übersprungen, max. 500 Zeilen
- **Jahres-PDF**
- **Voll-Export** — ZIP mit PDFs, Journal und Ordner `belege/` (Originaldateien)

## Tipp

Miete, Versicherungen und Software einmal als wiederkehrende Ausgabe anlegen. Dann erscheinen sie automatisch und das Jahresbudget kann sie als Vorschlag nutzen.
