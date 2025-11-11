# Pickup System mit PLZ-basierter Distanzberechnung

## Übersicht

Das Pickup-System ermöglicht es Fahrlehrern, Kunden an deren Wunschadresse abzuholen, wenn diese innerhalb eines definierten Radius liegen. Die Distanzberechnung basiert auf Postleitzahlen (PLZ) und berücksichtigt Stosszeiten.

## Features

### 1. **Per-Category Pickup Settings**
- Jeder Standort kann für jede Kategorie individuell Pickup anbieten
- Beispiel: Standort "Zürich HB" bietet Pickup für Kategorie B (15 Min), aber nicht für Kategorie A

### 2. **PLZ-basierte Distanzberechnung**
- Verwendet Postleitzahlen statt vollständiger Adressen
- Reduziert Google API Calls durch intelligentes Caching
- Speichert sowohl Peak- als auch Offpeak-Zeiten

### 3. **Stosszeiten-Berücksichtigung**
- **Peak Times**: Mo-Fr 07:00-09:00 und 17:00-19:00
- **Offpeak Times**: Alle anderen Zeiten + Wochenende
- Automatische Auswahl basierend auf Termin-Zeit

## Datenbank-Schema

### `locations` Tabelle

```sql
ALTER TABLE locations
ADD COLUMN category_pickup_settings JSONB DEFAULT '{}';

-- Beispiel-Daten:
{
  "B": {
    "enabled": true,
    "radius_minutes": 15
  },
  "A": {
    "enabled": false,
    "radius_minutes": 0
  }
}
```

### `plz_distance_cache` Tabelle

```sql
CREATE TABLE plz_distance_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_plz VARCHAR(10) NOT NULL,
  to_plz VARCHAR(10) NOT NULL,
  driving_time_minutes INTEGER NOT NULL,
  driving_time_minutes_peak INTEGER,
  driving_time_minutes_offpeak INTEGER,
  distance_km DECIMAL(5,2),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_plz, to_plz)
);
```

## Konfiguration

### 1. **Standort-Konfiguration** (`/admin/users/[id]`)

Für jeden Fahrlehrer können Standorte mit Pickup-Einstellungen konfiguriert werden:

1. Standort hinzufügen/bearbeiten
2. Für jede Kategorie:
   - Checkbox: "Pickup für diese Kategorie"
   - Input: "Pickup-Radius (Minuten)"

### 2. **Google Maps API Key**

Setze den API Key in den Environment Variables:

```bash
GOOGLE_MAPS_API_KEY=your_api_key_here
```

**Benötigte API:**
- Distance Matrix API

**Kosten:**
- Erste Abfrage: 2 API Calls (Peak + Offpeak)
- Alle weiteren Abfragen: 0 API Calls (Cache)
- Cache-Gültigkeit: 30 Tage

## Verwendung

### Booking Flow (`/booking/availability/[slug]`)

**Step 1:** Kategorie auswählen

**Step 2:** Standort oder Pickup wählen
- Wenn Pickup verfügbar: PLZ-Eingabefeld wird angezeigt
- Kunde gibt PLZ ein und klickt "Prüfen"
- System prüft alle Standorte mit Pickup für diese Kategorie
- Zeigt Ergebnis an:
  - ✅ "Pickup möglich! Fahrzeit: 12 Min"
  - ❌ "Ausserhalb des Pickup-Bereichs"

**Step 3:** Fahrlehrer auswählen (wie gewohnt)

**Step 4:** Termin auswählen (wie gewohnt)

### API Endpoint

**POST** `/api/pickup/check-distance`

```typescript
// Request
{
  fromPLZ: "8001",
  toPLZ: "8048",
  appointmentTime: "2025-11-10T17:30:00Z"
}

// Response
{
  success: true,
  fromPLZ: "8001",
  toPLZ: "8048",
  travelTime: 18,  // Minuten (Peak Time)
  appointmentTime: "2025-11-10T17:30:00Z"
}
```

## Utility Functions

### `plzDistanceCache.ts`

```typescript
// Prüft ob eine Zeit in der Stosszeit liegt
isPeakTime(dateTime: Date): boolean

// Holt Fahrzeit aus Cache
getCachedTravelTime(fromPLZ: string, toPLZ: string, appointmentTime?: Date): Promise<number | null>

// Speichert Fahrzeit im Cache (ruft Google API auf)
cacheTravelTime(fromPLZ: string, toPLZ: string, googleApiKey: string): Promise<{ peak: number; offpeak: number } | null>

// Holt oder erstellt Cache-Eintrag
getTravelTime(fromPLZ: string, toPLZ: string, appointmentTime: Date, googleApiKey: string): Promise<number | null>
```

## Beispiel-Szenarien

### Szenario 1: Erster Request (Cache Miss)

**Kunde:** PLZ 8048, Termin Mo 17:30
**Standort:** PLZ 8001

