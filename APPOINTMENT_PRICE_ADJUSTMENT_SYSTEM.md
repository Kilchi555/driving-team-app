# Appointment Price Adjustment System

## Übersicht

Dieses System ermöglicht automatische Preisanpassungen bei Terminänderungen (Verlängerung/Verkürzung) und verwaltet negative Credits (Schulden).

## Features

### 1. Automatische Preisanpassung
- **Zeit reduziert** → Gutschrift auf `student_credits`
- **Zeit erhöht** → Belastung von `student_credits` (kann negativ werden)
- Alle Änderungen werden geloggt (Audit Trail)
- Email-Benachrichtigung an den Kunden

### 2. Negative Credits (Schulden)
- `student_credits.credits_rappen` kann negativ sein
- Negative Credits = Schulden des Kunden
- Werden automatisch bei der nächsten Zahlung verrechnet
- Sichtbar in allen UI-Komponenten (Dashboard, Payment-Flow)

### 3. Email-Benachrichtigungen
- **Gutschrift**: Freundliche Nachricht über Rückerstattung
- **Belastung**: Info über Mehrkosten und aktuelles Guthaben
- **Erinnerung**: Optional bei negativem Guthaben

---

## Installation

### 1. Datenbank-Migration ausführen

```sql
-- In Supabase SQL Editor
-- Datei: database_migration_price_adjustments.sql
```

**Was wird erstellt:**
- Tabelle `appointment_price_adjustments` (Tracking aller Anpassungen)
- Spalten in `appointments`:
  - `original_price_rappen` (ursprünglich bezahlter Preis)
  - `price_adjustment_rappen` (Summe aller Anpassungen)
- View `appointment_adjustment_summary` (Reporting)
- RLS Policies für sichere Zugriffe
- Trigger für automatische Updates

### 2. Code ist bereits deployed
Alle notwendigen Backend- und Frontend-Dateien sind im letzten Commit enthalten.

---

## API Endpoints

### POST `/api/appointments/update-duration-with-adjustment`

Ändert die Dauer eines Termins und passt Credits automatisch an.

**Request Body:**
```json
{
  "appointmentId": "uuid-hier",
  "newDurationMinutes": 60,
  "reason": "Student request - shorter lesson"
}
```

**Response:**
```json
{
  "success": true,
  "oldDuration": 90,
  "newDuration": 60,
  "adjustment": {
    "type": "credit",
    "amount": -4000,
    "oldPrice": 12000,
    "newPrice": 8000,
    "appliedToCredits": true
  }
}
```

---

## Verwendung

### Szenario 1: Termin von 90min auf 60min kürzen

```javascript
const response = await $fetch('/api/appointments/update-duration-with-adjustment', {
  method: 'POST',
  body: {
    appointmentId: 'abc-123',
    newDurationMinutes: 60,
    reason: 'Student had to leave early'
  }
})

// Credits werden automatisch gutgeschrieben
// Email wird automatisch gesendet
```

**Was passiert:**
1. ✅ Berechnung: 90min → 60min = -CHF 40 (Gutschrift)
2. ✅ Credits updated: +CHF 40 auf `student_credits`
3. ✅ Logging: Eintrag in `appointment_price_adjustments`
4. ✅ Email: Kunde erhält Bestätigung der Gutschrift

### Szenario 2: Termin von 45min auf 90min verlängern

```javascript
const response = await $fetch('/api/appointments/update-duration-with-adjustment', {
  method: 'POST',
  body: {
    appointmentId: 'xyz-789',
    newDurationMinutes: 90,
    reason: 'Extended lesson for exam preparation'
  }
})
```

**Was passiert:**
1. ✅ Berechnung: 45min → 90min = +CHF 80 (Belastung)
2. ✅ Credits updated: -CHF 80 von `student_credits` (kann negativ werden!)
3. ✅ Logging: Eintrag in `appointment_price_adjustments`
4. ✅ Email: Kunde wird über Mehrkosten informiert

**Wenn Credits vorher CHF 30 waren:**
- Neue Credits: CHF -50 (Schulden!)
- Bei nächster Zahlung werden CHF 50 zusätzlich verrechnet

### Szenario 3: Zahlung mit negativen Credits

