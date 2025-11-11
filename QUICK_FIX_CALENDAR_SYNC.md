# Quick Fix: Kalender-Synchronisation funktioniert nicht

## Sofort-Checkliste für deinen Arbeitskollegen

### ✅ Schritt 1: Browser Console öffnen
1. Drücke **F12** (oder Rechtsklick → "Untersuchen")
2. Klicke auf den Tab **"Console"**
3. Lasse die Console offen

### ✅ Schritt 2: Synchronisation starten
1. Klicke auf **"Sync"** Button
2. Beobachte die Console-Ausgaben

**Was du sehen solltest:**
```
🔄 Starting calendar sync for: [ID]
📅 Calendar found: [Name] ICS URL: Yes
🌐 Fetching from API: /api/external-calendars/sync-ics
📡 API Response: { success: true, imported_events: X }
✅ Sync successful, reloading calendars...
✅ Calendars reloaded
🏁 Sync process completed
```

**Falls Fehler:**
```
❌ Sync error: [Fehlermeldung]
❌ Error details: { ... }
```

### ✅ Schritt 3: Häufigste Probleme & Lösungen

#### Problem A: "ICS-URL nicht erreichbar"
**Lösung:**
1. Gehe zu **Google Calendar** (calendar.google.com)
2. Klicke auf **Einstellungen** (Zahnrad oben rechts)
3. Wähle deinen **Kalender** aus (links)
4. Scrolle zu **"Kalender integrieren"**
5. Kopiere die **"Geheime Adresse im iCal-Format"**
   - Muss so aussehen: `https://calendar.google.com/calendar/ical/DEINE_EMAIL/private-XXX/basic.ics`
   - **Wichtig:** Muss `/private-XXX/` enthalten!
6. Füge die URL in der App ein (Kalender trennen → neu verbinden)

#### Problem B: "0 events imported"
**Grund:** Keine Termine im nächsten Jahr

**Lösung:**
1. Erstelle einen **Test-Termin** in Google Calendar (z.B. morgen)
2. Synchronisiere erneut
3. Termin sollte jetzt erscheinen

#### Problem C: "Nie synchronisiert" bleibt stehen
**Grund:** Database-Update schlägt fehl

**Lösung:**
1. **Kalender trennen** (Button "Trennen")
2. **Neu verbinden** mit der ICS-URL
3. **Synchronisieren**

### ✅ Schritt 4: Prüfe die Datenbank

**SQL in Supabase ausführen:**
```sql
-- 1. Prüfe ob Kalender vorhanden ist
SELECT 
  id,
  calendar_name,
  ics_url,
  last_sync_at
FROM external_calendars
WHERE staff_id = 'DEINE_STAFF_ID';

-- 2. Prüfe ob Events importiert wurden
SELECT 
  event_title,
  start_time,
  end_time
FROM external_busy_times
WHERE staff_id = 'DEINE_STAFF_ID'
ORDER BY start_time DESC
LIMIT 10;
```

**Erwartetes Ergebnis:**
- `last_sync_at` sollte ein aktuelles Datum haben
- `external_busy_times` sollte Einträge mit "Privat" haben

### ✅ Schritt 5: ICS-URL direkt testen

**Im Browser:**
1. Kopiere die ICS-URL aus der App
2. Füge sie in die Browser-Adresszeile ein
3. Drücke Enter

**Erwartetes Ergebnis:**
- Browser lädt eine `.ics` Datei herunter ODER
- Zeigt ICS-Text an (BEGIN:VCALENDAR...)

**Fehler-Ergebnis:**
- "404 Not Found" → URL ist falsch
- "403 Forbidden" → URL ist nicht öffentlich
- HTML-Seite → URL ist falsch

### ✅ Schritt 6: Timezone-Fix anwenden

Falls Termine mit falscher Zeit angezeigt werden:

**SQL in Supabase:**
```sql
-- Prüfe aktuelle Zeiten
SELECT 
  event_title,
  start_time,
  end_time
FROM external_busy_times
WHERE staff_id = 'DEINE_STAFF_ID'
LIMIT 5;

-- Falls Zeiten falsch sind (z.B. 07:00 statt 08:00):
-- Führe fix_external_calendar_timezone.sql aus
```

---

## Zusammenfassung der häufigsten Fehler

| Symptom | Ursache | Lösung |
|---------|---------|--------|
| "Nie synchronisiert" | ICS-URL nicht öffentlich | Neue "Geheime Adresse" in Google Calendar |
| "0 events imported" | Keine Termine im Zeitfenster | Test-Termin erstellen |
| Termine 1h zu früh | Timezone-Problem | SQL-Fix ausführen |
| Fehler in Console | URL falsch | URL im Browser testen |
| Button bleibt auf "Sync..." | JavaScript-Fehler | Browser neu laden |

---

## Support kontaktieren

Falls nichts hilft, sende folgende Infos:

1. **Screenshot der Browser Console** (nach Sync-Klick)
2. **Screenshot der Fehlermeldung** (falls sichtbar)
3. **Staff ID** aus der Datenbank
4. **ICS-URL funktioniert im Browser?** Ja/Nein

---

## Notfall-Reset

```sql
-- Lösche alle Kalender-Verbindungen für Neustart
DELETE FROM external_busy_times 
WHERE staff_id = 'DEINE_STAFF_ID';

DELETE FROM external_calendars 
WHERE staff_id = 'DEINE_STAFF_ID';
```

Dann:
1. App neu laden (F5)
2. Kalender neu verbinden
3. Synchronisieren

