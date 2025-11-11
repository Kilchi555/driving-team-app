# Travel Time Validation & Zeitfenster System

## Übersicht

Dieses System verhindert, dass Fahrlehrer unmögliche Termine buchen, bei denen sie nicht rechtzeitig von einem Standort zum anderen fahren können. Zusätzlich können pro Standort Zeitfenster definiert werden.

## Features

### 1. **Travel Time Validation**
Prüft ob ein Fahrlehrer zwischen zwei Terminen genug Zeit hat, um von einem Standort zum anderen zu fahren.

**Beispiel-Szenario:**
```
13:00-13:45: Termin in Altstetten (PLZ 8048)
14:00-14:45: Termin in Uster (PLZ 8610)
Fahrzeit: ~25 Minuten
Verfügbare Zeit: 15 Minuten
→ ❌ Nicht möglich!
```

### 2. **Zeitfenster pro Standort**
Admin kann definieren, wann ein Standort verfügbar ist.

**Beispiel:**
- **Uster**: Nur 07:00-09:00 und 16:00-19:00 (Mo-Fr)
- **Altstetten**: 09:00-17:00 (Mo-Fr)

## Datenbank-Schema

### `locations.time_windows` (JSONB)

```json
[
  {
    "start": "07:00",
    "end": "09:00",
    "days": [1, 2, 3, 4, 5]  // Mo-Fr
  },
  {
    "start": "16:00",
    "end": "19:00",
    "days": [1, 2, 3, 4, 5]
  }
]
```

**days**: 0=Sonntag, 1=Montag, 2=Dienstag, ..., 6=Samstag

## Validierungs-Logik

### Schritt 1: Zeitfenster-Check
```typescript
// Prüft ob Slot innerhalb der definierten Zeitfenster liegt
isWithinTimeWindows(slotStart: Date, timeWindows: TimeWindow[]): boolean
```

- Keine Zeitfenster definiert → immer verfügbar
- Zeitfenster definiert → nur Slots innerhalb der Fenster

### Schritt 2: Travel-Time-Check
```typescript
// Prüft Fahrzeit zu vorherigem/nächstem Termin
validateTravelTimeBetweenAppointments(
  previousAppointment: Appointment | null,
  nextAppointment: Appointment | null,
  newSlotStart: Date,
  newSlotEnd: Date,
  newLocationPLZ: string,
  maxTravelTimeMinutes: number,
  googleApiKey: string,
  peakSettings?: PeakTimeSettings
): Promise<ValidationResult>
```

**Prüfungen:**
1. **Vorheriger Termin**:
   - Wo endet er? (PLZ)
   - Wann endet er?
   - Fahrzeit zum neuen Standort
   - Verfügbare Zeit >= Fahrzeit + 5 Min Puffer?

2. **Nächster Termin**:
   - Wo beginnt er? (PLZ)
   - Wann beginnt er?
   - Fahrzeit vom neuen Standort
   - Verfügbare Zeit >= Fahrzeit + 5 Min Puffer?

3. **Max-Radius-Check**:
   - Fahrzeit <= maxTravelTimeMinutes (z.B. 15 Min)?

## Verwendung

### Admin-UI: Zeitfenster konfigurieren

**Standort-Einstellungen** (`/admin/users/[staff-id]`):

1. Navigiere zu "Verfügbarkeit & Online-Terminbuchung"
2. Wähle einen Standort
3. Scrolle zu "Verfügbare Zeitfenster"
4. Klicke "Zeitfenster hinzufügen"
5. Setze Start/End-Zeit
6. Wähle Wochentage (Mo-So)
7. Speichere

**Beispiel-Konfiguration:**
- Uster: 07:00-09:00 (Mo-Fr) + 16:00-19:00 (Mo-Fr)
- Altstetten: 09:00-17:00 (Mo-Fr)

### Availability-System Integration

```typescript
// 1. Lade Standort mit Zeitfenstern
const location = await supabase
  .from('locations')
  .select('*, time_windows')
  .eq('id', locationId)
  .single()

// 2. Generiere Slots mit Zeitfenster-Check
const slots = generateTimeSlots({
  workingHours,
  staff,
  location,
  date,
  duration,
  buffer,
  existingAppointments,
  locationTimeWindows: location.time_windows  // ← Zeitfenster
})

// 3. Validiere Slots mit Travel-Time-Check
const validSlots = await validateSlotsWithTravelTime(
  slots,
  staffId,
  locationPLZ,
  maxTravelTimeMinutes,  // z.B. 15 Min (Pickup-Radius)
  googleApiKey,
  peakSettings
)
```

## Algorithmus

### Slot-Generierung mit Validierung

```
FOR each potential slot:
  
  1. Prüfe Zeitfenster:
     IF location.time_windows exists:
       IF slot NOT in time_windows:
         → ❌ SKIP (außerhalb Zeitfenster)
  
  2. Prüfe vorherigen Termin:
     IF previous appointment exists:
       GET PLZ vom vorherigen Standort
       CALCULATE travel time (mit Peak/Offpeak)
       IF available time < (travel time + 5 min):
         → ❌ SKIP (nicht genug Zeit)
       IF travel time > max radius:
         → ❌ SKIP (zu weit entfernt)
  
  3. Prüfe nächsten Termin:
     IF next appointment exists:
       GET PLZ vom nächsten Standort
       CALCULATE travel time (mit Peak/Offpeak)
       IF available time < (travel time + 5 min):
         → ❌ SKIP (nicht genug Zeit)
       IF travel time > max radius:
         → ❌ SKIP (zu weit entfernt)
  
  4. Slot ist gültig:
     → ✅ ADD to available slots
```

