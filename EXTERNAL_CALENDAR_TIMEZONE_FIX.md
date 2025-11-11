# External Calendar Timezone Fix

## Problem

Google Calendar Termine wurden mit **UTC-Zeit** in der Datenbank gespeichert, obwohl die gesamte App mit **lokaler Schweizer Zeit** arbeitet.

**Beispiel:**
- Google Calendar: Termin um **08:00 Uhr** (Schweizer Zeit)
- Google speichert intern: **07:00:00Z** (UTC)
- Alte App-Version speicherte: `2025-11-12 07:00:00+00` ❌
- Neue App-Version speichert: `2025-11-12 08:00:00` ✅

## Lösung

### 1. Code-Änderungen (`server/api/external-calendars/sync-ics.post.ts`)

**UTC-Zeit Parsing (Zeile 298-325):**
```typescript
// UTC format: 20231215T120000Z - Umrechnung in lokale Schweizer Zeit
if (/^\d{8}T\d{6}Z$/.test(clean)) {
  // Parse als UTC Date
  const utcDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)
  
  // Konvertiere in lokale Schweizer Zeit (Europe/Zurich)
  const localDateStr = utcDate.toLocaleString('en-CA', { 
    timeZone: 'Europe/Zurich',
    // ... weitere Optionen
  })
  
  return `${datePart}T${timePart}`
}
```

**Speicherformat (Zeile 139-158):**
```typescript
const formatLocalTime = (isoStr: string) => {
  // Konvertiere "2025-11-12T08:00:00" zu "2025-11-12 08:00:00"
  return isoStr.replace('T', ' ')
}
```

### 2. Bestehende Daten korrigieren

**SQL-Script ausführen:**
```bash
# In Supabase SQL Editor:
# 1. Öffne: fix_external_calendar_timezone.sql
# 2. Führe zuerst die Preview-Query aus (Zeile 18-26)
# 3. Prüfe die Ergebnisse
# 4. Wenn korrekt: Uncomment und führe das UPDATE aus (Zeile 29-35)
```

**Was das Script macht:**
- Konvertiert alle UTC-Timestamps in lokale Schweizer Zeit
- Berücksichtigt automatisch Sommer-/Winterzeit
- Aktualisiert nur Einträge mit `sync_source = 'ics'`

### 3. Kalender neu synchronisieren

Nach dem Code-Update und SQL-Fix:

1. Gehe zu: `http://localhost:3000/dashboard` (als Fahrlehrer)
2. Öffne: "Einstellungen" → "Externer Kalender"
3. Klicke: "Jetzt synchronisieren"
4. Prüfe: Termine sollten jetzt mit korrekter Zeit angezeigt werden

## Verifizierung

**Prüfe in der Datenbank:**
```sql
SELECT 
  event_title,
  start_time,
  end_time
FROM external_busy_times
WHERE staff_id = 'YOUR_STAFF_ID'
ORDER BY start_time DESC
LIMIT 5;
```

**Erwartetes Format:**
- ✅ `2025-11-12 08:00:00` (ohne Timezone-Suffix)
- ❌ `2025-11-12 07:00:00+00` (mit UTC-Suffix)

## Wichtige Hinweise

1. **Timezone-Konsistenz**: Die gesamte App arbeitet mit lokaler Schweizer Zeit
2. **Keine Timezone-Suffixe**: Timestamps werden ohne `+00` oder `Z` gespeichert
3. **Automatische DST**: `Europe/Zurich` berücksichtigt automatisch Sommer-/Winterzeit
4. **Einmalige Korrektur**: Das SQL-Script sollte nur einmal ausgeführt werden

## Betroffene Dateien

- `server/api/external-calendars/sync-ics.post.ts` - ICS Parsing & Speicherung
- `fix_external_calendar_timezone.sql` - Datenbank-Korrektur
- `external_busy_times` Tabelle - Betroffene Daten

## Testen

1. **Neuen Termin in Google Calendar erstellen** (z.B. morgen um 10:00)
2. **Synchronisieren** in der App
3. **Prüfen** in der DB:
   ```sql
   SELECT * FROM external_busy_times 
   WHERE event_title = 'Privat' 
   ORDER BY created_at DESC LIMIT 1;
   ```
4. **Erwartung**: `start_time` sollte `10:00:00` sein (nicht `09:00:00`)

## Rollback (falls nötig)

Falls etwas schiefgeht, kannst du zur UTC-Zeit zurück:
```sql
UPDATE external_busy_times
SET 
  start_time = (start_time AT TIME ZONE 'Europe/Zurich' AT TIME ZONE 'UTC')::timestamp,
  end_time = (end_time AT TIME ZONE 'Europe/Zurich' AT TIME ZONE 'UTC')::timestamp
WHERE sync_source = 'ics';
```

---

**Status:** ✅ Implementiert
**Datum:** 11.11.2025
**Version:** 1.0

