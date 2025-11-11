# Payment Flow Testing Guide

## Vorbereitung

### 1. Datenbank aufräumen
```sql
-- Lösche alle Test-Payments (VORSICHT: Nur in Test-Umgebung!)
DELETE FROM payments WHERE tenant_id = 'DEINE_TENANT_ID';
DELETE FROM appointments WHERE tenant_id = 'DEINE_TENANT_ID' AND created_at > NOW() - INTERVAL '1 day';

-- Prüfe dass alles leer ist
SELECT COUNT(*) FROM payments WHERE tenant_id = 'DEINE_TENANT_ID';
SELECT COUNT(*) FROM appointments WHERE tenant_id = 'DEINE_TENANT_ID' AND status = 'pending_confirmation';
```

### 2. Aktuelle Einstellungen prüfen
```sql
SELECT 
  setting_value->>'automatic_payment_hours_before' as payment_hours,
  setting_value->>'automatic_authorization_hours_before' as auth_hours
FROM tenant_settings
WHERE setting_key = 'payment_settings'
  AND tenant_id = 'DEINE_TENANT_ID';
```

**Erwartete Werte:**
- `payment_hours`: 24
- `auth_hours`: 168 (vor Fix) oder 72 (nach Fix)

---

## Test-Szenario 1: Kurzfristiger Termin (< 24h)

### Ziel
Testen, dass bei Terminen < 24h die Zahlung **sofort** erfolgt.

### Setup
- **Termin**: Heute + 12 Stunden (z.B. heute 22:00 wenn jetzt 10:00 ist)
- **Erwartung**: Sofortige Zahlung, keine Authorization Hold

### Schritte

1. **Termin erstellen**
   - Als Staff: Erstelle Termin für heute + 12h
   - Kunde: Max Mustermann
   - Preis: CHF 95.00

2. **Bestätigung senden**
   - System sendet Bestätigungs-Email
   - Email enthält Bestätigungs-Link

3. **Kunde bestätigt**
   - Klicke auf Bestätigungs-Link
   - System leitet zu Wallee weiter
   - **Erwartung**: Sofortige Zahlung (kein "Reserviert")

4. **Zahlung durchführen**
   - Wähle Zahlungsmittel (z.B. Kreditkarte)
   - Gib Daten ein
   - Bestätige Zahlung

5. **Prüfung in DB**
   ```sql
   SELECT 
     p.id,
     p.payment_status,
     p.scheduled_payment_date,
     p.scheduled_authorization_date,
     p.automatic_payment_consent,
     p.paid_at,
     a.start_time,
     EXTRACT(EPOCH FROM (a.start_time - NOW())) / 3600 as hours_until_appointment
   FROM payments p
   LEFT JOIN appointments a ON p.appointment_id = a.id
   WHERE p.user_id = 'TEST_USER_ID'
   ORDER BY p.created_at DESC
   LIMIT 1;
   ```

### ✅ Erwartetes Ergebnis

| Feld | Erwarteter Wert |
|------|-----------------|
| `payment_status` | `completed` |
| `scheduled_payment_date` | NULL oder NOW() |
| `scheduled_authorization_date` | NULL oder NOW() |
| `automatic_payment_consent` | false (weil sofort bezahlt) |
| `paid_at` | NOW() |

### 📊 UI Check

**Customer Dashboard:**
- ✅ Zahlung zeigt "Bezahlt" an
- ✅ Termin zeigt "Bestätigt" an
- ✅ Keine "Ausstehende Bestätigungen"

---

## Test-Szenario 2: Mittelfristiger Termin (24-72h)

### Ziel
Testen, dass Authorization und Capture korrekt zeitlich getrennt sind.

### Setup
- **Termin**: Heute + 48 Stunden (übermorgen, gleiche Zeit)
- **Erwartung**: 
  - Authorization: Sofort oder nach 24h (abhängig von `auth_hours`)
  - Capture: 24h vor Termin

### Schritte

1. **Termin erstellen**
   - Als Staff: Erstelle Termin für übermorgen
   - Kunde: Max Mustermann
   - Preis: CHF 95.00

2. **Kunde bestätigt**
   - Klicke auf Bestätigungs-Link
   - Wähle "Automatische Zahlung"
   - Gib Zahlungsdaten ein
   - **Erwartung**: Authorization erfolgt, aber nicht Capture

3. **Prüfung in DB (direkt nach Bestätigung)**
   ```sql
   SELECT 
     p.id,
     p.payment_status,
     p.scheduled_payment_date,
     p.scheduled_authorization_date,
     p.automatic_payment_consent,
     p.wallee_transaction_id,
     a.start_time,
     EXTRACT(EPOCH FROM (p.scheduled_payment_date - NOW())) / 3600 as hours_until_payment,
     EXTRACT(EPOCH FROM (p.scheduled_authorization_date - NOW())) / 3600 as hours_until_auth
   FROM payments p
   LEFT JOIN appointments a ON p.appointment_id = a.id
   WHERE p.user_id = 'TEST_USER_ID'
   ORDER BY p.created_at DESC
   LIMIT 1;
   ```

