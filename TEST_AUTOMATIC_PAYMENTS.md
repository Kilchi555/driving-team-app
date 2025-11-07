# Test-Anleitung: Automatische Zahlungen

## Voraussetzungen

1. **Echter Staff-User** - Zum Erstellen von Terminen
2. **Mock Client-User** - Zum Testen der Bestätigung
3. **Automatische Zahlung aktiviert** - Im Admin-Profil (`/admin/profile`)
4. **Wallee-Zahlungsmittel** - Client muss ein Zahlungsmittel hinterlegt haben

---

## Test-Szenario 1: Normale automatische Zahlung (> 24h vor Termin)

### Schritt 1: Automatische Zahlung aktivieren (Admin)

1. Als **Admin** einloggen
2. Navigiere zu `/admin/profile`
3. Tab **"Zahlungen"** öffnen
4. **"Automatische Abbuchung aktivieren"** einschalten
5. **"Abbuchungszeitpunkt"** setzen (z.B. 24 Stunden)
6. Einstellungen werden automatisch gespeichert ✅

### Schritt 2: Termin erstellen (Staff)

1. Als **Staff** einloggen
2. Navigiere zum Kalender
3. Erstelle einen **neuen Termin**:
   - **Kunde**: Mock Client auswählen
   - **Datum**: Mindestens 48 Stunden in der Zukunft (z.B. übermorgen 14:00)
   - **Zahlungsmethode**: "Online-Zahlung" (Wallee) wählen
   - Termin speichern

### Schritt 3: Confirmation Token finden

**Option A: Via Supabase Dashboard**
```sql
SELECT 
  id, 
  confirmation_token, 
  status, 
  start_time,
  user_id
FROM appointments 
WHERE user_id = 'DEINE_MOCK_CLIENT_ID'
  AND status = 'pending_confirmation'
ORDER BY created_at DESC
LIMIT 1;
```

**Option B: Via Browser Console (nach Schritt 2)**
```javascript
// Im Browser-Console nach Termin-Erstellung:
// Token wird in console.log ausgegeben
```

### Schritt 4: Termin bestätigen (Mock Client)

1. Öffne Bestätigungsseite: `http://localhost:3000/confirm/[TOKEN]`
   - Ersetze `[TOKEN]` mit dem Token aus Schritt 3

2. Auf der Bestätigungsseite:
   - ✅ Termin-Infos prüfen (Datum, Zeit, Standort)
   - ✅ **"Automatische Abbuchung"** aktivieren
   - ✅ **Zahlungsmittel auswählen** (falls noch keines hinterlegt)
   - ✅ **"Termin bestätigen"** klicken

3. **Erwartetes Ergebnis**:
   - ✅ Termin wird auf `confirmed` gesetzt
   - ✅ Payment wird erstellt mit:
     - `payment_method = 'wallee'`
     - `automatic_payment_consent = true`
     - `scheduled_payment_date` = Termin - 24h
     - `payment_method_id` = ID des ausgewählten Zahlungsmittels

### Schritt 5: Payment prüfen

**Via Supabase SQL Editor:**
```sql
SELECT 
  id,
  appointment_id,
  payment_method,
  payment_status,
  automatic_payment_consent,
  automatic_payment_processed,
  scheduled_payment_date,
  payment_method_id,
  total_amount_rappen
FROM payments
WHERE appointment_id = 'APPOINTMENT_ID_FROM_STEP_2'
ORDER BY created_at DESC;
```

**Erwartete Werte:**
- `payment_method` = `'wallee'`
- `automatic_payment_consent` = `true`
- `automatic_payment_processed` = `false`
- `scheduled_payment_date` = Datum in der Zukunft (Termin - 24h)
- `payment_method_id` = UUID des Zahlungsmittels

### Schritt 6: Cron-Job manuell testen

