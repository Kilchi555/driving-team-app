# 💳 Payment & Wallee Endpoints - Komplette Übersicht

## 🎯 Übersicht: Was macht jeder Endpoint?

---

## 1️⃣ **`/api/payments/process.post.ts`** 🔐
### "Hauptzahlungs-Verarbeitung"

**Was passiert:**
- Authentifizierter Benutzer initiiert eine Zahlung
- Erstellt ein Zahlungs-Datensatz in der DB
- Initiiert eine Wallee-Transaktion
- Gibt dem Frontend eine Zahlungs-URL zurück

**Wann wird es verwendet:**
- Wenn ein Kunde (Fahrschüler) einen Termin buchen möchte und bezahlen muss
- Normale Appointments mit Rechnungen

**Sicherheits-Layer:** 10 Layer (Auth, Rate Limiting, Validation, Tenant Isolation, RLS, etc.)

**Input:**
```typescript
{
  paymentId: "uuid-of-existing-payment",
  successUrl?: "https://...",
  failedUrl?: "https://..."
}
```

**Output:**
```typescript
{
  success: true,
  paymentId: "uuid",
  transactionId: 123456,
  paymentUrl: "https://payment-link.wallee.com",
  paymentStatus: "pending"
}
```

---

## 2️⃣ **`/api/payments/process-public.post.ts`** 🌐
### "Öffentliche Zahlungs-Verarbeitung für Course Enrollment"

**Was passiert:**
- Unauthenitifizierter Benutzer (Gast) möchte einen Kurs buchen
- Erstellt einen Zahlungs-Datensatz
- Initiiert eine Wallee-Transaktion
- Verlinkt mit `course_registrations` statt Appointments

**Wann wird es verwendet:**
- Course Enrollment (Kursbuchung)
- Öffentliche Kursbuchungsseite ohne Login

**Input:**
```typescript
{
  enrollmentId: "uuid-of-course-registration",
  amount: 50000,  // in Rappen (500 CHF)
  currency: "CHF",
  customerEmail: "john@example.com",
  customerName: "John Doe",
  courseId: "uuid",
  tenantId: "uuid",
  metadata: { course_name: "Fahrlektionen", ... }
}
```

---

## 3️⃣ **`/api/wallee/authorize-payment.post.ts`** 🔒
### "Provisorische Belastung / Authorization Hold"

**Was passiert:**
- Erstellt einen "AUTHORIZED" Status bei Wallee
- Das Geld wird **provisorisch blockiert** (nicht sofort abgebucht)
- Wird bei Terminbestätigung aufgerufen (wenn noch Zeit bis zum Termin ist)

**Wann wird es verwendet:**
- 24 Stunden vor einem Termin
- Um sicherzustellen, dass der Kunde genug Deckung hat
- Das Geld wird noch nicht endgültig abgebucht, nur reserviert

**Beispiel-Flow:**
```
1. Montag 10:00: Termin wird für Mittwoch 15:00 gebucht
2. Dienstag 15:00: Automatisch "authorize-payment" aufgerufen
3. Geld wird reserviert (noch nicht abgebucht!)
4. Mittwoch 14:50: Termin findet statt → Payment wird "captured" (endgültig abgebucht)
5. Falls Kunde absagt: Authorization wird gelöst, kein Geld abgebucht
```

**Input:**
```typescript
{
  paymentId: "uuid",
  userId: "uuid",
  tenantId: "uuid",
  appointmentStartTime: "2026-02-06T15:00:00Z",
  automaticPaymentHoursBefore: 24
}
```

---

## 4️⃣ **`/api/wallee/webhook.post.ts`** 🔔
### "Wallee Webhook - Payment Status Updates"

**Was passiert:**
- Wallee sendet Webhook zu uns, wenn Zahlungsstatus sich ändert
- Wir updaten den Status in unserer Datenbank
- Trigger automatische Aktionen basierend auf Status

