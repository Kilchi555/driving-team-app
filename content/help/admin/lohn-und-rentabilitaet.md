---
title: Lohn, Budget und Rentabilität
summary: Mitarbeiterlöhne, Lohnblätter, Gesamtrentabilität und Soll/Ist
order: 55
---

# Lohn, Budget und Rentabilität

**Menü: Lohnbuchhaltung** → [/admin/payroll](/admin/payroll)

Jahr oben wählen. Tabs: **Mitarbeiter** · **Lohnabrechnungen** · **Rentabilität**. Ein Treuhänder mit **Nur Lesen** kann nichts erfassen oder als bezahlt markieren.

## Rechtsform

Oben erscheinen Hinweise je nach **Einstellungen → Rechtsform & Steuern**:

- **Einzelfirma** — der Inhaber ist kein Arbeitnehmer. Es gibt einen Selbständigen-AHV-Rechner.
- **GmbH/AG** — Geschäftsführer als Mitarbeiter führen, Dividenden und BVG-Schwelle beachten.

Das ist keine amtliche Lohnausweis-Meldung (Formular 11).

## Mitarbeiter im Lohn

Tab **Mitarbeiter** → **Mitarbeiter hinzufügen**.

- Systembenutzer wählen (Verknüpfung zum Login)
- Anstellung **Monatslohn** oder **Stundenlohn**
- Bruttolohn, Versicherungen, Sozialleistungen
- Spesen und Zulagen (mehrere Positionen mit Beschreibung)
- IBAN

Liste: Name, Anstellung, Bruttolohn, Arbeitgeberkosten/Monat, Eintritt, **Bearbeiten**.

## Lohnabrechnung erstellen

1. Tab **Lohnabrechnungen**, Monat wählen
2. **Abrechnung berechnen** — Stunden und Ferien kommen aus dem Kalender (gleiche Regeln wie die Stundenerfassung)
3. Entwurf prüfen
4. **Als bezahlt markieren** — erst dann entsteht die Lohnbuchung in der Buchhaltung
5. **Lohnblatt** einzeln oder **Alle Lohnblätter** als PDF (AHV/ALV/NBU/BVG, Auszahlung, Arbeitgeberbeiträge)

Stundenlohn zahlt die gearbeiteten Termine, nicht die Ferien. Standard-Sätze 2025 (AHV/IV/EO, ALV, NBU, BVG) sind pro Mitarbeiter anpassbar: Mitarbeiter-Abzüge und Firmenbeiträge getrennt.

## Gesamtrentabilität

Tab **Rentabilität** → **Gesamt**. Das ist die Auswertung für die **ganze Fahrschule**, nicht die Summe der Fahrlehrer.

Kacheln: Ergebnis (rentabel/Verlust), Einnahmen, Lohnkosten (Anteil an den Gesamtkosten), Break-Even pro Monat.

Dazu: Monatsbalken Einnahmen vs. Kosten, Kostenstruktur (Lohn vs. Sachkosten) und Deckungsgrad.

Quelle ist die Buchhaltung. Kundenzahlungen und Löhne werden nicht doppelt gezählt. Bezahlte Löhne erscheinen nur als Lohnaufwand. Hochgeladene Belege zählen, sobald die Buchung genehmigt ist. Verträge und die Eröffnungs-Bankbuchung bleiben draussen.

Break-Even und Deckungsgrad rechnen mit den Monaten bis heute — nicht einfach Jahr geteilt durch 12.

## Budget (Soll/Ist)

Untertab **Budget**. Pro Kategorie: Soll, Ist, Abweichung. Unten das Ergebnis Soll vs. Ist.

Ohne gespeichertes Soll schlägt die App das Vorjahr vor, sonst die annualisierten wiederkehrenden Buchungen (monatlich × 12, quartalsweise × 4, jährlich × 1). Kundenzahlungen ohne Kategorie heissen **Kundenzahlungen**.

Soll anpassen und **Budget speichern**. Ist bleibt live aus der Buchhaltung.

## Pro Mitarbeiter

Untertab **Pro Mitarbeiter** — **Deckungsbeitrag**: eigener Umsatz minus eigener Lohn, plus echte Kalenderstunden (ohne Ferien).

Miete, Autos und andere Gemeinkosten bleiben bewusst im **Gesamt**. Sonst wirkt jemand unrentabel, der die Overhead-Kosten nicht «gehört». Ohne Verknüpfung zum Benutzerkonto fehlen Stunden und Umsatz.

## Stunden

Wenn **Arbeitszeiten** unter Funktionen aktiv: **Menü: Stunden** → [/admin/staff-hours](/admin/staff-hours)

**Stundenerfassung** — Jahr/Monat oder Zeitraum, Summen aktive Mitarbeitende und Stunden, Aufteilung nach Kategorie/Terminart inkl. Abgesagt.

**Monatslohn** — Vortrag, Saldo, Ferien; Monate mit Soll/Ist/Ferien/Krank/Admin (letzte Felder editierbar). **Neu berechnen** oder **Letzte 3 Monate**.

**Lohneinstellungen** — 100 %-Pensum in Stunden/Woche. Pro Person: Lohntyp, Basis, Pensum, Ferienanspruch, «gilt ab».
