# Zugriffs- und Secrets-Reglement — Simy IT Systems Kilchenmann

| | |
|---|---|
| **Unternehmen** | Simy IT Systems Kilchenmann |
| **Gültig ab** | 2026-08-18 |
| **Nächste Überprüfung** | 2027-08-18 (mindestens jährlich, oder bei relevanten Vorfällen sofort) |
| **Genehmigt durch** | Pascal Kilchenmann, Inhaber |
| **Kontakt** | info@simy.ch |
| **Bezug** | Konkretisiert die TOM-Punkte "Entwickler- und Tooling-Zugriff" sowie "Zugangsdaten- und Schlüsselrotation" in `pages/avv.vue` §4 und `pages/datenschutz.vue` §9 |

---

## Zweck und Geltungsbereich

Dieses Reglement legt fest, wie Zugriffstoken, API-Schlüssel und vergleichbare Secrets (nachfolgend "Zugangsdaten") bei Simy vergeben, gescoped, gespeichert und rotiert werden. Es gilt für alle Zugangsdaten zu Systemen, die Personendaten von Tenants oder deren Kunden/Schülern verarbeiten — insbesondere Supabase, Vercel, Wallee, Resend, Twilio sowie die eingesetzten KI-Anbieter (OpenAI, Anthropic, Google).

Dieses Reglement ist ein internes Dokument. Kunden erhalten auf Anfrage im Rahmen ihres Prüf- und Auskunftsrechts (Art. 28 Abs. 3 lit. h DSGVO bzw. sinngemäss nDSG) eine Zusammenfassung, nicht notwendigerweise den vollen Wortlaut.

## Grundsätze

1. **Minimalprinzip (Least Privilege):** Zugangsdaten werden immer so eng wie möglich gescoped — auf ein einzelnes Projekt, eine Rolle oder eine Funktion beschränkt, nie kontoweit/organisationsweit, ausser es ist technisch zwingend erforderlich.
2. **Kein Klartext im Repository:** Zugangsdaten werden nicht in versionierten Dateien im Git-Repository abgelegt. Zulässig sind Umgebungsvariablen (`.env`, Vercel/Hosting-Secrets) und lokale, nicht versionierte Konfigurationsdateien (z. B. `~/.cursor/mcp.json`) ausserhalb des Repository-Wurzelverzeichnisses.
3. **Nachvollziehbarkeit:** Für jede langlebige Zugangsdatei wird festgehalten, wer sie ausgestellt hat, wofür sie gilt und wann sie zuletzt rotiert wurde (siehe Register unten).
4. **Read-only wo möglich:** Werkzeuge, die nur lesenden Zugriff benötigen (z. B. Analyse, Reporting, KI-gestützte Coding-Assistenten ohne aktiven Migrationsbedarf), erhalten wo verfügbar einen Read-only-Modus statt Schreibrechten.

## Rotation von Zugangsdaten

- **Regelintervall:** Langlebige Zugangsdaten (Personal Access Tokens, API-Schlüssel von Drittanbietern) werden **mindestens alle 90 Tage** überprüft und bei Bedarf neu ausgestellt.
- **Sofortige Rotation** ist zusätzlich zum Regelintervall in folgenden Fällen Pflicht, unabhängig davon, wann die letzte Rotation war:
  - Verdacht auf Kompromittierung oder versehentliche Offenlegung (z. B. Commit in ein Repository, Weitergabe per unverschlüsseltem Kanal).
  - Beendigung des Zugriffsbedarfs einer Person oder eines externen Dienstleisters (Austritt, Projektende).
  - Wechsel des Tools oder Anbieters, der die Zugangsdaten nutzt.
- Nach jeder Rotation wird der alte Wert beim jeweiligen Anbieter widerrufen, nicht nur ersetzt.

## Register langlebiger Zugangsdaten

| System | Zweck | Scope | Zuletzt rotiert | Nächste Fälligkeit |
|---|---|---|---|---|
| Supabase Personal Access Token (MCP) | DB-Zugriff für Entwicklungs-/KI-Coding-Tools | Projekt `unyjaetebnaexaflpyoc` (seit 2026-08-18 gescoped) | Rotation ausstehend — Wert unverändert seit Ersteinrichtung | Sofort, dann alle 90 Tage |
| OpenAI API-Key | Beleg-OCR (`parse-receipt.post.ts`) | Projektschlüssel | — (nachtragen) | 90-Tage-Zyklus einführen |
| Anthropic API-Key | GBP-Review-Antworten, Simy AI | Projektschlüssel | — (nachtragen) | 90-Tage-Zyklus einführen |
| Google Gemini API-Key | Simy AI (Ausweichmodell) | Projektschlüssel | — (nachtragen) | 90-Tage-Zyklus einführen |
| Twilio Auth Token | SMS-Versand | Account-Token | — (nachtragen) | 90-Tage-Zyklus einführen |
| Resend API-Key | Transaktions-E-Mails | Projektschlüssel | — (nachtragen) | 90-Tage-Zyklus einführen |
| Wallee API-Zugang | Zahlungsabwicklung | Space-gebunden | — (nachtragen) | 90-Tage-Zyklus einführen |

> Dieses Register ist bewusst einfach gehalten und wird bei jeder Rotation nachgeführt. Fehlende Daten ("nachtragen") sind bei der nächsten Rotation zu ergänzen.

## Speicherung und Zugriff

- Zugangsdaten werden ausschliesslich an Personen ausgegeben, die sie für ihre Aufgabe benötigen.
- Lokale Konfigurationsdateien mit Zugangsdaten (z. B. `~/.cursor/mcp.json`) liegen ausserhalb des Git-Repositories und werden nicht geteilt oder in Screenshots/Tickets eingefügt.
- Produktions-Zugangsdaten werden nicht in Entwicklungs- oder Testumgebungen wiederverwendet.

## Verantwortlichkeiten

> Simy IT Systems Kilchenmann ist derzeit ein Kleinunternehmen, in dem die folgenden Rollen von Pascal Kilchenmann in Personalunion wahrgenommen werden. Mit wachsendem Team werden Verantwortlichkeiten delegiert und diese Tabelle aktualisiert.

| Rolle | Verantwortung |
|---|---|
| **Zugriffs-Verantwortlicher** — Pascal Kilchenmann | Führt das Register, veranlasst Rotationen, widerruft Zugangsdaten bei Bedarf. |
| **Alle Personen mit Zugriff** | Melden Verdacht auf Kompromittierung unverzüglich, halten sich an das Minimalprinzip. |

## Bezug zu anderen Dokumenten

- `pages/avv.vue` §4 (Technische und organisatorische Massnahmen) und §9 (Einsatz von Künstlicher Intelligenz)
- `pages/datenschutz.vue` §9 (Datensicherheit) und §11 (Einsatz von Künstlicher Intelligenz)
- `docs/PCI_COMPLIANCE_POLICY.md` (Zahlungsdaten-spezifische Regelungen)

## Review

Dieses Reglement wird mindestens jährlich oder nach jedem sicherheitsrelevanten Vorfall überprüft und bei Bedarf angepasst.
