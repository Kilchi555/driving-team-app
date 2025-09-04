# 🔧 Wallee Permissions Fix - "Anonymous User" Problem

## 🚨 **Problem identifiziert:**
```
442 Transaction validation error: Permission denied for user Anonymous User. 
The user needs at least one of the following permissions: 
Root >> Account Admin >> Space >> Payment >> Payment Processing >> Transaction >> Create
```

## 🔧 **Lösungsschritte:**

### **1. Wallee Dashboard öffnen:**
```
https://app-wallee.com/
```

### **2. Application User Berechtigungen prüfen:**
1. **Gehen Sie zu:** `Settings` → `Users` → `Application Users`
2. **Finden Sie User ID:** `140525`
3. **Klicken Sie auf den User**
4. **Prüfen Sie die Berechtigungen**

### **3. Fehlende Berechtigungen hinzufügen:**
Der User braucht diese Berechtigungen:
- ✅ `Root` (Account Admin)
- ✅ `Space` (für Space 82592)
- ✅ `Payment` (Payment Processing)
- ✅ `Transaction` (Create)

### **4. Alternative: Neuen Application User erstellen:**
1. **Gehen Sie zu:** `Settings` → `Users` → `Application Users`
2. **Klicken Sie auf:** `Create Application User`
3. **Name:** `Driving Team API User`
4. **Berechtigungen setzen:**
   - ✅ `Account Admin`
   - ✅ `Space Admin` (für Space 82592)
   - ✅ `Payment Processing`
   - ✅ `Transaction Create`

### **5. Neue Credentials verwenden:**
```bash
# Neue Environment Variables setzen:
WALLEE_APPLICATION_USER_ID=<neue_user_id>
WALLEE_SECRET_KEY=<neuer_secret_key>
```

## 🧪 **Test nach Fix:**

### **1. Credentials testen:**
```bash
curl http://localhost:3002/api/wallee/debug-credentials
```

### **2. Connection testen:**
```bash
curl http://localhost:3002/api/wallee/test-connection
```

### **3. Auth testen:**
```bash
curl -X POST http://localhost:3002/api/wallee/test-auth
```

### **4. Transaction testen:**
```bash
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

## 📋 **Erforderliche Berechtigungen:**

### **Minimum für Transaction-Erstellung:**
- ✅ `Account Admin` (Root)
- ✅ `Space Admin` (für Space 82592)
- ✅ `Payment Processing`
- ✅ `Transaction Create`

### **Optional für vollständige Funktionalität:**
- ✅ `Transaction Read`
- ✅ `Transaction Update`
- ✅ `Payment Method Read`

## 🎯 **Nächste Schritte:**

1. **Wallee Dashboard öffnen**
2. **Application User 140525 finden**
3. **Berechtigungen prüfen und hinzufügen**
4. **Oder neuen User mit korrekten Berechtigungen erstellen**
5. **Neue Credentials in Environment Variables setzen**
6. **Test-Seite verwenden:** `http://localhost:3002/wallee-test`

## ✅ **Erwartetes Ergebnis nach Fix:**

```
✅ Space API SUCCESS: { name: "Driving Team", state: "ACTIVE" }
✅ Application User API SUCCESS: { name: "API User", state: "ACTIVE" }
✅ Transaction API SUCCESS: { id: "12345", paymentUrl: "..." }
```

Das Problem liegt definitiv bei den Wallee-Berechtigungen, nicht bei den Credentials!