### ✅ Erwartetes Ergebnis (direkt nach Bestätigung)

| Feld | Erwarteter Wert |
|------|-----------------|
| `payment_status` | `authorized` |
| `scheduled_payment_date` | Termin - 24h |
| `scheduled_authorization_date` | NULL (bereits autorisiert) |
| `automatic_payment_consent` | true |
| `wallee_transaction_id` | Vorhanden |
| `hours_until_payment` | ~24h |

### 📊 UI Check (direkt nach Bestätigung)

**Customer Dashboard:**
- ✅ Status: "Reserviert"
- ✅ Text: "Wird am [Datum], [Zeit] final abgebucht"
- ✅ Betrag: CHF 95.00

### ⏰ Warten auf Cron Job (24h später)

**Nach 24h (oder manuell triggern):**
```bash
# Manuell Cron triggern (als Admin):
curl -X POST https://deine-app.vercel.app/api/cron/process-automatic-payments \
  -H "Authorization: Bearer DEIN_TOKEN"
```

### ✅ Erwartetes Ergebnis (nach Capture)

```sql
SELECT 
  p.id,
  p.payment_status,
  p.automatic_payment_processed,
  p.automatic_payment_processed_at,
  p.paid_at
FROM payments p
WHERE p.id = 'PAYMENT_ID'
```

| Feld | Erwarteter Wert |
|------|-----------------|
| `payment_status` | `completed` |
| `automatic_payment_processed` | true |
| `automatic_payment_processed_at` | NOW() |
| `paid_at` | NOW() |

---

## Test-Szenario 3: Langfristiger Termin (> 7 Tage)

### Ziel
Testen, dass Authorization Hold Time nicht zu lang ist.

### Setup
- **Termin**: Heute + 10 Tage
- **Erwartung**: 
  - Authorization: Erst 72h (3 Tage) vor Termin
  - Capture: 24h vor Termin

### Schritte

1. **Termin erstellen**
   - Als Staff: Erstelle Termin für heute + 10 Tage
   - Kunde: Max Mustermann
   - Preis: CHF 95.00

2. **Kunde bestätigt**
   - Klicke auf Bestätigungs-Link
   - Wähle "Automatische Zahlung"
   - Gib Zahlungsdaten ein

3. **Prüfung in DB (direkt nach Bestätigung)**
   ```sql
   SELECT 
     p.id,
     p.payment_status,
     p.scheduled_payment_date,
     p.scheduled_authorization_date,
     p.automatic_payment_consent,
     p.payment_method_id,
     a.start_time,
     EXTRACT(EPOCH FROM (p.scheduled_payment_date - NOW())) / 3600 as hours_until_payment,
     EXTRACT(EPOCH FROM (p.scheduled_authorization_date - NOW())) / 3600 as hours_until_auth,
     EXTRACT(EPOCH FROM (p.scheduled_payment_date - p.scheduled_authorization_date)) / 3600 as hold_hours
   FROM payments p
   LEFT JOIN appointments a ON p.appointment_id = a.id
   WHERE p.user_id = 'TEST_USER_ID'
   ORDER BY p.created_at DESC
   LIMIT 1;
   ```

### ✅ Erwartetes Ergebnis (direkt nach Bestätigung)

**Mit altem Setting (168h):**
| Feld | Erwarteter Wert |
|------|-----------------|
| `payment_status` | `pending` |
| `scheduled_payment_date` | Termin - 24h (~9 Tage) |
| `scheduled_authorization_date` | Termin - 168h (~3 Tage) |
| `automatic_payment_consent` | true |
| `payment_method_id` | Vorhanden (Token gespeichert) |
| `hold_hours` | ~144h (6 Tage) ⚠️ ZU LANG! |

**Mit neuem Setting (72h):**
| Feld | Erwarteter Wert |
|------|-----------------|
| `payment_status` | `pending` |
| `scheduled_payment_date` | Termin - 24h (~9 Tage) |
| `scheduled_authorization_date` | Termin - 72h (~7 Tage) |
| `automatic_payment_consent` | true |
| `payment_method_id` | Vorhanden (Token gespeichert) |
| `hold_hours` | ~48h (2 Tage) ✅ OK! |

### 📊 UI Check (direkt nach Bestätigung)

**Customer Dashboard:**
- ✅ Status: "Ausstehend" oder "Geplant"
- ✅ Text: "Wird am [Datum], [Zeit] reserviert"
- ✅ Text: "Wird am [Datum], [Zeit] final abgebucht"

