# Wallee Authorization Hold Time Limits

## Problem

Wallee/Kreditkarten haben Limits, wie lange eine Zahlung "reserviert" (authorized) werden kann, bevor sie captured (abgebucht) wird.

## Limits nach Zahlungsmittel

| Zahlungsmittel | Max. Authorization Hold Time |
|----------------|------------------------------|
| Visa/Mastercard | **7 Tage** |
| American Express | 30 Tage |
| Twint | Sofort (kein Hold) |
| PostFinance | Sofort (kein Hold) |
| PayPal | 29 Tage |

## Aktuelles Problem

**Deine Konfiguration:**
- `automaticAuthorizationHoursBefore` = **168 Stunden (7 Tage)**
- `automaticPaymentHoursBefore` = **24 Stunden**

**Szenario:**
1. Kunde bucht Termin für **17. Nov, 12:00**
2. Authorization erfolgt: **10. Nov, 12:00** (7 Tage vorher)
3. Capture soll erfolgen: **16. Nov, 12:00** (24h vor Termin)
4. **Hold-Zeit: 6 Tage** ✅ Knapp OK

**Problem-Szenario:**
1. Kunde bucht Termin für **20. Nov, 12:00**
2. Authorization erfolgt: **13. Nov, 12:00** (7 Tage vorher)
3. Capture soll erfolgen: **19. Nov, 12:00** (24h vor Termin)
4. **Hold-Zeit: 6 Tage** ✅ OK

**ABER:** Wenn der Kunde den Termin **8+ Tage im Voraus** bucht, wird die Authorization zu früh gemacht!

## ✅ Empfohlene Lösung

### Option 1: Reduziere Authorization Hold Time (EMPFOHLEN)

**Setze `automaticAuthorizationHoursBefore` auf max. 72 Stunden (3 Tage):**

```sql
-- Update tenant_settings
UPDATE tenant_settings
SET setting_value = jsonb_set(
  setting_value::jsonb,
  '{automatic_authorization_hours_before}',
  '72'
)
WHERE setting_key = 'payment_settings'
AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';
```

**Vorteile:**
- ✅ Sicher innerhalb aller Kreditkarten-Limits
- ✅ Reduziert Risiko von "Authorization Expired" Fehlern
- ✅ Bessere Erfolgsrate

**Nachteile:**
- ⚠️ Kunde kann theoretisch bis 3 Tage vor Termin absagen ohne Gebühr

### Option 2: Dynamische Authorization (KOMPLEX)

Autorisiere nur so früh wie nötig:

```typescript
// Berechne Authorization Date dynamisch
const maxHoldDays = 5 // Sicherheitsmargin
const authDate = new Date(
  Math.max(
    appointmentDate.getTime() - (maxHoldDays * 24 * 60 * 60 * 1000),
    now.getTime() + (1 * 60 * 60 * 1000) // Min. 1h in Zukunft
  )
)
```

### Option 3: Zwei-Stufen-Prozess (BESTE LÖSUNG)

1. **Sofortige Mini-Authorization (CHF 1.00)**
   - Validiert Zahlungsmittel
   - Wird sofort storniert
   - Keine Hold-Time

2. **Finale Authorization kurz vor Termin (48-72h)**
   - Voller Betrag
   - Kurze Hold-Time
   - Hohe Erfolgsrate

## 🚀 Quick Fix für Production

**Sofort umsetzbar:**

```sql
-- Reduziere auf 72 Stunden (3 Tage)
UPDATE tenant_settings
SET setting_value = jsonb_set(
  setting_value::jsonb,
  '{automatic_authorization_hours_before}',
  '72'
)
WHERE setting_key = 'payment_settings';

-- Prüfe aktuelle Einstellung
SELECT 
  tenant_id,
  setting_value->>'automatic_authorization_hours_before' as auth_hours,
  setting_value->>'automatic_payment_hours_before' as payment_hours
FROM tenant_settings
WHERE setting_key = 'payment_settings';
```

## 📊 Empfohlene Konfiguration

```json
{
  "automatic_payment_enabled": true,
  "automatic_payment_hours_before": 24,
  "automatic_authorization_hours_before": 72,  // ← ÄNDERUNG: von 168 auf 72
  "cash_payments_enabled": true,
  "cash_payment_visibility": "staff_only",
  "payment_deadline_type": "days_before",
  "payment_deadline_value": 24
}
```

## 🔍 Debugging

**Prüfe fehlgeschlagene Payments:**

```sql
SELECT 
  p.id,
  p.payment_status,
  p.wallee_transaction_id,
  p.scheduled_authorization_date,
  p.scheduled_payment_date,
  a.start_time as appointment_time,
  EXTRACT(EPOCH FROM (p.scheduled_payment_date - p.scheduled_authorization_date)) / 3600 as hold_hours,
  p.created_at,
  p.updated_at
FROM payments p
LEFT JOIN appointments a ON p.appointment_id = a.id
WHERE p.payment_status = 'failed'
  AND p.wallee_transaction_id IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 10;
```

## 📝 Wallee Error Codes

| Error | Bedeutung | Lösung |
|-------|-----------|--------|
| `TRANSACTION_CONFIRMED_BUT_NOT_PROCESSED` | Authorization zu alt | Reduziere Hold-Time |
| `AUTHORIZATION_EXPIRED` | Hold-Time überschritten | Reduziere Hold-Time |
| `INSUFFICIENT_FUNDS` | Nicht genug Geld | Kunde informieren |
| `CARD_DECLINED` | Karte abgelehnt | Andere Zahlungsmethode |

## 🎯 Action Items

1. ✅ **Sofort**: Reduziere `automatic_authorization_hours_before` auf 72h
2. 📊 **Monitoring**: Überwache Erfolgsrate der Authorizations
3. 🔄 **Optional**: Implementiere Zwei-Stufen-Prozess für bessere UX
4. 📧 **Kommunikation**: Informiere Kunden über Zahlungszeitpunkt

