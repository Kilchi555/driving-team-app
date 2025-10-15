# Automatische Kalender-Synchronisierung

## Übersicht
Die Kalender-Synchronisierung läuft automatisch alle 30 Minuten und hält externe Kalender (Google, Microsoft, Apple) mit der Verfügbarkeitsprüfung synchron.

## Implementierung

### Option 1: Supabase Edge Function mit Cron (Empfohlen)

#### 1. Edge Function deployen
```bash
supabase functions deploy sync-calendars-cron
```

#### 2. Cron-Job in Supabase Dashboard einrichten
1. Gehe zu: https://supabase.com/dashboard/project/unyjaetebnaexaflpyoc/functions
2. Wähle `sync-calendars-cron`
3. Klicke auf "Enable Cron"
4. Setze Schedule: `*/30 * * * *` (alle 30 Minuten)
5. Speichern

**Hinweis**: Ab Supabase CLI v2.40+ unterstützt Supabase direkte Cron-Definitionen in der Edge Function Config.

#### Alternative: Cron Config File (neuere Supabase CLI)
Erstelle `supabase/functions/sync-calendars-cron/cron.json`:
```json
{
  "schedule": "*/30 * * * *",
  "enabled": true
}
```

Dann deployen:
```bash
supabase functions deploy sync-calendars-cron --with-cron
```

### Option 2: Vercel Cron (falls auf Vercel deployed)

Erstelle `vercel.json` im Root:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-external-calendars",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

Nach dem nächsten Vercel-Deployment läuft der Cron automatisch.

### Option 3: Externe Cron-Services

#### EasyCron (kostenlos)
1. Account erstellen: https://www.easycron.com
2. Neuen Cron Job erstellen:
   - URL: `https://unyjaetebnaexaflpyoc.supabase.co/functions/v1/sync-calendars-cron`
   - Methode: POST
   - Intervall: Alle 30 Minuten
   - Header: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY` (optional, für zusätzliche Sicherheit)

#### GitHub Actions
Erstelle `.github/workflows/sync-calendars.yml`:
```yaml
name: Sync External Calendars
on:
  schedule:
    - cron: '*/30 * * * *'  # Alle 30 Minuten
  workflow_dispatch:  # Erlaubt manuellen Trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Calendar Sync
        run: |
          curl -X POST https://unyjaetebnaexaflpyoc.supabase.co/functions/v1/sync-calendars-cron
```

## Funktionsweise

### Was passiert beim Sync?
1. **Kalender laden**: Alle Kalender mit `sync_enabled = true` und letzter Sync > 1 Stunde
2. **ICS abrufen**: Lädt ICS-Datei von der hinterlegten URL
3. **Parsen**: Extrahiert Events aus ICS-Format
4. **Filtern**: Nur Events der nächsten 60 Tage
5. **Speichern**: Löscht alte Busy Times und speichert neue in `external_busy_times`
6. **Anonymisieren**: Alle Titel werden zu "Privat"
7. **Timestamp**: Aktualisiert `last_sync_at`

### Zeitfenster
- **Sync-Intervall**: 30 Minuten (konfigurierbar)
- **Event-Fenster**: Nächste 60 Tage
- **Mindest-Abstand**: Kalender wird nur gesynct, wenn letzte Sync > 1 Stunde her ist

### Performance
- Nur Kalender, die sync-bedürftig sind
- Batch-Verarbeitung mit Deduplizierung
- Alte Busy Times (> 60 Tage) werden automatisch gelöscht

## Monitoring

### Logs ansehen
```bash
# Supabase Edge Function Logs
supabase functions logs sync-calendars-cron --since 1h

# Oder im Dashboard
https://supabase.com/dashboard/project/unyjaetebnaexaflpyoc/functions/sync-calendars-cron/logs
```

### Manueller Test
```bash
curl -X POST https://unyjaetebnaexaflpyoc.supabase.co/functions/v1/sync-calendars-cron
```

Erwartete Antwort:
```json
{
  "success": true,
  "message": "Synced 3/5 calendars",
  "synced_calendars": 3,
  "total_calendars": 5,
  "errors": ["Calendar abc: HTTP 404"]
}
```

## Frequenz ändern

### 30 Minuten (Standard)
`*/30 * * * *`

### 15 Minuten
`*/15 * * * *`

### 1 Stunde
`0 * * * *`

### Nur während Arbeitszeit (Mo-Fr, 7-19 Uhr)
`*/30 7-19 * * 1-5`

## Troubleshooting

### Kalender werden nicht synchronisiert
1. Prüfe Logs der Edge Function
2. Teste manuellen Sync über UI
3. Prüfe ob `sync_enabled = true`
4. Prüfe ob ICS-URL öffentlich zugänglich ist

### Performance-Probleme
- Reduziere Sync-Intervall auf 60 Minuten
- Reduziere Event-Fenster von 60 auf 30 Tage
- Prüfe Anzahl verbundener Kalender

### Fehler in ICS-URLs
- Manche Provider ändern URLs periodisch
- Staff muss URL neu hinterlegen
- Alternative: OAuth-Flow implementieren (zukünftig)

