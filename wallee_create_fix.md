# 🔧 Wallee CREATE Permissions Fix

## 🚨 **Problem identifiziert:**
```
READ-Operationen funktionieren ✅
CREATE-Operationen schlagen fehl ❌
```

Das bedeutet: Der Application User hat READ-Berechtigungen, aber keine CREATE-Berechtigungen für Transactions.

## 🔍 **Debug-Schritte:**

### **1. Permissions Test ausführen:**
```bash
# Gehen Sie zu: http://localhost:3002/wallee-test
# Klicken Sie auf "🔐 Test Permissions"
```

### **2. Application User Details prüfen:**
Der Test zeigt die Details des Application Users und welche Berechtigungen er hat.

## 🔧 **Lösungsschritte:**

### **1. Wallee Dashboard öffnen:**
```
https://app-wallee.com/
```

### **2. Application User finden:**
1. **Gehen Sie zu:** `Settings` → `Users` → `Application Users`
2. **Finden Sie User ID:** `140525`
3. **Klicken Sie auf den User**

### **3. CREATE-Berechtigungen hinzufügen:**
Der User braucht diese spezifischen CREATE-Berechtigungen:

#### **Minimum für Transaction-Erstellung:**
- ✅ `Transaction Create` (Hauptproblem!)
- ✅ `Payment Processing`
- ✅ `Space Admin` (für Space 82592)

#### **Optional für vollständige Funktionalität:**
- ✅ `Transaction Read`
- ✅ `Transaction Update`
- ✅ `Payment Method Read`

### **4. Alternative: Neuen User mit korrekten Berechtigungen erstellen:**
1. **Gehen Sie zu:** `Settings` → `Users` → `Application Users`
2. **Klicken Sie auf:** `Create Application User`
3. **Name:** `Driving Team API User`
4. **Berechtigungen setzen:**
   - ✅ `Account Admin`
   - ✅ `Space Admin` (für Space 82592)
   - ✅ `Payment Processing`
   - ✅ `Transaction Create` ← **WICHTIG!**

## 🧪 **Test nach Fix:**

### **1. Permissions Test:**
```bash
curl http://localhost:3002/api/wallee/test-permissions
```

### **2. Transaction Test:**
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

## 📋 **Erwartetes Ergebnis nach Fix:**

### **Permissions Test:**
```json
{
  "success": true,
  "message": "Application User found - checking permissions",
  "userDetails": {
    "id": "140525",
    "name": "API User",
    "state": "ACTIVE",
    "permissions": ["TRANSACTION_CREATE", "PAYMENT_PROCESSING"]
  },
  "hasReadPermission": true,
  "hasCreatePermission": true
}
```

### **Transaction Test:**
```json
{
  "success": true,
  "transactionId": "12345",
  "paymentUrl": "https://checkout.wallee.com/payment/...",
  "transaction": {
    "id": "12345",
    "state": "PENDING",
    "paymentUrl": "..."
  }
}
```

## 🎯 **Nächste Schritte:**

1. **Wallee Dashboard öffnen**
2. **Application User 140525 finden**
3. **CREATE-Berechtigungen hinzufügen**
4. **Oder neuen User mit korrekten Berechtigungen erstellen**
5. **Permissions Test ausführen**
6. **Transaction Test ausführen**

## ✅ **Status: CREATE-PERMISSIONS PROBLEM IDENTIFIZIERT**

Das Problem liegt definitiv bei den CREATE-Berechtigungen des Application Users. Die READ-Operationen funktionieren, aber CREATE-Operationen schlagen fehl.
