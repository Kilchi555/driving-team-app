# In-App Hilfe (User-Dokumentation)

Diese Markdown-Dateien werden in der App unter `/help` angezeigt.

## Struktur

- `client/` – Hilfe für Kunden (Lernende)
- `staff/` – Hilfe für Mitarbeitende / Fahrlehrer
- `admin/` – Hilfe für Admin / Betriebsleitung

## Frontmatter (Pflicht)

```yaml
---
title: Kurzer Titel
summary: Ein Satz, was der Artikel erklärt
order: 10
---
```

- `title` – Listen- und Seitentitel
- `summary` – Kurztext in der Übersicht
- `order` – Sortierung (niedriger = weiter oben)

## Stil

- Deutsch, du-Form, kurze Schritte
- Nur Funktionen beschreiben, die in der App wirklich existieren
- Keine Entwickler- oder Internas
- Keine erfundenen Features

## Dateinamen

Kleinbuchstaben, Bindestriche, `.md` — z. B. `fahrstunde-buchen.md`.
Der Dateiname (ohne `.md`) ist die URL unter `/help/<slug>`.
