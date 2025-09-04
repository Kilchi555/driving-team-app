# 🔧 Wallee Header Fix - Korrekte HTTP-Request-Struktur

## 🚨 **Problem identifiziert:**
Das Problem lag an der HTTP-Request-Struktur, nicht an den Berechtigungen. Wallee Support hat das korrekte Format bereitgestellt.

## ✅ **Korrekturen implementiert:**

### **1. Content-Type Header:**
```javascript
// ❌ Vorher:
'Content-Type': 'application/json'

// ✅ Nachher:
'Content-Type': 'application/json;charset=utf-8'
```

### **2. Host Header hinzugefügt:**
```javascript
// ✅ Korrekte Headers:
headers: {
  'Authorization': `Basic ${auth}`,
  'Content-Type': 'application/json;charset=utf-8',
  'Accept': 'application/json',
  'Host': 'app-wallee.com'  // ← NEU HINZUGEFÜGT
}
```

### **3. Transaction Data Format:**
```javascript
// ✅ Korrektes Format (exakt wie Support Beispiel):
const transactionData = {
  lineItems: [{
    uniqueId: "order-test123",
    name: "Driving Team Bestellung",
    quantity: 1,
    amountIncludingTax: 95.00,
    type: "PRODUCT"
  }],
  currency: "CHF",
  customerId: "customer-test123",
  merchantReference: "order-test123",
  language: "de-CH",
  autoConfirmationEnabled: true,
  customerEmailAddress: "test@drivingteam.ch"
}
```

### **4. Optionale Felder:**
```javascript
// ✅ Nur hinzufügen wenn vorhanden:
if (successUrl) {
  transactionData.successUrl = successUrl
}
if (failedUrl) {
  transactionData.failedUrl = failedUrl
}
```

## 🧪 **Test der Korrekturen:**

### **1. Gehen Sie zu:** `http://localhost:3002/wallee-test`

### **2. Testen Sie die Endpunkte:**
```bash
# Credentials Check
curl http://localhost:3002/api/wallee/debug-credentials

# Connection Test
curl http://localhost:3002/api/wallee/test-connection

# Auth Test (mit korrigierten Headers)
curl -X POST http://localhost:3002/api/wallee/test-auth

# Transaction Test (mit korrigierten Headers)
curl -X POST http://localhost:3002/api/wallee/create-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-123",
    "amount": 10.00,
    "currency": "CHF",
    "customerEmail": "test@example.com",
    "customerName": "Test Customer",
    "description": "Test Transaction"
  }'
```

## 📋 **Korrekte HTTP-Request-Struktur:**

### **POST Request:**
```
POST /api/transaction/create?spaceId=82592 HTTP/1.1
Host: app-wallee.com
Authorization: Basic MTQwNTI1Olp0SkFQV2E0bjFHazg2bHJOYUFaVFhOZlAzZ3BLckFLc1NEUHFVdThSZTg5
Content-Type: application/json;charset=utf-8
Accept: application/json

{
  "lineItems": [{
    "uniqueId": "appointment-test123",
    "name": "Fahrstunde",
    "quantity": 1,
    "amountIncludingTax": 95.00,
    "type": "PRODUCT"
  }],
  "currency": "CHF",
  "customerId": "test-customer",
  "merchantReference": "appointment-test123",
  "language": "de-CH",
  "autoConfirmationEnabled": true,
  "customerEmailAddress": "test@drivingteam.ch"
}
```

## 🎯 **Erwartetes Ergebnis:**

Nach den Korrekturen sollten alle Tests erfolgreich sein:

```
✅ Space API SUCCESS: { name: "Driving Team", state: "ACTIVE" }
✅ Application User API SUCCESS: { name: "API User", state: "ACTIVE" }
✅ Transaction API SUCCESS: { id: "12345", paymentUrl: "..." }
```

## ✅ **Status: KORREKTUREN IMPLEMENTIERT**

Die HTTP-Request-Struktur wurde basierend auf dem Wallee Support Feedback korrigiert. Alle Endpunkte verwenden jetzt das korrekte Format!
