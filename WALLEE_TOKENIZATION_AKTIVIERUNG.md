# Wie wird Tokenization bei Wallee aktiviert?

## ⚠️ Wichtig: Tokenization wird NICHT im Dashboard aktiviert!

**Tokenization wird im Code aktiviert**, nicht im Wallee Dashboard. Es gibt keine Einstellung im Wallee Dashboard für Tokenization.

---

## ✅ Wo wird Tokenization aktiviert?

### Im Code beim Erstellen der Transaction

Tokenization wird aktiviert, indem Sie beim Erstellen der Transaction folgenden Parameter setzen:

```typescript
const transaction: Wallee.model.TransactionCreate = new Wallee.model.TransactionCreate()
transaction.tokenizationEnabled = true  // ← DIESER PARAMETER aktiviert Tokenization
transaction.customerId = "konsistente-customer-id"  // ← WICHTIG: Muss gesetzt sein!
```

---

## ✅ In unserem Projekt

### Haupt-Endpoint: `/api/wallee/create-transaction`

**Status:** ✅ Tokenization ist bereits aktiviert!

```typescript
// server/api/wallee/create-transaction.post.ts
transaction.tokenizationEnabled = true  // Zeile 134
transaction.customerId = shortCustomerId  // Zeile 128
```

### Recurring Payments: `/api/wallee/create-recurring-transaction`

**Status:** ✅ Tokenization ist aktiviert!

---

## ❌ Wichtige Anforderungen für Tokenization

Damit Tokenization funktioniert, müssen **beide** Parameter gesetzt sein:

1. ✅ `tokenizationEnabled: true`
2. ✅ `customerId: "konsistente-id"` (muss für denselben Kunden immer gleich sein!)

### Warum `customerId` wichtig ist:

- Wallee speichert Zahlungsmethoden **pro Customer ID**
- Wenn jeder Payment eine andere `customerId` hat → Token kann nicht gespeichert werden
- Die `customerId` muss **konsistent** sein für denselben Kunden

### Unser Code generiert konsistente Customer IDs:

```typescript
// server/api/wallee/create-transaction.post.ts (Zeile 83-84)
const customerIdBase = customerEmail.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
const shortCustomerId = `dt-${customerIdBase}-${customerIdBase.length > 20 ? customerIdBase.substring(0, 20) : customerIdBase}`
```

**Beispiel:** 
- Email: `pascal_kilchenmann@icloud.com`
- Customer ID: `dt-pascalkilchenmannicloudcom-pascalkilchenmann`

---

## 🔍 Prüfen ob Tokenization aktiviert war

### Für eine bestehende Transaction:

Verwenden Sie unseren Check-Endpoint:

```bash
GET /api/admin/check-transaction-token?transactionId=428029614
```

Response zeigt:
- `hasCustomerId`: Ob `customerId` gesetzt war
- `hasPaymentMethodToken`: Ob ein Token verfügbar ist
- `diagnosis.canBeSaved`: Ob der Token gespeichert werden kann

### Im Code:

Server-Logs prüfen beim Erstellen der Transaction:

```
🔑 Transaction IDs generated: {
  customerId: "dt-pascalkilchenmannicloudcom-pascalkilchenmann",
  ...
}
✅ Tokenisierung aktivieren - Wallee speichert Zahlungsmethoden automatisch
```

---

## ⚠️ Häufige Probleme

### Problem 1: Tokenization nicht aktiviert

**Symptom:** Kein Token in Wallee Transaction Response

**Ursache:** `tokenizationEnabled` war nicht `true` oder `customerId` fehlte

**Lösung:** 
- Prüfen Sie den Code der Transaction-Erstellung
- Sicherstellen dass beide Parameter gesetzt sind

### Problem 2: Inconsistent Customer ID

**Symptom:** Token wird nicht gespeichert obwohl `tokenizationEnabled: true`

**Ursache:** Jede Transaction hat eine andere `customerId`

**Lösung:**
- Verwenden Sie eine konsistente Customer ID (z.B. basierend auf Email)
- Unsere Implementierung macht das bereits automatisch

### Problem 3: Connector unterstützt keine Tokenization

**Symptom:** Transaction erfolgreich, aber kein Token verfügbar

**Ursache:** Nicht alle Payment Connectors unterstützen Tokenization

**Info:**
- TWINT unterstützt Tokenization ✅
- Credit Cards unterstützen Tokenization ✅
- Einige andere Payment Methods unterstützen es möglicherweise nicht

---

## ✅ Checkliste für Tokenization

Beim Erstellen einer Transaction:

- [ ] `transaction.tokenizationEnabled = true` ist gesetzt
- [ ] `transaction.customerId` ist gesetzt (konsistent für denselben Kunden)
- [ ] Payment Connector unterstützt Tokenization
- [ ] Transaction State ist `SUCCESSFUL` oder `FULFILL` (Token nur bei erfolgreichen Zahlungen)

Nach erfolgreicher Zahlung:

- [ ] Webhook ruft `/api/wallee/save-payment-token` auf
- [ ] Token wird in `customer_payment_methods` Tabelle gespeichert
- [ ] Payment hat `payment_method_id` gesetzt

---

## 📖 Wallee Dokumentation

Laut Wallee:
- Token wird bei der **ersten Zahlung** initialisiert
- Für **wiederholte Zahlungen** ist keine Interaktion nötig
- Token wird für **Recurring Payments** verwendet
- Ob ein Token gespeichert werden kann, hängt vom **Connector** ab

**Wichtig:** Tokenization ist eine **per-Transaction** Einstellung, keine globale Einstellung im Wallee Space.

---

## 🔧 Prüfung für Ihre fehlenden Payments

Für die beiden fehlenden Payments können Sie prüfen:

```bash
# Transaction 427764506 prüfen
GET /api/admin/check-transaction-token?transactionId=427764506

# Transaction 426798106 prüfen  
GET /api/admin/check-transaction-token?transactionId=426798106
```

Wenn `hasCustomerId: false` → Tokenization war nicht aktiviert (fehlende `customerId` oder `tokenizationEnabled`)

Wenn `hasCustomerId: true` aber `hasPaymentMethodToken: false` → Tokenization war aktiviert, aber Connector hat keinen Token generiert oder Token noch nicht verfügbar

