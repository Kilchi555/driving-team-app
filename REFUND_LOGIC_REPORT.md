# 📊 Rückvergütungs-Logik Bericht

## 🎯 Übersicht
Das System verarbeitet Rückvergütungen (Credits) bei Terminabsagen durch mehrere komplexe Logikpfade. Hier ist eine vollständige Analyse was alles berücksichtigt wird.

---

## 1️⃣ HAUPT-RÜCKVERGÜTUNGS-SZENARIEN

### Szenario A: STAFF CANCELLATION (Fahrlehrer sagt ab)
**Charge Percentage:** 0% (keine Verrechnung)
**shouldCreditHours:** true

#### Was wird berücksichtigt:

| Faktor | Wert | Beschreibung |
|--------|------|-------------|
| **originalLessonPrice** | ✅ | Vollständiger ursprünglicher Fahrstunden-Preis |
| **originalAdminFee** | ✅ | Vollständige ursprüngliche Admin-Gebühr |
| **chargePercentage** | 0% | Wird NICHT abgezogen |
| **credit_used_rappen** | ✅ | Falls Credits verwendet wurden - werden sie NICHT zurück gutgeschrieben (nur lesson+admin) |

**Beispiel:**
```
Termin: 45 min Fahrstunde
- Lesson Price: 100 CHF
- Admin Fee: 10 CHF
- Total Refund: 110 CHF → Guthaben

Wenn Guthaben verwendet wurde (z.B. 20 CHF):
- REFUND: 110 CHF (NICHT 110 + 20!)
- Das Guthaben wird nicht separat erstattet
```

---

### Szenario B: CUSTOMER CANCELLATION (Schüler sagt ab - kostenlos, >24h vor Termin)
**Charge Percentage:** 0% (keine Verrechnung)
**hoursUntilAppointment:** >= 24h

#### Was wird berücksichtigt:

| Faktor | Wert | Beschreibung |
|--------|------|-------------|
| **payment_status** | 'completed' | Wenn bezahlt wurde |
| **refundableAmount** | ✅ | Lesson + Admin Fee (nach Chargepercentage) |
| **credit_used_rappen** | ✅ | Verwendetes Guthaben wird SEPARAT zurück erstattet! |
| **balance_rappen** | ✅ | Aktuelles Guthaben wird addiert |

**Zwei-Schritt Prozess:**
1. Normale Refund: lesson_price + admin_fee
2. Zusätzlich: credit_used_rappen wird in separaten Transaktionen erstattet

---

### Szenario C: CUSTOMER CANCELLATION (Schüler sagt ab - Storno-Gebühr, <24h vor Termin)
**Charge Percentage:** z.B. 100% oder 50%
**hoursUntilAppointment:** < 24h

#### Was wird berücksichtigt:

| Faktor | Wert | Beschreibung |
|--------|------|-------------|
| **chargePercentage** | 50-100% | Wird vom Preis abgezogen |
| **payment_status** | various | Hängt von Zahlungsstatus ab |
| **credit_used_rappen** | ⚠️ KOMPLIZIERT | Siehe unten |
| **lesson_price_rappen** | ✅ | Nach Chargepercentage |
| **admin_fee_rappen** | ✅ | Nach Chargepercentage |

**Charge-Berechnung:**
```
Total = (lesson_price + admin_fee) * (chargePercentage / 100)

Beispiel: 100% Charge
- Lesson: 100 CHF
- Admin: 10 CHF
- Total: 110 CHF × 100% = 110 CHF Storno-Gebühr
- REFUND: 0 CHF
```

---

## 2️⃣ GUTHABEN-BEHANDLUNG (credit_used_rappen)

### Wichtig: Es gibt ZWEI Szenarien!

#### ✅ **SCENARIO 1: Payment existiert und ist COMPLETED/AUTHORIZED**