1. Navigiere zu `/admin/test-automatic-payments` (wird erstellt)
2. Klicke **"Cron-Job ausführen"**
3. **Oder via API direkt:**
   ```bash
   curl -X POST http://localhost:3000/api/cron/process-automatic-payments \
     -H "x-api-key: DEIN_API_KEY" \
     -H "Content-Type: application/json"
   ```

**Erwartetes Ergebnis:**
- ✅ Payment wird nur verarbeitet, wenn `scheduled_payment_date <= now`
- ✅ Wenn Termin noch > 24h entfernt: Payment bleibt unverarbeitet
- ✅ Wenn Termin < 24h entfernt: Payment wird sofort verarbeitet

---

## Test-Szenario 2: Sofortige Zahlung (< 24h vor Termin)

### Schritt 1: Termin erstellen (wie oben)

**WICHTIG**: Termin-Datum **weniger als 24h** in der Zukunft setzen (z.B. morgen 14:00)

### Schritt 2: Termin bestätigen

1. Bestätigungsseite öffnen (wie oben)
2. Automatische Zahlung aktivieren
3. **"Termin bestätigen"** klicken

**Erwartetes Ergebnis:**
- ✅ Payment wird erstellt
- ✅ **Sofortige Zahlung wird ausgelöst** (nicht erst beim Cron-Job)
- ✅ Alert-Meldung: "Die Zahlung wurde sofort verarbeitet, da die Bestätigung weniger als 24 Stunden vor dem Termin erfolgte"

### Schritt 3: Payment prüfen

```sql
SELECT 
  id,
  automatic_payment_processed,
  payment_status,
  wallee_transaction_id,
  metadata->'immediate_payment_processing'
FROM payments
WHERE appointment_id = 'APPOINTMENT_ID';
```

**Erwartete Werte:**
- `automatic_payment_processed` = `true` (wenn erfolgreich)
- `payment_status` = `'completed'` oder `'pending'` (je nach Wallee-Status)
- `wallee_transaction_id` = ID der Wallee-Transaktion

---

## Test-Szenario 3: Zahlungsmethode Bar/Rechnung

### Schritt 1: Termin mit Bar-Zahlung erstellen

1. Als **Staff** Termin erstellen
2. **Zahlungsmethode**: "Bar" oder "Rechnung" wählen
3. Termin speichern

### Schritt 2: Termin bestätigen (Mock Client)

1. Bestätigungsseite öffnen
2. **Erwartetes Ergebnis**:
   - ⚠️ Warnung: "Automatische Zahlung nicht möglich: Zahlungsmethode wurde bereits auf 'Bar' gesetzt"
   - ✅ Termin wird trotzdem bestätigt
   - ❌ Kein Payment für automatische Zahlung erstellt

### Schritt 3: Payment prüfen

```sql
SELECT 
  payment_method,
  automatic_payment_consent,
  payment_method_id
FROM payments
WHERE appointment_id = 'APPOINTMENT_ID';
```

**Erwartete Werte:**
- `payment_method` = `'cash'` oder `'invoice'`
- `automatic_payment_consent` = `NULL` oder `false`
- `payment_method_id` = `NULL`

---

## Test-Szenario 4: Cron-Job mit fälligen Zahlungen

### Vorbereitung: Payment mit vergangenem scheduled_payment_date erstellen

**Via Supabase SQL:**
```sql
-- Finde ein Payment mit automatischer Zahlung
UPDATE payments
SET scheduled_payment_date = NOW() - INTERVAL '1 hour'
WHERE automatic_payment_consent = true
  AND automatic_payment_processed = false
  AND payment_method = 'wallee'
  AND payment_method_id IS NOT NULL
LIMIT 1;
```

### Schritt 1: Cron-Job ausführen

1. Navigiere zu `/admin/test-automatic-payments`
2. Klicke **"Cron-Job ausführen"**
3. Warte auf Ergebnis

**Erwartetes Ergebnis:**
```json
{
  "success": true,
  "processed": 1,
  "failed": 0,
  "message": "Processed 1 payment(s)"
}
```

### Schritt 2: Payment Status prüfen

