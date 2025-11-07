# Schnell-Check: Tokenization Status prüfen

## 🚀 Server starten (falls nicht läuft)

```bash
npm run dev
# oder
yarn dev
```

## ✅ Transaction prüfen

### Transaction 428029614 (die Sie gerade sehen):

```bash
curl "http://localhost:3000/api/admin/check-transaction-token?transactionId=428029614"
```

Oder im Browser:
```
http://localhost:3000/api/admin/check-transaction-token?transactionId=428029614
```

### Ihre beiden fehlenden Payments:

```bash
# Transaction 427764506
curl "http://localhost:3000/api/admin/check-transaction-token?transactionId=427764506"

# Transaction 426798106
curl "http://localhost:3000/api/admin/check-transaction-token?transactionId=426798106"
```

## 📊 Was die Antwort bedeutet:

### Erfolg (Token kann gespeichert werden):
```json
{
  "diagnosis": {
    "tokenizationWasEnabled": true,
    "tokenShouldBeAvailable": true,
    "tokenIsAvailable": true,
    "canBeSaved": true
  },
  "hasPaymentMethodToken": true,
  "paymentMethodTokenPreview": "abc123..."
}
```

### Problem 1: Tokenization nicht aktiviert
```json
{
  "hasCustomerId": false,
  "diagnosis": {
    "tokenizationWasEnabled": false,
    "canBeSaved": false
  }
}
```
→ **Lösung:** Diese Transaction wurde ohne `customerId` oder `tokenizationEnabled` erstellt

### Problem 2: Token nicht verfügbar
```json
{
  "hasCustomerId": true,
  "hasPaymentMethodToken": false,
  "diagnosis": {
    "tokenizationWasEnabled": true,
    "tokenIsAvailable": false,
    "canBeSaved": false
  }
}
```
→ **Mögliche Ursachen:**
- Connector unterstützt keine Tokenization (selten)
- Token wurde noch nicht generiert (warten Sie ein paar Minuten)
- Transaction State war nicht erfolgreich

## 🔧 Wenn Token verfügbar ist: Speichern

Wenn `canBeSaved: true` ist, können Sie den Token speichern:

```bash
# Via Payment ID
curl -X POST "http://localhost:3000/api/admin/fix-missing-payment-tokens" \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "0a39c5ac-1785-4ef8-9f6f-7294562ef045"}'
```