Wenn ein Kunde CHF -50 Schulden hat und eine neue Lektion für CHF 100 bucht:

**Automatisch:**
1. ✅ Gesamtbetrag: CHF 150 (CHF 100 + CHF 50 Schulden)
2. ✅ Wallee-Transaction wird mit CHF 150 erstellt
3. ✅ In der Beschreibung steht: "Fahrlektion + Ausgleich offener Betrag (CHF 50.00)"
4. ✅ Nach erfolgreicher Zahlung werden Schulden auf CHF 0 zurückgesetzt

---

## UI-Komponenten

### 1. PriceDisplay.vue
Zeigt negatives Guthaben prominent an:

```html
<!-- Negatives Guthaben (Schulden) -->
<div class="bg-red-50 border border-red-200 rounded-lg p-3">
  <div class="flex justify-between items-center mb-1">
    <span class="text-sm font-medium text-red-700">⚠️ Offener Betrag</span>
    <span class="text-lg font-bold text-red-700">CHF 50.00</span>
  </div>
  <p class="text-xs text-red-600">
    Dieser Betrag wird bei dieser Zahlung automatisch verrechnet
  </p>
</div>
```

### 2. StudentCreditManager.vue
Zeigt Guthaben mit Farbe (grün = positiv, rot = negativ):

```html
<div class="text-2xl font-bold text-red-600">CHF -50.00</div>
<div class="text-sm text-gray-500">Offener Betrag</div>
<span class="bg-red-100 text-red-800">⚠️ Schulden</span>
```

### 3. EnhancedStudentModal.vue
Payment-Tab zeigt negatives Guthaben prominent:

```html
<div class="bg-gradient-to-r from-red-50 to-rose-50 border-red-200">
  <p class="text-red-700">⚠️ Offener Betrag</p>
  <p class="text-red-600">CHF 50.00</p>
  <p class="text-xs text-red-600">Wird bei nächster Zahlung verrechnet</p>
</div>
```

---

## Datenbank-Schema

### Tabelle: `appointment_price_adjustments`

| Spalte                     | Typ       | Beschreibung                          |
|----------------------------|-----------|---------------------------------------|
| id                         | UUID      | Primary Key                           |
| appointment_id             | UUID      | Termin-Referenz                       |
| old_duration_minutes       | INTEGER   | Alte Dauer                            |
| new_duration_minutes       | INTEGER   | Neue Dauer                            |
| old_price_rappen           | INTEGER   | Alter Preis (in Rappen)               |
| new_price_rappen           | INTEGER   | Neuer Preis (in Rappen)               |
| adjustment_amount_rappen   | INTEGER   | Differenz (negativ = Gutschrift)      |
| adjustment_type            | VARCHAR   | 'credit' oder 'charge'                |
| adjusted_by                | UUID      | Staff der die Änderung durchführte    |
| reason                     | TEXT      | Optionaler Grund                      |
| applied_to_credits         | BOOLEAN   | Wurde auf Credits angewendet?         |
| created_at                 | TIMESTAMP | Zeitstempel                           |

### Neue Spalten in `appointments`

| Spalte                   | Typ      | Beschreibung                              |
|--------------------------|----------|-------------------------------------------|
| original_price_rappen    | INTEGER  | Ursprünglich bezahlter Preis              |
| price_adjustment_rappen  | INTEGER  | Summe aller Anpassungen (auto-updated)    |

---

## Backend-Utilities

### `server/utils/appointment-price-adjustment.ts`

```typescript
// Preis-Differenz berechnen
calculatePriceAdjustment(appointmentId, newDurationMinutes)

// Anpassung anwenden (Updates Credits)
applyPriceAdjustment({ appointmentId, newDurationMinutes, adjustedBy, reason })

// Historie abrufen
getAdjustmentHistory(appointmentId)

// Negative Credits prüfen
checkNegativeCredits(userId)
```

### `server/utils/payment-with-negative-credits.ts`

```typescript
// Payment-Betrag mit Schulden berechnen
calculatePaymentWithDebt(userId, baseAmountRappen)

// Schulden nach Zahlung löschen
clearDebtAfterPayment(userId, paidDebtAmount)

// Beschreibung formatieren
formatPaymentDescriptionWithDebt(description, calculation)
```