### ⏰ Timeline für diesen Test

**Tag 0 (heute):**
- Termin erstellt
- Kunde bestätigt
- Token gespeichert
- Status: `pending`

**Tag 7 (3 Tage vor Termin):**
- Cron läuft
- Authorization erfolgt (CHF 95.00 reserviert)
- Status: `authorized`
- **Prüfe in Wallee:** Transaction sollte "AUTHORIZED" sein

**Tag 9 (24h vor Termin):**
- Cron läuft
- Capture erfolgt (CHF 95.00 abgebucht)
- Status: `completed`
- **Prüfe in Wallee:** Transaction sollte "FULFILL" oder "COMPLETED" sein

**Tag 10 (Termin):**
- Termin findet statt
- Alles bezahlt ✅

---

## Monitoring während Tests

### 1. Wallee Dashboard
- Gehe zu https://app-wallee.com
- Login
- Wähle Space
- Gehe zu "Transactions"
- Suche nach Transaction ID

**Prüfe:**
- State: PENDING → AUTHORIZED → FULFILL → COMPLETED
- Amount: CHF 95.00
- Customer: Max Mustermann

### 2. Supabase Logs
```sql
-- Zeige alle Payments des Test-Users
SELECT 
  p.id,
  p.payment_status,
  p.created_at,
  p.scheduled_authorization_date,
  p.scheduled_payment_date,
  p.automatic_payment_processed_at,
  p.paid_at,
  a.start_time,
  a.status
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
WHERE p.user_id = 'TEST_USER_ID'
ORDER BY p.created_at DESC;
```

### 3. Customer Dashboard
- Login als Kunde
- Gehe zu "Meine Zahlungen"
- Prüfe Status und Texte

---

## Troubleshooting

### Problem: Payment bleibt in "pending"

**Ursache:** Authorization Date ist in der Zukunft

**Lösung:** Warte oder trigger Cron manuell

### Problem: Payment bleibt in "authorized"

**Ursache:** Cron läuft nicht oder Capture Date ist in der Zukunft

**Lösung:**
1. Prüfe `scheduled_payment_date`
2. Trigger Cron manuell
3. Prüfe Vercel Cron Logs

### Problem: Payment failed

**Ursache:** Verschiedene Gründe

**Debug:**
```sql
SELECT 
  p.id,
  p.payment_status,
  p.metadata,
  p.wallee_transaction_id
FROM payments p
WHERE p.id = 'PAYMENT_ID';
```

Prüfe `metadata` für Fehlerdetails.

---

## Checkliste nach Tests

- [ ] Test 1 (< 24h): Sofortige Zahlung funktioniert
- [ ] Test 2 (24-72h): Authorization + Capture getrennt
- [ ] Test 3 (> 7 Tage): Hold-Time < 72h
- [ ] Cron Job läuft automatisch
- [ ] Wallee Transactions korrekt
- [ ] Customer Dashboard zeigt korrekte Infos
- [ ] Reminder Emails werden gesendet
- [ ] Token wird korrekt gespeichert

---

## SQL für schnelles Cleanup zwischen Tests

```sql
-- Lösche letztes Test-Payment
DELETE FROM payments 
WHERE user_id = 'TEST_USER_ID' 
  AND created_at > NOW() - INTERVAL '1 hour';

-- Lösche letzten Test-Termin
DELETE FROM appointments 
WHERE user_id = 'TEST_USER_ID' 
  AND created_at > NOW() - INTERVAL '1 hour';

-- Prüfe dass alles weg ist
SELECT COUNT(*) FROM payments WHERE user_id = 'TEST_USER_ID';
```

---

## Nach erfolgreichen Tests

1. ✅ **Dokumentiere Ergebnisse**
2. ✅ **Fix Authorization Hold Time** (168h → 72h)
3. ✅ **Setup Monitoring** für Production
4. ✅ **Vercel Cron aktivieren** (Pro Plan)
5. ✅ **Backup Cron** via cron-job.org

---

## Quick Reference: Wichtige Queries

```sql
-- Aktueller Payment Status
SELECT * FROM payments WHERE id = 'PAYMENT_ID';

-- Alle Payments eines Users
SELECT * FROM payments WHERE user_id = 'USER_ID' ORDER BY created_at DESC;

-- Überfällige Payments
SELECT * FROM payments 
WHERE payment_status = 'authorized' 
  AND scheduled_payment_date < NOW() 
  AND automatic_payment_processed = false;

-- Trigger Cron manuell (via curl)
curl -X POST https://app.vercel.app/api/cron/process-automatic-payments \
  -H "Authorization: Bearer TOKEN"
```

