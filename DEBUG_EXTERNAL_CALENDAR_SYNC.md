# Debug Guide: External Calendar Synchronisation funktioniert nicht

## Problem
- Synchronisation scheint zu laufen
- "Letzte Synch.: Nie synchronisiert" bleibt stehen
- Private Termine sind nicht sichtbar

## Mögliche Ursachen & Lösungen

### 1. Fehler wird nicht angezeigt (UI-Problem)

**Symptom:** Sync läuft, aber Fehler wird verschluckt

**Debug in Browser Console:**
```javascript
// Öffne Browser DevTools (F12) → Console
// Klicke auf "Sync" und prüfe die Console-Ausgabe
```

**Lösung:** Prüfe ob Fehlermeldungen in der Console erscheinen

---

### 2. ICS-URL ist nicht öffentlich zugänglich

**Symptom:** Google Calendar URL ist privat

**Prüfen:**
```bash
# Teste die ICS-URL direkt im Browser
# URL sollte so aussehen:
https://calendar.google.com/calendar/ical/DEINE_EMAIL/private-XXX/basic.ics
```

**Lösung:**
1. Google Calendar öffnen
2. Einstellungen → Kalender auswählen
3. "Kalender integrieren" → "Geheime Adresse im iCal-Format"
4. **Wichtig:** URL muss `/private-XXX/` enthalten
5. Neue URL kopieren und in der App eintragen

---

### 3. CORS-Problem (Cross-Origin)

**Symptom:** Fetch schlägt fehl wegen CORS

**Prüfen in Console:**
```
Access to fetch at 'https://calendar.google.com/...' has been blocked by CORS policy
```

**Lösung:** 
- Die Synchronisation läuft **server-side** (sollte kein CORS-Problem geben)
- Falls doch: Prüfe ob die URL wirklich über den Server läuft

---

### 4. Database RLS (Row Level Security) Problem

**Symptom:** Daten werden nicht gespeichert/geladen

**SQL Debug:**
```sql
-- Prüfe ob external_calendars existiert
SELECT * FROM external_calendars 
WHERE staff_id = 'STAFF_ID_HIER';

-- Prüfe ob external_busy_times gespeichert werden
SELECT * FROM external_busy_times 
WHERE staff_id = 'STAFF_ID_HIER'
ORDER BY start_time DESC
LIMIT 10;

-- Prüfe RLS Policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('external_calendars', 'external_busy_times');
```

**Lösung:** RLS Policies müssen korrekt sein für:
- `external_calendars`: SELECT, INSERT, UPDATE, DELETE für staff
- `external_busy_times`: SELECT, INSERT, UPDATE, DELETE für staff

---

### 5. last_sync_at wird nicht aktualisiert

**Symptom:** Sync erfolgreich, aber `last_sync_at` bleibt NULL

**SQL Debug:**
```sql
-- Prüfe last_sync_at
SELECT 
  id,
  calendar_name,
  last_sync_at,
  created_at,
  updated_at
FROM external_calendars
WHERE staff_id = 'STAFF_ID_HIER';
```

**Code-Check:**
In `server/api/external-calendars/sync-ics.post.ts` Zeile 172-181:
```typescript
// Update last sync time
const { error: updateError } = await supabase
  .from('external_calendars')
  .update({ 
    last_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .eq('id', calendar_id)
```

**Lösung:** Prüfe ob das UPDATE erfolgreich ist (keine RLS-Blockade)

---

### 6. Keine Events im Zeitfenster

**Symptom:** Sync erfolgreich, aber "0 events imported"

**Grund:** ICS enthält keine Events im nächsten Jahr

**SQL Debug:**
```sql
-- Prüfe ob Events importiert wurden
SELECT COUNT(*) as event_count
FROM external_busy_times
WHERE external_calendar_id = 'CALENDAR_ID_HIER';
```

**Lösung:** 
- Erstelle einen Test-Termin in Google Calendar (nächste Woche)
- Synchronisiere erneut
- Prüfe ob Event erscheint

---

### 7. Frontend lädt Daten nicht neu

**Symptom:** Daten sind in DB, aber UI zeigt sie nicht

**Debug:**
```javascript
// In Browser Console nach Sync:
// Prüfe ob loadExternalCalendars() aufgerufen wird
```

**Code-Check:**
In `ExternalCalendarSettings.vue` Zeile 334:
```typescript
if (response.success) {
  success.value = `Kalender synchronisiert! ${response.imported_events} Termine importiert.`
  await loadExternalCalendars() // ← Muss aufgerufen werden
}
```

---

## Schritt-für-Schritt Debug-Prozess

### Schritt 1: Browser Console öffnen
```
F12 → Console Tab
```

### Schritt 2: Sync klicken und Logs prüfen
Erwartete Logs:
```
🔄 Loading external calendars...
✅ External calendars loaded: 1
```

### Schritt 3: Network Tab prüfen
```
F12 → Network Tab → Filter: "sync-ics"
```

Prüfe:
- Status: 200 OK?
- Response: `{ success: true, imported_events: X }`?
- Fehler in Response?

### Schritt 4: Database prüfen
```sql
-- 1. Kalender vorhanden?
SELECT * FROM external_calendars WHERE staff_id = 'XXX';

-- 2. Events importiert?
SELECT COUNT(*) FROM external_busy_times 
WHERE external_calendar_id = 'XXX';

-- 3. last_sync_at aktualisiert?
SELECT last_sync_at FROM external_calendars WHERE id = 'XXX';
```

### Schritt 5: ICS-URL direkt testen
```bash
# Im Browser oder curl:
curl "https://calendar.google.com/calendar/ical/EMAIL/private-XXX/basic.ics"

# Sollte ICS-Daten zurückgeben, nicht HTML oder Fehler
```

---

## Häufigste Lösung

**90% der Fälle:**
1. ICS-URL ist **nicht öffentlich** oder **falsch**
2. Lösung: Neue "Geheime Adresse" in Google Calendar generieren
3. URL muss `/private-XXX/basic.ics` enthalten

**So geht's:**
1. Google Calendar → Einstellungen
2. Kalender auswählen (links)
3. Scrollen zu "Kalender integrieren"
4. Kopiere "Geheime Adresse im iCal-Format"
5. Füge in App ein und synchronisiere

---

## Support-Anfrage Template

Falls das Problem weiterhin besteht:

```
**Problem:** External Calendar Sync funktioniert nicht

**Staff ID:** [aus DB kopieren]
**Calendar ID:** [aus DB kopieren]
**Browser:** Chrome/Firefox/Safari
**Console Errors:** [Screenshot oder Text]
**Network Response:** [Screenshot von Network Tab]

**SQL Results:**
- external_calendars count: X
- external_busy_times count: Y
- last_sync_at: NULL / Datum

**ICS-URL Test:** 
- URL funktioniert im Browser: Ja/Nein
- Gibt ICS-Daten zurück: Ja/Nein
```

---

## Quick Fix Commands

```sql
-- Reset last_sync_at für erneuten Test
UPDATE external_calendars 
SET last_sync_at = NULL 
WHERE id = 'CALENDAR_ID';

-- Lösche alle Events für Neustart
DELETE FROM external_busy_times 
WHERE external_calendar_id = 'CALENDAR_ID';

-- Prüfe RLS Policies
SELECT * FROM pg_policies 
WHERE tablename = 'external_calendars';
```

