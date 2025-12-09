# Pickup System - Setup Guide

## ✅ Was bereits erledigt ist:
- Distance Matrix API ist aktiviert
- Code ist implementiert
- Runtime Config ist konfiguriert

## 🚀 Nächste Schritte

### 1. SQL-Skripte ausführen

```bash
# Verbinde mit deiner Supabase Datenbank
# Option A: Via Supabase Dashboard SQL Editor
# Option B: Via psql

# Führe diese Skripte aus:
```

**Skript 1:** `update_plz_distance_cache_with_traffic.sql`
- Erweitert die `plz_distance_cache` Tabelle
- Fügt Peak/Offpeak Spalten hinzu

**Skript 2:** `add_category_pickup_settings_to_locations.sql`
- Fügt `category_pickup_settings` Spalte zu `locations` hinzu
- Migriert bestehende Pickup-Einstellungen (falls vorhanden)

### 2. Environment Variables setzen

Da du bereits `VITE_GOOGLE_MAPS_API_KEY` hast, wird dieser automatisch als Fallback verwendet!

**Optional:** Wenn du einen separaten Server-Side Key verwenden möchtest:

```bash
# Lokal (.env)
GOOGLE_MAPS_API_KEY=dein_api_key

# Vercel (Dashboard → Settings → Environment Variables)
GOOGLE_MAPS_API_KEY=dein_api_key
```

**Wichtig:** Wenn du keinen separaten Key setzt, wird automatisch `VITE_GOOGLE_MAPS_API_KEY` verwendet (bereits konfiguriert in `nuxt.config.ts`).

### 3. Standorte konfigurieren

1. Gehe zu: `/admin/users/[staff-id]`
2. Scrolle zu "Verfügbarkeit & Online-Terminbuchung"
3. Bearbeite jeden Standort:
   - Klicke auf "Bearbeiten" beim Standort
   - Für jede Kategorie:
     - ☑️ "Pickup für diese Kategorie" aktivieren
     - 🔢 Pickup-Radius eingeben (z.B. 15 Minuten)
   - Speichern

**Beispiel-Konfiguration:**

```
Standort: Zürich HB
├── Kategorie B
│   ├── ✅ Pickup aktiviert
│   └── 📍 Radius: 15 Min
├── Kategorie A
│   ├── ✅ Pickup aktiviert
│   └── 📍 Radius: 10 Min
└── Kategorie C
    ├── ❌ Pickup deaktiviert
    └── 📍 Radius: 0 Min
```

### 4. Testen

**Test 1: Booking Flow**
1. Gehe zu: `/booking/availability/[slug]`
2. Wähle eine Kategorie mit Pickup
3. Du solltest sehen: "Pickup-Service verfügbar!"
4. Gib eine PLZ ein (z.B. 8048)
5. Klicke "Prüfen"
6. Erwartetes Ergebnis:
   - ✅ "Pickup möglich! Fahrzeit: X Min" oder
   - ❌ "Ausserhalb des Pickup-Bereichs"

**Test 2: Cache-Funktionalität**
1. Prüfe die gleiche PLZ nochmal
2. In der Browser-Console sollte erscheinen:
   ```
   ✅ Cache hit: 8001 -> 8048 = 12 min (Offpeak)
   ```
3. Beim ersten Mal:
   ```
   🔄 Fetching travel time from Google: 8001 -> 8048
   ✅ Cached: 8001 -> 8048
      Offpeak: 12 min
      Peak: 18 min
   ```

**Test 3: Stosszeiten**
1. Teste mit verschiedenen Termin-Zeiten:
   - Montag 08:00 → sollte Peak Time verwenden
   - Montag 14:00 → sollte Offpeak verwenden
   - Samstag 08:00 → sollte Offpeak verwenden (Wochenende)

### 5. Monitoring

**Cache-Statistiken prüfen:**

```sql
-- Anzahl gecachte PLZ-Paare
SELECT COUNT(*) as total_cached_pairs FROM plz_distance_cache;

-- Letzte 10 Cache-Einträge
SELECT 
  from_plz,
  to_plz,
  driving_time_minutes_offpeak as offpeak_min,
  driving_time_minutes_peak as peak_min,
  distance_km,
  last_updated
FROM plz_distance_cache
ORDER BY last_updated DESC
LIMIT 10;

-- Durchschnittliche Zeitdifferenz Peak vs Offpeak
SELECT 
  AVG(driving_time_minutes_peak - driving_time_minutes_offpeak) as avg_peak_increase_min,
  ROUND(AVG((driving_time_minutes_peak::float / driving_time_minutes_offpeak - 1) * 100), 1) as avg_peak_increase_percent
FROM plz_distance_cache
WHERE driving_time_minutes_offpeak > 0;
```