```typescript
// Aus handle-cancellation.post.ts
if (payment.credit_used_rappen > 0) {
  // ✅ Guthaben wird NICHT separat erstattet
  // Es wurde bereits beim Original-Payment verwendet
  // Nur: lesson_price + admin_fee wird erstattet (nach chargePercentage)
}
```

**Beispiel:**
```
Original Payment:
- Lesson: 100 CHF
- Admin: 10 CHF
- Credit Used: 20 CHF
- Customer Paid: 90 CHF (100 + 10 - 20)

Cancellation (50% Charge):
- Refund: (100 + 10) × 50% = 55 CHF
- Credit: NICHT separates!
- Neuer Balance: Alt_Balance + 55 CHF
```

#### ✅ **SCENARIO 2: Payment existiert aber ist PENDING/nicht bezahlt ODER kein Payment**

```typescript
// Aus cancel-customer.post.ts (Zeile 364-369)
if (payment.credit_used_rappen && payment.credit_used_rappen > 0) {
  // ✅ Guthaben wird SEPARAT erstattet in credit_transactions
  // Separate Transaktion für jeden Credit-Refund
}
```

**Beispiel:**
```
Pending Payment mit Credit:
- Lesson: 100 CHF
- Admin: 10 CHF
- Credit Used: 20 CHF
- Payment Status: pending

Cancellation (kostenlos):
- Refund 1: 100 + 10 = 110 CHF (normale Refund)
- Refund 2: 20 CHF (Guthaben separate!)
- Neuer Balance: Alt_Balance + 110 + 20 = Alt_Balance + 130 CHF
```

---

## 3️⃣ TRANSACTION RECORDING

### Was wird in `credit_transactions` gespeichert?

| Feld | Wert | Beispiel |
|------|------|---------|
| **user_id** | ✅ | UUID des Schülers |
| **transaction_type** | 'cancellation' oder 'refund' | Type hängt vom Kontext ab |
| **amount_rappen** | ✅ | Positive Zahl (Refund) |
| **balance_before_rappen** | ✅ | Altes Guthaben (z.B. 5000) |
| **balance_after_rappen** | ✅ | Neues Guthaben (z.B. 16500) |
| **payment_method** | 'refund' | Immer 'refund' bei Cancellations |
| **reference_id** | appointmentId | Link zum Termin |
| **reference_type** | 'appointment' | Typ des References |
| **created_by** | staffId | Wer die Absage gemacht hat |
| **notes** | string | "Rückerstattung für Terminabsage: Private Gründe (CHF 11.00)" |

---

## 4️⃣ PAYMENT RECORD UPDATE

### Was wird in der `payments` Tabelle aktualisiert?

```typescript
// Aus handle-cancellation.post.ts Zeile 479-498
{
  payment_status: 'refunded',                    // Status → refunded
  refunded_at: '2026-01-28T12:30:45.123Z',     // Refund-Timestamp
  notes: 'Refunded: Private Gründe (CHF 11.00)' // Audit Trail
}
```

---

## 5️⃣ APPOINTMENT RECORD UPDATE

### Was wird in der `appointments` Tabelle aktualisiert?

```typescript
// Nach markAppointmentCancelled() call
{
  status: 'cancelled',                          // → cancelled
  deleted_at: '2026-01-28T12:30:45.123Z',      // Soft delete timestamp
  deletion_reason: 'Termin abgesagt: ...',      // Reason für Audit
  credit_created: true                          // Flag dass Guthaben erstellt wurde
}
```

---

## 6️⃣ EDGE CASES & BESONDERHEITEN

### ❓ Edge Case 1: Kein Payment vorhanden (z.B. Staff created appointment)
```
Action: SKIP all refund logic
Result: Appointment einfach auf 'cancelled' setzen
        Kein Guthaben, keine Transaktionen
```

### ❓ Edge Case 2: Payment existiert aber appointment ist bereits cancelled
```
Action: SKIP (prevent duplicate refunds)
```

### ❓ Edge Case 3: Guthaben-Betrag ist negativ
```
Status: Should NOT happen, aber system erlaubt es
Risk: Schüler könnte zu viel Guthaben bekommen
```

