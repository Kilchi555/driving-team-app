# Wie testen wir die Speicherung von Zahlungsmethoden bei Wallee?

## 📋 Übersicht

Dieses Dokument erklärt, wie Sie überprüfen können, ob die Tokenization (Speicherung von Zahlungsmethoden) bei Wallee korrekt funktioniert.

---

## ✅ Schritt 1: Echtzahlung mit Tokenization durchführen

### Test-Szenario:
1. Ein Kunde bestätigt einen Termin über `/confirm/[token]`
2. Wenn kein Zahlungsmittel vorhanden ist, wird eine Wallee-Transaktion mit `tokenizationEnabled: true` erstellt
3. Nach erfolgreicher Zahlung sollte der Token automatisch gespeichert werden

### Was passiert:
- **Transaction Creation**: `/api/wallee/create-transaction` erstellt eine Transaktion mit `tokenizationEnabled: true`
- **After Payment**: Wallee sendet einen Webhook → `/api/webhooks/wallee-payment`
- **Token Storage**: `/api/wallee/save-payment-token` wird aufgerufen (via Webhook oder Return-URL)

---

## 🔍 Schritt 2: Datenbank prüfen

### SQL Query 1: Gespeicherte Zahlungsmethoden anzeigen

```sql
-- Alle gespeicherten Zahlungsmethoden für einen User
SELECT 
  cpm.id,
  cpm.user_id,
  cpm.wallee_token,
  cpm.wallee_customer_id,
  cpm.display_name,
  cpm.payment_method_type,
  cpm.is_default,
  cpm.is_active,
  cpm.created_at,
  cpm.metadata,
  u.email,
  u.first_name,
  u.last_name
FROM customer_payment_methods cpm
JOIN users u ON u.id = cpm.user_id
WHERE cpm.is_active = true
ORDER BY cpm.created_at DESC;
```

### SQL Query 2: Für einen spezifischen User

```sql
-- Ersetzen Sie 'USER_EMAIL' mit der E-Mail des Test-Kunden
SELECT 
  cpm.*,
  u.email,
  u.first_name || ' ' || u.last_name as customer_name
FROM customer_payment_methods cpm
JOIN users u ON u.id = cpm.user_id
WHERE u.email = 'USER_EMAIL'
  AND cpm.is_active = true;
```

### SQL Query 3: Anzahl gespeicherter Zahlungsmethoden pro User

```sql
SELECT 
  u.email,
  u.first_name || ' ' || u.last_name as customer_name,
  COUNT(cpm.id) as payment_methods_count,
  MAX(cpm.created_at) as last_method_added
FROM users u
LEFT JOIN customer_payment_methods cpm ON cpm.user_id = u.id AND cpm.is_active = true
WHERE u.role = 'client'
GROUP BY u.id, u.email, u.first_name, u.last_name
HAVING COUNT(cpm.id) > 0
ORDER BY last_method_added DESC;
```

### SQL Query 4: Prüfe ob Token mit Wallee Transaction verknüpft ist

```sql
-- Prüfe Payments und verknüpfte Zahlungsmethoden
SELECT 
  p.id as payment_id,
  p.wallee_transaction_id,
  p.payment_method,
  p.payment_method_id,
  cpm.wallee_token,
  cpm.wallee_customer_id,
  cpm.display_name,
  a.start_time as appointment_start,
  u.email as customer_email
FROM payments p
LEFT JOIN customer_payment_methods cpm ON cpm.id = p.payment_method_id
LEFT JOIN appointments a ON a.id = p.appointment_id
LEFT JOIN users u ON u.id = p.user_id
WHERE p.payment_method = 'wallee'
  AND p.created_at > NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC;
```

---

## 🔍 Schritt 3: Frontend prüfen

### Zahlungsmethoden-Seite:
1. Öffnen Sie: `/customer/payment-methods`
2. Es sollten alle gespeicherten Zahlungsmethoden angezeigt werden

### Bestätigungsseite:
1. Öffnen Sie: `/confirm/[token]` für einen Termin
2. Wenn ein Zahlungsmittel vorhanden ist, sollte es zur Auswahl angeboten werden

---

## 🔍 Schritt 4: Server-Logs prüfen

### Logs im Browser (Console):
Nach einer Zahlung sollten Sie folgende Logs sehen:

```
💳 Wallee: Saving payment method token...
🔍 Wallee transaction details: { id: ..., state: ..., ... }
✅ Found payment method token in transaction: [TOKEN]
✅ Payment method token saved: [ID]
```

### Server-Logs:
Prüfen Sie die Server-Logs für:

**1. Transaction Creation:**
```
🚀 Wallee Transaction Creation (SDK)...
🔑 Tokenization aktivieren - Wallee speichert Zahlungsmethoden automatisch
✅ Transaction created with ID: [ID]
```

**2. Token Storage:**
```
💳 Wallee: Saving payment method token...
✅ Found payment method token in transaction: [TOKEN]
✅ Payment method token saved: [ID]
```

**3. Webhook Processing:**
```
🔔 Wallee Webhook received
📨 Webhook payload: { entityId: ..., state: 'SUCCESSFUL', ... }
✅ Payment status updated to: completed
```

---

