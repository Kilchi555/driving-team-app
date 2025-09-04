# 🔧 Wallee "Anonymous User" Problem - Debug Guide

## 🚨 **Problem: "Anonymous User" Fehler**

Wenn Sie den Fehler "anonymous user" von Wallee erhalten, bedeutet das, dass die Authentifizierung fehlschlägt. Hier ist eine systematische Lösung:

## 🔍 **Debug-Schritte:**

### 1. **Credentials Check**
```bash
# Gehen Sie zu: http://localhost:3002/wallee-test
# Klicken Sie auf "Check Credentials"
```

### 2. **Environment Variables prüfen**
```bash
# Stellen Sie sicher, dass diese Variablen gesetzt sind:
WALLEE_SPACE_ID=82592
WALLEE_APPLICATION_USER_ID=140525
WALLEE_SECRET_KEY=ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8=
```

### 3. **Connection Test**
```bash
# Testen Sie die Verbindung:
curl -X GET "https://app-wallee.com/api/space/read?spaceId=82592&id=82592" \
  -H "Authorization: Basic MTQwNTI1Olp0SkFQV2E0bjFHazg2bHJOYUFaVFhOZlAzZ3BLckFLc1NEUHFVdThSZTg9" \
  -H "Content-Type: application/json"
```

## 🔐 **Authentifizierung Debug:**

### **Base64 Auth String:**
```javascript
// User ID: 140525
// Secret Key: ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8=
// Auth String: 140525:ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8=
// Base64: MTQwNTI1Olp0SkFQV2E0bjFHazg2bHJOYUFaVFhOZlAzZ3BLckFLc1NEUHFVdThSZTg9
```

### **HTTP Headers:**
```javascript
{
  'Authorization': 'Basic MTQwNTI1Olp0SkFQV2E0bjFHazg2bHJOYUFaVFhOZlAzZ3BLckFLc1NEUHFVdThSZTg9',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

## 🛠️ **Lösungsansätze:**

### **1. Credentials überprüfen**
```bash
# Test-Endpunkt aufrufen:
curl http://localhost:3002/api/wallee/debug-credentials
```

### **2. Connection testen**
```bash
# Verbindung testen:
curl http://localhost:3002/api/wallee/test-connection
```

### **3. Auth testen**
```bash
# Authentifizierung testen:
curl -X POST http://localhost:3002/api/wallee/test-auth
```

### **4. Transaction testen**
```bash
# Transaction erstellen:
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

## 🔍 **Häufige Ursachen:**

### **1. Falsche Application User ID**
- ✅ Korrekt: `140525`
- ❌ Falsch: `140525 ` (mit Leerzeichen)

### **2. Falscher Secret Key**
- ✅ Korrekt: `ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8=`
- ❌ Falsch: `ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8` (ohne =)

### **3. Falsche Space ID**
- ✅ Korrekt: `82592`
- ❌ Falsch: `82592 ` (mit Leerzeichen)

### **4. User nicht autorisiert**
- Application User muss für den Space autorisiert sein
- User muss Transaction-Erstellung erlaubt haben

## 🧪 **Test-Seite:**

Gehen Sie zu: `http://localhost:3002/wallee-test`

1. **Check Credentials** - Prüft Environment Variables
2. **Test Connection** - Testet Space API
3. **Test Authentication** - Testet alle Auth-Endpunkte
4. **Create Test Transaction** - Erstellt echte Transaction

## 📋 **Debug-Logs:**

### **Erfolgreiche Authentifizierung:**
```
✅ Space API SUCCESS: { name: "Driving Team", state: "ACTIVE" }
✅ Application User API SUCCESS: { name: "API User", state: "ACTIVE" }
✅ Transaction API SUCCESS: { id: "12345", paymentUrl: "..." }
```

### **Fehlgeschlagene Authentifizierung:**
```
❌ Space API FAILED: { statusCode: 401, message: "Unauthorized" }
❌ Application User API FAILED: { statusCode: 404, message: "User not found" }
❌ Transaction API FAILED: { statusCode: 442, message: "Validation error" }
```

## 🎯 **Nächste Schritte:**

1. **Credentials prüfen** mit Debug-Seite
2. **Wallee Support kontaktieren** falls Credentials korrekt sind
3. **Space-Konfiguration** überprüfen
4. **User-Berechtigungen** in Wallee Dashboard prüfen

## ✅ **Status: DEBUG TOOLS BEREIT**

Die Debug-Tools sind implementiert und bereit zur Fehlersuche!