### `server/utils/send-adjustment-notification.ts`

```typescript
// Email bei Preisanpassung senden
sendAdjustmentNotificationEmail({ userId, appointmentId, adjustment, oldDuration, newDuration })

// Erinnerung bei negativen Credits
sendNegativeCreditsReminderEmail(userId, debtAmount)
```

---

## Testing

### 1. Manuelle Tests

**Test 1: Termin verkürzen**
```bash
curl -X POST https://www.simy.ch/api/appointments/update-duration-with-adjustment \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "your-appointment-id",
    "newDurationMinutes": 30,
    "reason": "Test: Shortened lesson"
  }'
```

**Test 2: Negative Credits prüfen**
```sql
SELECT 
  u.first_name, 
  u.last_name, 
  sc.credits_rappen,
  CASE 
    WHEN sc.credits_rappen < 0 THEN 'HAS DEBT'
    ELSE 'OK'
  END as status
FROM users u
LEFT JOIN student_credits sc ON u.id = sc.user_id
WHERE sc.credits_rappen < 0;
```

**Test 3: Adjustment-Historie**
```sql
SELECT * FROM appointment_adjustment_summary
WHERE appointment_id = 'your-appointment-id';
```

### 2. UI Tests

1. **Dashboard öffnen** → Negatives Guthaben sollte rot angezeigt werden
2. **Neue Lektion buchen** → Schulden sollten automatisch zum Preis addiert werden
3. **Payment abschliessen** → Schulden sollten auf CHF 0 zurückgesetzt werden

---

## Troubleshooting

### Problem: Negative Credits werden nicht im Payment-Flow berücksichtigt

**Lösung:**
1. Check `server/api/wallee/create-transaction.post.ts` - Import korrekt?
2. Überprüfe Logs: `calculatePaymentWithDebt` sollte aufgerufen werden
3. Check Metadata in Wallee-Transaction:
   ```json
   {
     "debt_included": "true",
     "debt_amount_rappen": "5000",
     "base_amount_rappen": "10000"
   }
   ```

### Problem: Email-Benachrichtigungen werden nicht gesendet

**Lösung:**
1. Check Supabase Edge Function `send-email` existiert
2. Überprüfe Logs in `server/api/appointments/update-duration-with-adjustment`
3. Email-Fehler werden geloggt, aber brechen den Flow nicht ab

### Problem: Credits werden doppelt abgezogen

**Lösung:**
- `applyPriceAdjustment()` ist idempotent
- Check `appointment_price_adjustments` Tabelle für Duplikate
- Jede Anpassung sollte nur 1x geloggt sein

---

## Weitere Features (Optional)

### Automatische Reminder
Cron-Job der Kunden mit negativen Credits erinnert:

```typescript
// server/api/cron/send-negative-credits-reminders.ts
// Läuft täglich, sendet Email an Kunden mit Schulden > CHF 50
```

### Reporting
Dashboard für Admins:

```sql
-- View bereits vorhanden: appointment_adjustment_summary
SELECT 
  COUNT(*) as total_adjustments,
  SUM(CASE WHEN adjustment_type = 'credit' THEN 1 ELSE 0 END) as credits_given,
  SUM(CASE WHEN adjustment_type = 'charge' THEN 1 ELSE 0 END) as charges_made,
  SUM(total_credits) / 100.0 as total_refunded_chf,
  SUM(total_charges) / 100.0 as total_charged_chf
FROM appointment_adjustment_summary;
```

---

## Wichtige Hinweise

1. **Negative Credits sind erlaubt**: `student_credits.credits_rappen` hat KEINEN CHECK Constraint
2. **Schulden-Verrechnung ist automatisch**: Kein manuelles Eingreifen nötig
3. **Alle Änderungen werden geloggt**: Audit Trail in `appointment_price_adjustments`
4. **Emails sind optional**: Fehler beim Email-Versand brechen den Flow NICHT ab
5. **RLS ist aktiv**: Nur berechtigte Nutzer sehen ihre eigenen Daten

---

## Support

Bei Fragen oder Problemen:
1. Check Supabase Logs
2. Check Vercel Function Logs
3. SQL Query für Debugging: `SELECT * FROM appointment_price_adjustments WHERE appointment_id = 'xxx'`