## Beispiel-Szenarien

### Szenario 1: Hin-und-Her verhindert

**Ausgangslage:**
- 13:00 Uster (bestätigt)
- 15:00 Uster (bestätigt)

**Kunde versucht zu buchen:**
- 14:00 Altstetten

**Validierung:**
```
Vorheriger Termin: 13:00 Uster (endet 13:45)
Fahrzeit Uster → Altstetten: 25 Min
Verfügbare Zeit: 15 Min
→ ❌ NICHT VERFÜGBAR (nicht genug Zeit)

Nächster Termin: 15:00 Uster (beginnt 15:00)
Fahrzeit Altstetten → Uster: 25 Min
Verfügbare Zeit: 15 Min (14:45 - 15:00)
→ ❌ NICHT VERFÜGBAR (nicht genug Zeit)
```

**Ergebnis:** Slot wird nicht angezeigt ✅

### Szenario 2: Zeitfenster-Beschränkung

**Standort-Konfiguration:**
- Uster: Nur 07:00-09:00 und 16:00-19:00

**Kunde versucht zu buchen:**
- 13:00 Uster

**Validierung:**
```
Zeitfenster-Check:
13:00 ist NICHT in [07:00-09:00] oder [16:00-19:00]
→ ❌ NICHT VERFÜGBAR (außerhalb Zeitfenster)
```

**Ergebnis:** Slot wird nicht angezeigt ✅

### Szenario 3: Gültiger Slot

**Ausgangslage:**
- 13:00 Uster (bestätigt, endet 13:45)

**Kunde versucht zu buchen:**
- 14:00 Uster

**Validierung:**
```
Vorheriger Termin: 13:00 Uster (endet 13:45)
Fahrzeit Uster → Uster: 0 Min (gleicher Standort)
Verfügbare Zeit: 15 Min
→ ✅ VERFÜGBAR

Zeitfenster-Check: ✅ (keine Beschränkung)
```

**Ergebnis:** Slot wird angezeigt ✅

## Performance-Optimierung

### PLZ-Cache
- Fahrzeit zwischen PLZ wird gecacht
- Erste Abfrage: 2 API Calls (Peak + Offpeak)
- Weitere Abfragen: 0 API Calls
- Cache-Gültigkeit: 30 Tage

### Batch-Validierung
- Slots werden in Batches validiert
- Mehrere Slots pro API-Call möglich
- Reduziert Latenz bei vielen Slots

## Migration

### SQL ausführen:
```bash
# 1. Zeitfenster-Spalte hinzufügen
add_time_windows_to_locations.sql

# 2. Peak-Time Settings hinzufügen (falls noch nicht vorhanden)
add_peak_time_settings_to_staff.sql
```

### Beispiel-Daten setzen:
```sql
-- Uster: Nur Morgen und Abend
UPDATE locations
SET time_windows = '[
  {"start": "07:00", "end": "09:00", "days": [1,2,3,4,5]},
  {"start": "16:00", "end": "19:00", "days": [1,2,3,4,5]}
]'::jsonb
WHERE name = 'Uster';

-- Altstetten: Ganzer Tag
UPDATE locations
SET time_windows = '[
  {"start": "09:00", "end": "17:00", "days": [1,2,3,4,5]}
]'::jsonb
WHERE name = 'Altstetten';
```

## Troubleshooting

### Problem: Slots werden nicht angezeigt

**Mögliche Ursachen:**
1. Zeitfenster zu restriktiv
2. Max-Radius zu klein
3. Zu viele bestehende Termine

**Lösung:**
```sql
-- Prüfe Zeitfenster
SELECT name, time_windows 
FROM locations 
WHERE id = 'location-id';

-- Prüfe Termine des Fahrlehrers
SELECT start_time, end_time, location_id
FROM appointments
WHERE staff_id = 'staff-id'
AND DATE(start_time) = '2025-11-10'
ORDER BY start_time;
```

### Problem: Fahrzeit wird nicht korrekt berechnet

**Lösung:**
```sql
-- Prüfe PLZ-Cache
SELECT * FROM plz_distance_cache
WHERE (from_plz = '8048' AND to_plz = '8610')
   OR (from_plz = '8610' AND to_plz = '8048');

-- Lösche Cache-Eintrag zum Neu-Berechnen
DELETE FROM plz_distance_cache
WHERE (from_plz = '8048' AND to_plz = '8610')
   OR (from_plz = '8610' AND to_plz = '8048');
```

## Zukünftige Erweiterungen

- [ ] UI-Feedback: Zeige Grund warum Slot nicht verfügbar
- [ ] Admin-Dashboard: Visualisierung der Fahrlehrer-Routen
- [ ] Automatische Optimierung: Schlage optimale Standorte vor
- [ ] Multi-Standort-Buchung: Buche mehrere Termine mit optimaler Route
- [ ] Kosten-Berechnung: Berechne Fahrtkosten basierend auf Distanz

