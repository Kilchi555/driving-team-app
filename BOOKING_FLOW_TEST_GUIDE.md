# Booking Flow Test Guide

## Vorbereitung

### 1. Storage Bucket File Limit prüfen (optional)
Das File-Limit sollte bereits auf 5MB gesetzt sein. Falls nicht:
```sql
-- In Supabase SQL Editor:
UPDATE storage.buckets 
SET file_size_limit = 5242880  -- 5MB in bytes
WHERE id = 'user-documents';
```

### 2. Test-Kategorie mit Dokument-Requirements
Stelle sicher, dass Kategorie A (Motorrad) aktiv ist und `document_requirements` hat:
```sql
SELECT 
  code, 
  name, 
  is_active,
  jsonb_pretty(document_requirements) as requirements
FROM categories 
WHERE code = 'A' 
AND tenant_id = (SELECT id FROM tenants WHERE slug = 'driving-team');
```

### 3. Test-Fahrlehrer mit Kategorie A
Stelle sicher, dass mindestens ein Fahrlehrer Kategorie A anbietet:
```sql
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.category
FROM users u
WHERE u.role = 'staff'
AND u.is_active = true
AND 'A' = ANY(u.category)
AND u.tenant_id = (SELECT id FROM tenants WHERE slug = 'driving-team');
```

### 4. Test-Standort mit Kategorie A
Stelle sicher, dass mindestens ein Standort Kategorie A anbietet:
```sql
SELECT 
  l.id,
  l.name,
  l.category_pickup_settings
FROM locations l
WHERE l.is_active = true
AND l.tenant_id = (SELECT id FROM tenants WHERE slug = 'driving-team')
AND l.category_pickup_settings ? 'A';  -- Hat Kategorie A Settings
```

## Test-Durchlauf

### Szenario 1: Neuer Kunde (ohne Account)

1. **Öffne Booking-Seite**
   ```
   http://localhost:3000/booking/availability/driving-team
   ```

2. **Wähle Kategorie A (Motorrad)**
   - Kategorie sollte in der Liste erscheinen
   - Klick auf Kategorie A

3. **Wähle Standort**
   - Nur Standorte mit Kategorie A sollten erscheinen
   - Wähle einen Standort (mit oder ohne Pickup)

4. **Wähle Fahrlehrer**
   - Nur Fahrlehrer mit Kategorie A sollten erscheinen
   - Wähle einen Fahrlehrer

5. **Wähle Termin**
   - Verfügbare Zeitslots sollten angezeigt werden
   - Wähle einen Zeitslot
   - Klick auf "Weiter"

6. **Pickup-Adresse (falls Pickup gewählt)**
   - Gib eine Adresse in der richtigen PLZ ein
   - Google Places Autocomplete sollte funktionieren
   - Adresse wird validiert
   - Klick auf "Buchung bestätigen"

7. **Login/Register Modal erscheint**
   - Tab "Registrieren" sollte aktiv sein
   - Fülle Formular aus:
     - Vorname: Max
     - Nachname: Mustermann
     - Email: test@example.com
     - Telefon: +41 79 123 45 67
     - Passwort: test123
   - Klick auf "Registrieren"

8. **Document Upload Modal erscheint**
   - Sollte "Lernfahrausweis Kategorie A" anzeigen
   - Upload-Bereiche für Vorder- und Rückseite
   - Lade 2 Test-Bilder hoch (JPG/PNG < 5MB)
   - Klick auf "Hochladen & Fortfahren"

9. **Redirect zu Payment-Seite**
   - Sollte zu `/customer/payment-process?payments={payment_id}` weiterleiten
   - Payment-Details sollten angezeigt werden
   - Status: "pending_confirmation"

### Szenario 2: Bestehender Kunde (mit Account, ohne Dokumente)

1. **Login als bestehender Kunde**
   ```
   http://localhost:3000/driving-team
   ```

2. **Öffne Booking-Seite**
   ```
   http://localhost:3000/booking/availability/driving-team
   ```

3. **Wähle Kategorie A**