## 🔍 Schritt 5: Wallee Dashboard prüfen

### Im Wallee Portal:
1. Gehen Sie zu Ihrem Wallee Space Dashboard
2. Navigation: **Transactions** → Wählen Sie die Transaktion
3. Prüfen Sie:
   - **State**: Sollte `SUCCESSFUL` oder `FULFILL` sein
   - **Customer ID**: Sollte mit unserem `customerId` übereinstimmen
   - **Tokenization**: Sollte aktiviert sein (wenn `tokenizationEnabled: true` gesetzt war)

### Payment Method Token im Wallee Dashboard:
- Wallee speichert die Zahlungsmethoden pro Customer ID
- Die Token sind in der Transaction Response verfügbar
- Sie können nicht direkt im Dashboard eingesehen werden (Sicherheit)

---

## 🧪 Schritt 6: Test-Endpoint verwenden

### Manueller Test via API:

**1. Payment Token speichern (mit Transaction ID):**

```bash
curl -X POST http://localhost:3000/api/wallee/save-payment-token \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "WALLEE_TRANSACTION_ID",
    "userId": "USER_ID",
    "tenantId": "TENANT_ID"
  }'
```

**2. Response prüfen:**
```json
{
  "success": true,
  "tokenId": "UUID",
  "message": "Payment method token saved successfully"
}
```

**3. Oder wenn Token noch nicht verfügbar:**
```json
{
  "success": false,
  "message": "No payment method token available yet. Will be saved when available."
}
```

---

## ⚠️ Häufige Probleme und Lösungen

### Problem 1: Token wird nicht gespeichert

**Symptome:**
- `customer_payment_methods` Tabelle bleibt leer
- Log zeigt: `⚠️ No payment method token available yet`

**Lösungen:**
1. Prüfen Sie, ob `tokenizationEnabled: true` in der Transaction gesetzt wurde
2. Prüfen Sie, ob `customerId` konsistent ist (muss bei jeder Transaktion gleich sein)
3. Warten Sie auf den Webhook (manchmal dauert es ein paar Sekunden)
4. Prüfen Sie die Wallee Transaction im Dashboard → State muss `SUCCESSFUL` sein

### Problem 2: Token wird doppelt gespeichert

**Symptome:**
- Mehrere Einträge in `customer_payment_methods` für denselben User

**Lösungen:**
1. Der Code prüft bereits auf Duplikate via `wallee_token` und `user_id`
2. Prüfen Sie, ob Webhook und Return-URL beide den Token speichern
3. SQL Query zum Finden von Duplikaten:
```sql
SELECT 
  user_id,
  wallee_token,
  COUNT(*) as count
FROM customer_payment_methods
WHERE is_active = true
GROUP BY user_id, wallee_token
HAVING COUNT(*) > 1;
```

### Problem 3: Token wird nicht in Wallee-Response gefunden

**Symptome:**
- Log zeigt: `⚠️ Could not fetch payment method from Wallee API`

**Lösungen:**
1. Prüfen Sie die Transaction-Response direkt:
   ```typescript
   // In save-payment-token.post.ts wird die Response geloggt
   logger.debug('🔍 Wallee transaction details:', transaction)
   ```
2. Prüfen Sie, ob die Transaction wirklich erfolgreich war (`state === 'SUCCESSFUL'`)
3. Warten Sie ein paar Sekunden - Wallee braucht manchmal Zeit, um den Token zu generieren

---

## ✅ Checkliste für erfolgreiche Tokenization

- [ ] Transaction wurde mit `tokenizationEnabled: true` erstellt
- [ ] `customerId` ist konsistent (gleiche ID für denselben Kunden)
- [ ] Wallee Transaction State ist `SUCCESSFUL` oder `FULFILL`
- [ ] Eintrag in `customer_payment_methods` Tabelle existiert
- [ ] `wallee_token` Feld ist gefüllt (nicht NULL)
- [ ] `wallee_customer_id` entspricht dem `customerId` aus der Transaction
- [ ] Zahlungsmethode wird auf `/customer/payment-methods` angezeigt
- [ ] Zahlungsmethode kann bei der Terminbestätigung ausgewählt werden
- [ ] Automatische Abbuchung verwendet den gespeicherten Token korrekt

---

## 🔄 Monitoring und Automatisierung

### SQL Query für Monitoring (täglich):

```sql
-- Täglich: Neue Zahlungsmethoden der letzten 24 Stunden
SELECT 
  COUNT(*) as new_payment_methods,
  COUNT(DISTINCT user_id) as unique_customers,
  DATE_TRUNC('day', created_at) as date
FROM customer_payment_methods
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND is_active = true
GROUP BY DATE_TRUNC('day', created_at);
```

### Alert bei Fehlern:

Prüfen Sie Server-Logs auf:
- `❌ Error saving payment method token`
- `⚠️ No payment method token available yet` (häufig)

---

## 📞 Support

Falls die Tokenization nicht funktioniert:

1. **Wallee Support kontaktieren**: Prüfen Sie, ob Tokenization in Ihrem Wallee Space aktiviert ist
2. **Server-Logs prüfen**: Detaillierte Fehlermeldungen finden
3. **Transaction im Wallee Dashboard prüfen**: State und Details der Transaktion