### ❓ Edge Case 4: Force Charge Percentage defined
```
Die Absage-Grund kann force_charge_percentage definieren
Beispiel: "Verspätung" = immer 100% Charge
Override: Alle Normal-Regeln (24h Rule, etc.)
```

---

## 7️⃣ CHARGE PERCENTAGE MATRIX

| Situation | Default % | Override Möglich | Fahrlehrer entscheidet |
|-----------|-----------|------------------|----------------------|
| Staff absagt, egal wann | 0% | force_charge_percentage | ❓ Geplant: < 24h Dialog |
| Schüler > 24h | 0% | Storno-Richtlinie | Nein |
| Schüler < 24h | 100% | Storno-Richtlinie | ❌ Nein, automatisch |
| Schüler < 24h, custom reason | var % | force_charge_percentage | ✅ Ja, if no force % |

---

## 8️⃣ KRITISCHE PUNKTE ZUM PRÜFEN

### ⚠️ Problem 1: Credit-Doppel-Refund?
```
Risk: Falls credit_used_rappen zweimal erstattet wird
Status: FIXED - unterschiedliche Code-Paths für completed vs. pending
```

### ⚠️ Problem 2: Charge Percentage wird manchmal ignoriert?
```
Risk: chargePercentage = 0 bei Staff, aber customer sollte 100% haben
Status: OK - richtig implementiert
```

### ⚠️ Problem 3: Negative Student Credit?
```
Risk: Student könnte zu viel Refund bekommen
Schutz: Keine explizite Min/Max Kontrolle
Empfehlung: Limit prüfen
```

### ⚠️ Problem 4: Staff sieht nicht welcher Termin charged wird
```
Status: GEPLANT - Dialog für < 24h Staff cancellations
```

---

## 📋 SUMMARY TABELLE

### Alle Refund-Szenarien auf einen Blick

| # | Situation | Refund Amount | Credit Extra | Payment Status Change |
|---|-----------|---|---|---|
| 1 | Staff, kein Payment | 0 | - | - |
| 2 | Staff, completed | 100% lesson+admin | - | refunded |
| 3 | Customer > 24h, completed | 100% lesson+admin | + credit_used | refunded |
| 4 | Customer < 24h, completed | charge% | - | refunded / partial |
| 5 | Customer, pending | 0 | - | cancelled |
| 6 | Staff, pending | 0 | - | - |

---

## 🔄 FLOW DIAGRAM

```
Cancellation Request
    ↓
[Appointment geladen]
    ↓ markAppointmentCancelled() 
[Status → 'cancelled']
    ↓
[Payment vorhanden?]
    ├─ NEIN → Exit (fertig)
    └─ JA → Weiter
        ↓
    [Payment Status?]
        ├─ completed/authorized → Process Refund
        │   ├─ chargePercentage berechnen
        │   ├─ refundAmount = (lesson + admin) × charge% 
        │   ├─ Transaktion erstellen
        │   └─ Payment → 'refunded'
        │
        └─ pending → Handle Pending
            ├─ credit_used_rappen erstatten
            ├─ Payment → 'cancelled'
            └─ Optional: Charge für nächsten Termin
```

---

## 📞 FRAGEN ZUR KLÄRUNG

1. **Sollte negative Student Credit verhindert werden?**
   - Status: Keine explizite Validierung

2. **Sollte Charge-Dialog für Staff immer angeboten werden (<24h)?**
   - Status: Geplant, noch nicht voll implementiert

3. **Was wenn Termin > 1 year alt ist?**
   - Status: System prüft nicht - kann Refund erstellen

4. **Sind Tiefen-Refunds (negative amounts) erlaubt?**
   - Status: Theoretisch ja, aber sollte verhindert werden

---

**Report generiert:** 2026-01-28
**Letzter Code Review:** handle-cancellation.post.ts, cancel-customer.post.ts