4. **Wähle Standort, Fahrlehrer, Termin**

5. **Klick auf "Buchung bestätigen"**
   - Login Modal sollte NICHT erscheinen (bereits eingeloggt)
   - Document Upload Modal SOLLTE erscheinen (Dokumente fehlen)

6. **Lade Dokumente hoch**

7. **Redirect zu Payment-Seite**

### Szenario 3: Bestehender Kunde (mit Account UND Dokumenten)

1. **Login als Kunde mit hochgeladenen Dokumenten**

2. **Öffne Booking-Seite**

3. **Wähle Kategorie A**

4. **Wähle Standort, Fahrlehrer, Termin**

5. **Klick auf "Buchung bestätigen"**
   - Login Modal sollte NICHT erscheinen
   - Document Upload Modal sollte NICHT erscheinen
   - Direkt Redirect zu Payment-Seite

### Szenario 4: Kategorie ohne Dokument-Requirements (z.B. B)

1. **Öffne Booking-Seite**

2. **Wähle Kategorie B**

3. **Wähle Standort, Fahrlehrer, Termin**

4. **Klick auf "Buchung bestätigen"**
   - Falls nicht eingeloggt: Login Modal
   - Document Upload Modal sollte NICHT erscheinen (B hat "always" required = false)
   - Direkt Redirect zu Payment-Seite

## Erwartete Ergebnisse

### Datenbank

Nach erfolgreicher Buchung sollten folgende Einträge existieren:

```sql
-- Appointment
SELECT * FROM appointments 
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
ORDER BY created_at DESC LIMIT 1;

-- Payment
SELECT * FROM payments 
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
ORDER BY created_at DESC LIMIT 1;

-- Uploaded Documents
SELECT * FROM storage.objects 
WHERE bucket_id = 'user-documents'
AND name LIKE '%lernfahrausweise%'
ORDER BY created_at DESC LIMIT 5;
```

### Erwartete Werte

- **Appointment Status**: `pending_confirmation`
- **Payment Status**: `pending`
- **Payment scheduled_payment_date**: 24h vor Termin (basierend auf Tenant Settings)
- **Dokumente**: 2 Dateien im Storage (Vorder- und Rückseite)

## Fehlerbehandlung

### Mögliche Fehler und Lösungen

1. **"Kategorie nicht gefunden"**
   - Prüfe ob Kategorie A aktiv ist
   - Prüfe ob `document_requirements` korrekt gesetzt ist

2. **"Keine Standorte verfügbar"**
   - Prüfe ob Standorte `category_pickup_settings` für Kategorie A haben
   - Prüfe ob Standorte aktiv sind

3. **"Keine Fahrlehrer verfügbar"**
   - Prüfe ob Fahrlehrer Kategorie A in `category` Array haben
   - Prüfe ob Fahrlehrer aktiv sind

4. **"Upload fehlgeschlagen"**
   - Prüfe Storage Bucket Policies
   - Prüfe File Size Limit (sollte 10MB sein)
   - Prüfe allowed_mime_types

5. **"Payment nicht erstellt"**
   - Prüfe `event_types` Tabelle für `require_payment`
   - Prüfe `tenant_settings` für payment_settings

## Console Logs

Während des Tests sollten folgende Logs erscheinen:

```
🎯 Starting booking confirmation...
✅ User authenticated: {user_id}
✅ User data loaded: {user_data}
📄 Category requires documents: [{doc}]
❌ Missing documents: [{missing_docs}]
🔄 Creating appointment...
📝 Appointment data: {appointment_data}
✅ Appointment created: {appointment_id}
✅ Payment created: {payment_id}
```

## Cleanup nach Test

```sql
-- Lösche Test-Appointment
DELETE FROM appointments 
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');

-- Lösche Test-Payment
DELETE FROM payments 
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');

-- Lösche Test-User (optional)
DELETE FROM users WHERE email = 'test@example.com';

-- Lösche Test-Dokumente aus Storage
-- (Manuell im Supabase Dashboard unter Storage -> user-documents)
```

