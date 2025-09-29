# Externe Kalender Integration

## Übersicht
Das System ermöglicht es Staff-Mitgliedern, ihre privaten Kalender (Google, Microsoft, Apple) zu verbinden, damit diese Zeiten bei der Verfügbarkeitsprüfung berücksichtigt werden.

## Einrichtung

### 1. Datenbank-Schema erstellen
```sql
-- Führen Sie das SQL-Script aus:
external_calendars_schema.sql
```

### 2. Staff-Profil erweitert
- Jeder Staff kann in seinem Profil unter "Externe Kalender" seine privaten Kalender verbinden
- Unterstützte Anbieter:
  - **Google Calendar**: Über ICS-URL (einfachste Methode)
  - **Microsoft Outlook**: Über ICS-URL
  - **Apple Calendar**: Über ICS-URL oder CalDAV
  - **ICS-URL**: Für alle anderen Kalender

### 3. ICS-URL für Google Calendar
1. Gehen Sie zu [Google Calendar](https://calendar.google.com)
2. Klicken Sie auf das Zahnrad (Einstellungen) → "Einstellungen"
3. Wählen Sie "Kalender" im linken Menü
4. Klicken Sie auf den gewünschten Kalender
5. Scrollen Sie zu "Kalender-URL" und kopieren Sie die "Öffentliche URL"
6. Diese URL fügen Sie in das Staff-Profil ein

### 4. ICS-URL für Microsoft Outlook
1. Gehen Sie zu [Outlook Calendar](https://outlook.live.com/calendar)
2. Klicken Sie auf "Freigeben" → "Veröffentlichen"
3. Kopieren Sie die ICS-URL
4. Diese URL fügen Sie in das Staff-Profil ein

### 5. ICS-URL für Apple Calendar
1. Öffnen Sie die Kalender-App auf Mac/iPhone
2. Rechtsklick auf den Kalender → "Freigeben" → "Öffentliche URL"
3. Kopieren Sie die URL
4. Diese URL fügen Sie in das Staff-Profil ein

## Funktionsweise

### Automatische Synchronisation
- **Manuell**: Staff kann jederzeit "Sync" klicken
- **Automatisch**: Cron-Job synchronisiert alle 60 Minuten
- **Cron-URL**: `POST /api/cron/sync-external-calendars`

### Verfügbarkeitsprüfung
- Externe Termine werden als "external_busy" Status behandelt
- Sie blockieren alle Zeitslots für den entsprechenden Staff
- Keine Unterscheidung nach Ort oder Kategorie (Staff ist generell nicht verfügbar)

### Datenmodell
```sql
-- Externe Kalender-Verbindungen
external_calendars (
  id, tenant_id, staff_id, provider, account_identifier,
  connection_type, ics_url, last_sync_at, sync_enabled
)

-- Gebuchte Zeiten aus externen Kalendern
external_busy_times (
  id, tenant_id, staff_id, external_calendar_id,
  external_event_id, start_time, end_time, sync_source
)
```

## Sicherheit
- Alle OAuth-Tokens werden verschlüsselt gespeichert
- RLS-Policies sorgen für Tenant-Isolation
- ICS-URLs werden nur für den jeweiligen Staff verwendet

## Erweiterte Features (TODO)
- OAuth-Integration für Google/Microsoft/Apple
- CalDAV-Support für Apple Calendar
- Automatische Token-Erneuerung
- Konflikt-Auflösung bei doppelten Terminen
- Benachrichtigungen bei Sync-Fehlern

## Troubleshooting

### Kalender wird nicht synchronisiert
1. Prüfen Sie die ICS-URL (muss öffentlich zugänglich sein)
2. Prüfen Sie die Cron-Job-Logs
3. Testen Sie die manuelle Synchronisation

### Termine erscheinen nicht in der Verfügbarkeitsprüfung
1. Prüfen Sie, ob der Staff die richtige Kalender-Verbindung hat
2. Prüfen Sie die `external_busy_times` Tabelle
3. Prüfen Sie die Logs in der Verfügbarkeitsprüfung

### Performance-Probleme
- Alte Busy Times werden automatisch nach 90 Tagen gelöscht
- Cron-Job läuft nur alle 60 Minuten
- ICS-Parsing ist optimiert für Standard-Formate