**Wann wird es aufgerufen:**
- Nach jeder Statusänderung bei Wallee
- Z.B.: PENDING → AUTHORIZED → COMPLETED
- Oder: PENDING → FAILED

**Wallee Webhook Flow:**
```
1. Kunde klickt "Bezahlen"
   ↓
2. Wallee Payment Page öffnet
   ↓
3. Kunde gibt Kreditkarte ein
   ↓
4. Wallee verarbeitet Zahlung
   ↓
5. Wallee sendet Webhook zu /api/wallee/webhook
   {
     entityId: 123456,
     state: "COMPLETED",
     spaceId: 82592,
     timestamp: "2026-02-06T10:00:00Z"
   }
   ↓
6. Wir updaten Payment Status in DB
   ↓
7. Falls Course Enrollment: SARI Einschreibung wird automatisch triggered
```

**Status Mapping:**
```
PENDING → pending
AUTHORIZED → authorized (Geld reserviert)
COMPLETED → completed (Abgebucht)
FAILED → failed
CANCELED → cancelled
```

---

## 5️⃣ **`/api/payments/convert-to-online.post.ts`** 💱
### "Cash-Zahlung zu Online-Zahlung konvertieren"

**Was passiert:**
- Admin hatte einen Termin als "cash" eingetragen
- Kunde möchte jetzt online zahlen statt Bargeld
- Alte Wallee-Transaktion wird annulliert
- Neue Wallee-Transaktion wird erstellt

**Wann wird es verwendet:**
- Wenn ein Termin als "zu zahlen in bar" markiert war
- Kunde ändert seine Meinung und möchte online zahlen

**Flow:**
```
1. Payment hat status = "cash" oder payment_method = "cash"
2. Admin startet "Convert to Online"
3. Falls Wallee Transaction existiert → void (annullieren)
4. Neue Wallee Transaction wird erstellt
5. Kunde wird zur Zahlungsseite weitergeleitet
```

---

## 6️⃣ **`/api/student-credits/process-withdrawal-wallee.post.ts`** 💰
### "Guthaben-Auszahlung via Wallee Refund"

**Was passiert:**
- Kunde möchte sein Fahrlektionen-Guthaben auszahlen
- Wir erstellen eine Wallee **Refund** (Rückzahlung)
- Das Guthaben wird seinem Bankkonto zurückgebucht

**Wann wird es verwendet:**
- Kunde hat 1000 CHF Guthaben bei uns
- Möchte sein Geld zurück
- Wir buchen es via Wallee Refund auf sein Konto zurück

**Flow:**
```
1. Kunde: "Ich möchte mein 1000 CHF Guthaben zurück"
2. Admin/API: Withdraw-Request
3. Wir erstellen Wallee Refund
4. Wallee sendet Geld zurück zum Kunden
5. Guthaben wird in DB reduziert
6. Withdrawal wird als "completed" markiert
```

---

## 7️⃣ **`/api/payments/confirm-with-payment.post.ts`** ✅
### "Termin bestätigen + Zahlung durchführen"

**Was passiert:**
- Termin wird bestätigt
- Gleichzeitig wird eine Zahlung durchgeführt
- Beides passiert atomare (entweder beide erfolg oder beide fail)

**Wann wird es verwendet:**
- Termin bestätigung mit Zahlungsverarbeitung in einem Schritt

---

## 8️⃣ **`/api/payments/status.post.ts`** 📊
### "Zahlungsstatus abfragen"

**Was passiert:**
- Frontend fragt ab: "Wie ist der Status meiner Zahlung?"
- Wir geben den aktuellen Status zurück
- Optional mit Wallee-Transaktion Details

**Input:**
```typescript
{
  paymentId: "uuid",  // ODER
  transactionId: "wallee-transaction-id"
}
```

**Output:**
```typescript
{
  success: true,
  payment: {
    id: "uuid",
    payment_status: "completed",
    wallee_transaction_id: 123456,
    total_amount_rappen: 50000,
    paid_at: "2026-02-06T10:00:00Z"
  }
}
```

---

