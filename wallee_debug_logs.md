# 🔍 Wallee Debug-Logs - Detaillierte HTTP-Request-Analyse

## ✅ **Implementiert: Offizielles Wallee SDK mit Debug-Logs**

Basierend auf dem Wallee Support Feedback haben wir das offizielle SDK-Format implementiert mit detaillierten Debug-Logs.

## 🔧 **Korrekturen implementiert:**

### **1. Offizielle Headers:**
```javascript
const headers = {
  'Authorization': `Basic ${auth}`,
  'Content-Type': 'application/json;charset=utf-8',  // ← Exakt wie SDK
  'Accept': 'application/json',
  'Host': 'app-wallee.com'  // ← Wichtig!
}
```

### **2. Offizielle Transaction Data:**
```javascript
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

### **3. Detaillierte Debug-Logs:**
```javascript
logger.debug('🔍 COMPLETE HTTP REQUEST DEBUG:')
logger.debug('🌐 URL:', url)
logger.debug('📤 METHOD:', 'POST')
logger.debug('📤 HEADERS:', JSON.stringify(headers, null, 2))
logger.debug('📤 BODY:', JSON.stringify(transactionData, null, 2))
logger.debug('🔐 AUTH STRING:', `${userId}:${secretKey}`)
logger.debug('🔐 BASE64 AUTH:', auth)
logger.debug('🔐 AUTH HEADER:', `Basic ${auth}`)
```

## 🧪 **Debug-Tests:**

### **1. Gehen Sie zu:** `http://localhost:3002/wallee-test`

### **2. Führen Sie diese Tests aus:**

#### **A. Debug Request Test:**
```bash
# Klicken Sie auf "🔍 Debug Request Test"
# Zeigt kompletten HTTP-Request mit Debug-Logs
```

#### **B. Transaction Test:**
```bash
# Klicken Sie auf "💳 Create Test Transaction"
# Verwendet offizielles SDK-Format
```

### **3. Server-Logs prüfen:**
```bash
# Schauen Sie in die Terminal-Ausgabe für detaillierte Debug-Logs
```

## 📋 **Erwartete Debug-Logs:**

### **Request Debug:**
```
🔍 COMPLETE HTTP REQUEST DEBUG:
🌐 URL: https://app-wallee.com/api/transaction/create?spaceId=82592
📤 METHOD: POST
📤 HEADERS: {
  "Authorization": "Basic MTQwNTI1Olp0SkFQV2E0bjFHazg2bHJOYUFaVFhOZlAzZ3BLckFLc1NEUHFVdThSZTg5",
  "Content-Type": "application/json;charset=utf-8",
  "Accept": "application/json",
  "Host": "app-wallee.com"
}
📤 BODY: {
  "lineItems": [{
    "uniqueId": "order-test123",
    "name": "Driving Team Bestellung",
    "quantity": 1,
    "amountIncludingTax": 95.00,
    "type": "PRODUCT"
  }],
  "currency": "CHF",
  "customerId": "customer-test123",
  "merchantReference": "order-test123",
  "language": "de-CH",
  "autoConfirmationEnabled": true,
  "customerEmailAddress": "test@drivingteam.ch"
}
🔐 AUTH STRING: 140525:ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8=
🔐 BASE64 AUTH: MTQwNTI1Olp0SkFQV2E0bjFHazg2bHJOYUFaVFhOZlAzZ3BLckFLc1NEUHFVdThSZTg5
🔐 AUTH HEADER: Basic MTQwNTI1Olp0SkFQV2E0bjFHazg2bHJOYUFaVFhOZlAzZ3BLckFLc1NEUHFVdThSZTg5
```

### **Success Response:**
```
✅ SUCCESS RESPONSE:
📥 Status: 200
📥 Response: {
  "id": "12345",
  "state": "PENDING",
  "paymentUrl": "https://checkout.wallee.com/payment/..."
}
```

### **Error Response:**
```
❌ ERROR RESPONSE:
📥 Status Code: 442
📥 Error Message: Validation error
📥 Error Data: {
  "message": "Permission denied for user Anonymous User",
  "errorCode": "PERMISSION_DENIED"
}
```

## 🎯 **Nächste Schritte:**

1. **Debug Request Test ausführen**
2. **Server-Logs kopieren**
3. **An Wallee Support senden mit:**
   - Kompletter HTTP-Request
   - Komplette Server-Antwort
   - Debug-Logs

## ✅ **Status: DEBUG-LOGS IMPLEMENTIERT**

Die detaillierten Debug-Logs sind implementiert und bereit für die Analyse durch den Wallee Support!