```sql
SELECT 
  id,
  automatic_payment_processed,
  payment_status,
  wallee_transaction_id,
  metadata->'processing_result'
FROM payments
WHERE id = 'PAYMENT_ID_FROM_STEP_1';
```

**Erwartete Werte:**
- `automatic_payment_processed` = `true`
- `payment_status` = `'completed'` (wenn Wallee erfolgreich)
- `wallee_transaction_id` = ID der Wallee-Transaktion

---

## Test-Szenario 5: Termin nie bestätigt (nach Termin)

### Schritt 1: Termin erstellen

1. Termin mit Datum in der **Vergangenheit** erstellen (z.B. gestern)
2. **NICHT** bestätigen

### Schritt 2: Cron-Job ausführen

1. Navigiere zu `/admin/test-automatic-payments`
2. Cron-Job ausführen

**Erwartetes Ergebnis:**
- ⚠️ Kein Payment erstellt (Termin nie bestätigt)
- ⚠️ Falls Payment existiert aber Termin nicht bestätigt: Payment als fehlgeschlagen markiert

---

## Debugging & Prüfungen

### Wichtige SQL-Queries

**1. Alle fälligen Zahlungen finden:**
```sql
SELECT 
  p.id,
  p.appointment_id,
  p.payment_method,
  p.automatic_payment_consent,
  p.automatic_payment_processed,
  p.scheduled_payment_date,
  a.status as appointment_status,
  a.start_time,
  a.end_time
FROM payments p
JOIN appointments a ON p.appointment_id = a.id
WHERE p.automatic_payment_consent = true
  AND p.automatic_payment_processed = false
  AND p.payment_method = 'wallee'
  AND p.scheduled_payment_date <= NOW()
ORDER BY p.scheduled_payment_date ASC;
```

**2. Payment Method prüfen:**
```sql
SELECT 
  cpm.id,
  cpm.user_id,
  cpm.wallee_token,
  cpm.wallee_customer_id,
  cpm.is_active,
  cpm.display_name
FROM customer_payment_methods cpm
WHERE cpm.user_id = 'MOCK_CLIENT_ID'
  AND cpm.is_active = true;
```

**3. Confirmation Token finden:**
```sql
SELECT 
  id,
  confirmation_token,
  status,
  start_time,
  created_at
FROM appointments
WHERE user_id = 'MOCK_CLIENT_ID'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Häufige Probleme

### Problem 1: "Kein Zahlungsmittel gefunden"

**Lösung:**
1. Als Mock Client einloggen
2. Navigiere zu `/customer/payment-methods`
3. Zahlungsmittel hinzufügen (via Wallee)

### Problem 2: "Payment nicht erstellt"

**Lösung:**
- Prüfe ob `automatic_payment_enabled = true` in `tenant_settings`
- Prüfe Browser-Console auf Fehler
- Prüfe ob `payment_method = 'wallee'` beim Termin-Erstellen

### Problem 3: "Cron-Job findet keine Zahlungen"

**Lösung:**
- Prüfe ob `payment_method = 'wallee'` ✅
- Prüfe ob `scheduled_payment_date <= now` ✅
- Prüfe ob `automatic_payment_processed = false` ✅
- Prüfe ob `payment_method_id IS NOT NULL` ✅

---

## Erfolgs-Indikatoren

✅ **Termin-Bestätigung:**
- Appointment Status = `'confirmed'`
- Payment erstellt mit `automatic_payment_consent = true`

✅ **Sofortige Zahlung (< 24h):**
- Payment sofort verarbeitet
- `automatic_payment_processed = true`
- `wallee_transaction_id` vorhanden

✅ **Geplante Zahlung (> 24h):**
- Payment erstellt mit `scheduled_payment_date` in Zukunft
- Cron-Job verarbeitet Payment zur richtigen Zeit

✅ **Bar/Rechnung:**
- Keine automatische Zahlung
- Termin wird trotzdem bestätigt
- Payment mit `payment_method = 'cash'` oder `'invoice'`