## 9️⃣ **`/api/wallee/save-payment-token.post.ts`** 🎫
### "Payment Token speichern"

**Was passiert:**
- Wallee gibt uns einen "Payment Token" (für wiederkehrende Zahlungen)
- Wir speichern diesen Token für zukünftige Zahlungen
- Kunde muss nicht jedes Mal Karte neu eingeben

**Wann wird es verwendet:**
- Wenn Kunde "Remember this card" anklickt
- Für automatische Zahlungen (z.B. monatliche Abos)

---

## 🔟 **`/api/wallee/authorize-payment.post.ts`** (bereits oben - wiederholung)

---

## 📋 Quick Reference - Welcher Endpoint für welchen Use-Case?

| Use-Case | Endpoint | Auth Required |
|----------|----------|----------------|
| Kunde bucht Termin + zahlt | `/payments/process` | ✅ Ja |
| Gast bucht Kurs + zahlt | `/payments/process-public` | ❌ Nein |
| 24h vor Termin: Geld reservieren | `/wallee/authorize-payment` | ✅ Ja |
| Status meiner Zahlung checken | `/payments/status` | ✅ Ja |
| Cash zu Online konvertieren | `/payments/convert-to-online` | ✅ Admin |
| Guthaben auszahlen | `/student-credits/process-withdrawal-wallee` | ✅ Ja |
| Zahlung bestätigen + durchführen | `/payments/confirm-with-payment` | ✅ Ja |
| Wallee sendet Webhook | `/wallee/webhook` | 🔔 Webhook |

---

## 🔄 Typischer Payment Flow - Schritt für Schritt

### **Szenario: Fahrschüler bucht Termin und zahlt online**

```
1. FRONTEND: Kunde klickt "Termin buchen + Zahlen"
   ↓
2. BACKEND: POST /api/payments/process
   - Erstellt Payment Record (status=pending)
   - Ruft Wallee API auf
   - Erhält Payment Link
   ↓
3. FRONTEND: Zeigt Payment Link an
   - Leitet zu Wallee Checkout weiter
   ↓
4. WALLEE: Kunde gibt Kreditkartendaten ein
   ↓
5. WALLEE: Sendet Webhook zu /api/wallee/webhook
   { entityId: 123456, state: "CONFIRMED" }
   ↓
6. BACKEND: Webhook Handler
   - Updated Payment Status in DB
   - Schedules authorize-payment (24h vor Termin)
   ↓
7. Nach 24 Stunden: Cron Job ruft /wallee/authorize-payment auf
   - Geld wird reserviert (authorization hold)
   ↓
8. Termin-Zeit kommt: Cron Job captured payment
   - Geld wird endgültig abgebucht
   ↓
9. Webhook kommt: state="COMPLETED"
   - Payment wird als "completed" markiert
   - Optional: SARI Enrollment wird ausgelöst (für Kurse)
```

---

## 🛡️ Sicherheitsfeatures in allen Endpoints

- ✅ **Authentication**: Alle außer `/process-public` und `/webhook` benötigen Auth
- ✅ **Rate Limiting**: Max. Anfragen pro Minute pro Benutzer
- ✅ **Tenant Isolation**: Benutzer können nur ihre eigenen Zahlungen sehen
- ✅ **Input Validation**: Alle Eingaben werden validiert
- ✅ **Audit Logging**: Alle wichtigen Aktionen werden geloggt
- ✅ **Wallet Secret Key**: Nur aus Environment, nie aus DB
- ✅ **Webhook Verification**: Wallee Webhooks werden verifiziert

---

## 🔌 Environment Variables (müssen gesetzt sein!)

```bash
WALLEE_SECRET_KEY=••••••••••••••••••••  # API Authentication
WALLEE_SPACE_ID=82592                   # Unser Wallee Space
WALLEE_APPLICATION_USER_ID=140525       # Wallee User ID
WALLEE_USER_ID=1                        # Default User (optional)
```

**Wenn diese NOT gesetzt sind → ❌ Zahlungen funktionieren nicht!**

