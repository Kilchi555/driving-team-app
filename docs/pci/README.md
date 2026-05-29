# PCI-Dokumente pro Tenant (Wallee-Anbindung)

Jeder Tenant, der Online-Kartenzahlungen über **Wallee** akzeptiert, ist der
**Merchant of Record** und braucht eine eigene PCI-DSS-Dokumentation (SAQ A) auf
**seinen** Namen. Simy IT Systems Kilchenmann ist nur der technische
Plattformpartner — Kartendaten berühren nie Simy-Systeme (Redirect auf Wallees
gehostete Zahlungsseite).

Dieses Verzeichnis erzeugt pro Tenant zwei Dokumente:

1. **PCI-Compliance-Richtlinie** → belegt SAQ-A-Checkbox „aktuelles PCI-Compliance-Dokument"
2. **PCI Incident-Response-Plan** → belegt SAQ-A-Checkbox „Incident-Response-Plan"

## Struktur

```
server/templates/pci-templates.mjs     # EINZIGE Quelle der Vorlagen (DE) + Render-Logik
                                        # — genutzt von CLI UND vom Super-Admin-UI-Endpoint
docs/pci/
├── <tenant-slug>/                     # generierte Doks pro Tenant (.md + .pdf)
└── README.md
```

> Die Vorlagentexte liegen als importierbares Modul in
> `server/templates/pci-templates.mjs` (damit sie auch auf Vercel gebündelt
> werden). Texte dort ändern → wirkt sowohl im CLI als auch in der UI.

## Erzeugen — in der UI (empfohlen für den Alltag)

**Nur Super-Admin.** Tenant-Verwaltung (`/tenant-admin/tenants`) → bei einem
Tenant auf **Wallee „Verwalten/Setup"** → Abschnitt **„PCI-Dokumente"**:
Unterzeichner + Funktion eingeben → **„PCI-Dokumente erzeugen & öffnen"**.
Es öffnet sich eine Druckansicht beider Dokumente → **Drucken / Als PDF
speichern** → dem Tenant zusenden.

Endpoint dahinter: `GET /api/admin/pci-docs?tenant_id=…&approver=…&title=…`
(super-admin-geschützt, liefert druckbares HTML).

## Erzeugen — empfohlen (Daten aus der `tenants`-Tabelle)

```bash
npm run pci:generate -- --tenant-slug <slug> --approver "Vorname Nachname" --title "Geschäftsführer" --pdf
```

Automatisch aus der DB übernommen: `legal_company_name` (Fallback `name`),
`address`, `contact_email`, `uid_number` (Fallback `wallee_uid_number`) sowie
— falls vorhanden — `contact_person_first_name`/`last_name` als Unterzeichner.

> **Unterzeichner/Funktion** sind in der DB meist nicht hinterlegt → per
> `--approver` / `--title` mitgeben. Fehlende Felder werden im Dokument als
> `[BITTE AUSFÜLLEN: …]` markiert (nie still falsch).

Benötigt `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (env oder `.env`).

## Erzeugen — alles manuell (ohne DB)

```bash
npm run pci:generate -- \
  --company "Driving Team Zürich GmbH" \
  --address "Baslerstrasse 145, 8048 Zürich" \
  --uid "CHE-293.989.777" \
  --email "info@drivingteam.ch" \
  --approver "Pascal Kilchenmann" --title "Geschäftsführer" \
  --slug driving-team --pdf
```

Jeder Flag überschreibt den DB-Wert.

## Workflow für einen neuen Wallee-Tenant

1. **UID nachtragen** (falls leer): `tenants.uid_number` für den Tenant setzen,
   dann ist die Generierung fast vollautomatisch.
2. **Generieren:** `npm run pci:generate -- --tenant-slug <slug> --approver "…" --title "…" --pdf`
3. **Prüfen:** keine `[BITTE AUSFÜLLEN: …]`-Platzhalter mehr im Dokument.
4. **Zusenden:** die beiden PDFs aus `docs/pci/<slug>/` dem Tenant per E-Mail
   schicken (zur Unterzeichnung / Ablage). Optional zusätzlich Wallee bereitstellen.

## PDF-Erzeugung

`--pdf` rendert über einen lokal installierten Chromium-Browser (Chrome/Edge/
Brave/Chromium). Ohne `--pdf` werden nur die `.md`-Dateien erzeugt.