## 🎯 Erwartete Ergebnisse

### Erfolgreicher Pickup-Check:
```
Pickup möglich! Wir können Sie an Ihrer Adresse abholen.
Fahrzeit: 12 Minuten

[Mit Pickup fortfahren →]
```

### Pickup ausserhalb Radius:
```
⚠️ Leider liegt Ihre Postleitzahl ausserhalb unseres Pickup-Bereichs.
Bitte wählen Sie einen festen Standort.
```

### Keine Pickup-Option für Kategorie:
```
(Pickup-Bereich wird nicht angezeigt)
→ Nur Standard-Standorte werden gezeigt
```

## 🐛 Troubleshooting

### Problem: "Google Maps API key not configured"

**Lösung:**
```bash
# Prüfe ob VITE_GOOGLE_MAPS_API_KEY gesetzt ist
echo $VITE_GOOGLE_MAPS_API_KEY

# Falls leer, setze in .env:
VITE_GOOGLE_MAPS_API_KEY=dein_api_key
```

### Problem: Pickup-Bereich wird nicht angezeigt

**Checkliste:**
1. ✅ Kategorie ausgewählt?
2. ✅ Mindestens ein Standort hat Pickup für diese Kategorie aktiviert?
3. ✅ `category_pickup_settings` Spalte existiert in DB?
4. ✅ Browser-Console für Fehler prüfen

**Debug:**
```javascript
// In Browser Console:
logger.debug('Selected Category:', selectedCategory.value)
logger.debug('Available Locations:', availableLocations.value)
logger.debug('Pickup Available:', isPickupAvailableForCategory.value)
```

### Problem: "Could not calculate travel time"

**Mögliche Ursachen:**
1. PLZ nicht gefunden (z.B. ausländische PLZ)
2. Keine Route verfügbar
3. Google API Rate Limit erreicht

**Lösung:**
- Prüfe PLZ-Format (4 Ziffern für Schweiz)
- Prüfe Google Cloud Console → APIs → Distance Matrix API → Quotas
- Prüfe Server-Logs für detaillierte Fehlermeldungen

### Problem: Falsche Fahrzeit angezeigt

**Debug:**
```sql
-- Prüfe Cache-Eintrag
SELECT * FROM plz_distance_cache
WHERE from_plz = '8001' AND to_plz = '8048';

-- Cache-Eintrag löschen und neu abrufen
DELETE FROM plz_distance_cache
WHERE from_plz = '8001' AND to_plz = '8048';
```

## 📊 Kosten-Monitoring

**Google Cloud Console:**
1. Gehe zu: [APIs & Services → Dashboard](https://console.cloud.google.com/apis/dashboard)
2. Wähle "Distance Matrix API"
3. Prüfe "Requests" Graph

**Erwartete Kosten:**
- Erste 1'000 verschiedene PLZ-Paare: ~$10
- Danach: $0 (Cache) ✅

**Tipp:** Setze ein Budget-Alert in Google Cloud:
1. Billing → Budgets & Alerts
2. Erstelle Budget (z.B. $50/Monat)
3. Alert bei 50%, 80%, 100%

## ✅ Checkliste

- [ ] SQL-Skripte ausgeführt
- [ ] Environment Variables gesetzt (oder Fallback verwendet)
- [ ] Mindestens 1 Standort mit Pickup konfiguriert
- [ ] Booking Flow getestet
- [ ] Cache-Funktionalität geprüft
- [ ] Stosszeiten-Logik getestet
- [ ] Monitoring eingerichtet

## 🎉 Fertig!

Das Pickup-System ist jetzt einsatzbereit. Kunden können bei der Terminbuchung ihre PLZ eingeben und sehen sofort, ob Pickup verfügbar ist.

**Nächste Schritte:**
- Informiere deine Fahrlehrer über die neue Funktion
- Aktualisiere ggf. deine Website/Marketing-Materialien
- Sammle Feedback von ersten Kunden