1. System ruft Google API 2x auf:
   - Offpeak: 12 Min
   - Peak: 18 Min
2. Speichert beide Werte im Cache
3. Gibt zurück: 18 Min (Peak Time)
4. **Kosten:** 2 API Calls

### Szenario 2: Zweiter Request (Cache Hit)

**Kunde:** PLZ 8048, Termin Sa 14:00
**Standort:** PLZ 8001

1. System liest aus Cache
2. Gibt zurück: 12 Min (Offpeak, Wochenende)
3. **Kosten:** 0 API Calls ✅

### Szenario 3: Pickup-Prüfung mit mehreren Standorten

**Kunde:** PLZ 8610 (Uster)
**Kategorie:** B
**Verfügbare Standorte:**
- Zürich HB (8001): Pickup B, max 15 Min
- Winterthur (8400): Pickup B, max 20 Min

**Ergebnis:**
1. Prüft Zürich HB: 25 Min ❌ (zu weit)
2. Prüft Winterthur: 18 Min ✅ (innerhalb 20 Min)
3. Wählt Winterthur als Pickup-Standort

## Migration

### Schritt 1: Datenbank aktualisieren

```bash
# SQL-Skript ausführen
psql -f update_plz_distance_cache_with_traffic.sql
psql -f add_category_pickup_settings_to_locations.sql
```

### Schritt 2: Bestehende Pickup-Einstellungen migrieren

Wenn bereits `pickup_enabled` und `pickup_radius_minutes` in der DB sind:

```sql
UPDATE locations
SET category_pickup_settings = (
  SELECT jsonb_object_agg(
    category_code,
    jsonb_build_object(
      'enabled', TRUE,
      'radius_minutes', COALESCE(locations.pickup_radius_minutes, 10)
    )
  )
  FROM unnest(locations.available_categories) AS category_code
)
WHERE pickup_enabled = TRUE;
```

### Schritt 3: Environment Variables setzen

```bash
# .env
GOOGLE_MAPS_API_KEY=your_key_here
```

### Schritt 4: Standorte konfigurieren

1. Gehe zu `/admin/users/[staff-id]`
2. Bearbeite jeden Standort
3. Aktiviere Pickup für gewünschte Kategorien
4. Setze Pickup-Radius (z.B. 15 Min)

## Monitoring & Wartung

### Cache-Statistiken

```sql
-- Anzahl gecachte PLZ-Paare
SELECT COUNT(*) FROM plz_distance_cache;

-- Älteste Einträge (älter als 30 Tage)
SELECT * FROM plz_distance_cache
WHERE last_updated < NOW() - INTERVAL '30 days'
ORDER BY last_updated ASC;

-- Durchschnittliche Fahrzeit Peak vs Offpeak
SELECT 
  AVG(driving_time_minutes_offpeak) as avg_offpeak,
  AVG(driving_time_minutes_peak) as avg_peak,
  AVG(driving_time_minutes_peak - driving_time_minutes_offpeak) as avg_difference
FROM plz_distance_cache;
```

### Cache aufräumen

```sql
-- Alte Einträge löschen (älter als 90 Tage)
DELETE FROM plz_distance_cache
WHERE last_updated < NOW() - INTERVAL '90 days';
```

## Troubleshooting

### Problem: "Could not calculate travel time"

**Ursachen:**
1. Google API Key fehlt oder ungültig
2. PLZ nicht gefunden
3. Keine Route verfügbar

**Lösung:**
- Prüfe Environment Variables
- Prüfe Google Cloud Console (API aktiviert?)
- Prüfe PLZ-Format (4 Ziffern für Schweiz)

### Problem: Pickup wird nicht angezeigt

**Ursachen:**
1. Keine Kategorie ausgewählt
2. Kein Standort hat Pickup für diese Kategorie aktiviert
3. `category_pickup_settings` nicht geladen

**Lösung:**
- Prüfe `isPickupAvailableForCategory` computed property
- Prüfe DB: `SELECT category_pickup_settings FROM locations`
- Prüfe Console Logs

### Problem: Falsche Fahrzeit

**Ursachen:**
1. Cache veraltet
2. Peak/Offpeak-Logik fehlerhaft
3. PLZ falsch extrahiert

**Lösung:**
- Cache-Eintrag manuell löschen
- Prüfe `isPeakTime()` Funktion
- Prüfe `extractPLZFromAddress()` Funktion

## Zukünftige Erweiterungen

- [ ] Admin-UI für Cache-Management
- [ ] Automatische Cache-Aktualisierung (Cron Job)
- [ ] Pickup-Kosten berechnen (basierend auf Fahrzeit)
- [ ] Pickup-Historie & Statistiken
- [ ] Alternative Routen-Vorschläge
- [ ] Integration mit Echtzeit-Verkehrsdaten

