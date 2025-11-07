# Fehlende Payment Method Tokens reparieren

## 🔍 Problem identifiziert

Zwei Payments haben keine gespeicherten Zahlungsmethoden:

1. **Payment ID:** `0a39c5ac-1785-4ef8-9f6f-7294562ef045`
   - Wallee Transaction: `427764506`
   - Created: 2025-11-01 11:10:39

2. **Payment ID:** `f16f19e8-4ed1-4606-bef4-63138120e7d1`
   - Wallee Transaction: `426798106`
   - Created: 2025-10-31 13:35:11

## ⚠️ Wichtig: Token nicht im Dashboard sichtbar

**Der Payment Method Token wird im Wallee Dashboard NICHT angezeigt!**

- Der Token ist nur via **Wallee API** verfügbar
- Verwenden Sie `/api/admin/check-transaction-token?transactionId=428029614` um zu prüfen ob ein Token verfügbar ist

---

## ✅ Lösung: Token nachträglich speichern

### Schritt 1: Prüfen ob Tokenization aktiviert war

Im Wallee Dashboard prüfen Sie:
1. Gehen Sie zu **Transactions** → Transaction ID (z.B. `427764506`)
2. Prüfen Sie:
   - **State**: Muss `SUCCESSFUL` oder `FULFILL` sein
   - **Customer ID**: Muss gesetzt sein (Format: `dt-...`)
   - **Tokenization**: War `tokenizationEnabled: true` gesetzt?

### Schritt 2: Token manuell speichern

#### Option A: Via API Endpoint (empfohlen)

```bash
# Für Payment 1
curl -X POST http://localhost:3000/api/admin/fix-missing-payment-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "0a39c5ac-1785-4ef8-9f6f-7294562ef045"
  }'

# Für Payment 2
curl -X POST http://localhost:3000/api/admin/fix-missing-payment-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "f16f19e8-4ed1-4606-bef4-63138120e7d1"
  }'
```

#### Option B: Direkt mit Transaction ID

```bash
# Wenn Sie User ID und Tenant ID kennen
curl -X POST http://localhost:3000/api/admin/fix-missing-payment-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "427764506",
    "userId": "77eec3f1-b894-4b09-8a63-f204e649779e",
    "tenantId": "YOUR_TENANT_ID"
  }'
```

---

## 🔍 Mögliche Ursachen

### 1. Tokenization nicht aktiviert

**Symptom:** Wallee Transaction hat kein `customerId` oder `tokenizationEnabled` war `false`

**Lösung:** 
- Token kann nicht nachträglich gespeichert werden
- Diese Payments können nur manuell verarbeitet werden
- Zukünftige Payments: Sicherstellen, dass `tokenizationEnabled: true` gesetzt wird

**Prüfung im Code:**
- `/api/wallee/create-transaction` sollte `transaction.tokenizationEnabled = true` setzen
- `/api/wallee/create-transaction` sollte `transaction.customerId` setzen (konsistent)

### 2. Token noch nicht verfügbar

**Symptom:** Transaction ist erfolgreich, aber Wallee hat noch keinen Token generiert

**Lösung:**
- Warten Sie ein paar Minuten und versuchen Sie erneut
- Prüfen Sie im Wallee Dashboard → Transaction Details
- Token sollte im `paymentMethodToken` Feld verfügbar sein

### 3. Webhook nicht verarbeitet

**Symptom:** Payment wurde erstellt, aber Webhook hat Token nicht gespeichert

**Lösung:**
- Webhook-Log prüfen: `/api/webhooks/wallee-payment`
- Prüfen ob `save-payment-token` API aufgerufen wurde
- Manuell via API aufrufen (siehe oben)

---

## 📊 SQL Query: Alle fehlenden Tokens finden

```sql
-- Finde alle Payments ohne gespeicherte Zahlungsmethode
SELECT 
  p.id as payment_id,
  p.wallee_transaction_id,
  p.user_id,
  u.email,
  p.created_at,
  CASE 
    WHEN p.created_at < NOW() - INTERVAL '1 hour' THEN '⚠️ Möglicher Fehler: Kein Token nach 1h'
    ELSE '⏳ Noch nicht verarbeitet (< 1h)'
  END as status
FROM payments p
LEFT JOIN users u ON u.id = p.user_id
LEFT JOIN customer_payment_methods cpm ON cpm.user_id = p.user_id AND cpm.is_active = true
WHERE p.payment_method = 'wallee'
  AND p.payment_status = 'completed'
  AND p.payment_method_id IS NULL
  AND p.created_at > NOW() - INTERVAL '30 days'
ORDER BY p.created_at DESC;
```

---

## ✅ Nach dem Reparieren prüfen

### 1. Datenbank prüfen:

```sql
-- Prüfe ob Token gespeichert wurde
SELECT 
  p.id as payment_id,
  p.payment_method_id,
  cpm.wallee_token IS NOT NULL as has_token,
  cpm.created_at as token_created
FROM payments p
LEFT JOIN customer_payment_methods cpm ON cpm.id = p.payment_method_id
WHERE p.id IN (
  '0a39c5ac-1785-4ef8-9f6f-7294562ef045',
  'f16f19e8-4ed1-4606-bef4-63138120e7d1'
);
```

### 2. Frontend prüfen:

- Gehen Sie zu `/customer/payment-methods` (als der betroffene User eingeloggt)
- Die Zahlungsmethode sollte angezeigt werden

---

## 🛠️ Automatische Reparatur für alle fehlenden Tokens

Wenn Sie alle fehlenden Tokens auf einmal reparieren möchten:

```bash
# Hole alle Payment IDs ohne Token (via SQL Query oben)
# Dann für jeden Payment:
for paymentId in "0a39c5ac-1785-4ef8-9f6f-7294562ef045" "f16f19e8-4ed1-4606-bef4-63138120e7d1"; do
  curl -X POST http://localhost:3000/api/admin/fix-missing-payment-tokens \
    -H "Content-Type: application/json" \
    -d "{\"paymentId\": \"$paymentId\"}"
  echo ""
done
```

---

## 🔧 Code-Verbesserungen für Zukunft

Um zu verhindern, dass Tokens in Zukunft nicht gespeichert werden:

### 1. Webhook verbessern:

In `/api/webhooks/wallee-payment.post.ts`:
- Sicherstellen, dass `save-payment-token` **immer** aufgerufen wird wenn:
  - `paymentStatus === 'completed'`
  - `wallee_transaction_id` vorhanden ist
  - `payment_method === 'wallee'`

### 2. Retry-Logik hinzufügen:

Falls Token nicht sofort verfügbar ist, nach 30 Sekunden erneut versuchen:

```typescript
// In save-payment-token.post.ts
if (!paymentMethodToken) {
  // Warte 30 Sekunden und versuche erneut
  await new Promise(resolve => setTimeout(resolve, 30000))
  // Erneut versuchen...
}
```

### 3. Monitoring:

Cron Job erstellen, der täglich prüft ob Payments ohne Tokens existieren und diese automatisch repariert.

---

## 📞 Support

Falls die Reparatur nicht funktioniert:

1. **Wallee Dashboard prüfen**: Ist die Transaction wirklich `SUCCESSFUL`?
2. **Server-Logs prüfen**: Was zeigt `/api/admin/fix-missing-payment-tokens`?
3. **Wallee Support kontaktieren**: Falls Token im Dashboard nicht sichtbar ist

