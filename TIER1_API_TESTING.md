# TIER 1 API Testing Guide

## 🧪 Test Plan für alle 5 APIs

**Goal:** Verifizieren dass alle Security-Layer funktionieren  
**Environment:** localhost:3000  
**Setup:** Kurls + Manual Testing

---

## 📋 Pre-Test Checklist

Bevor wir starten, überprüfe:

```bash
# 1. Dev server läuft
# → http://localhost:3000 sollte erreichbar sein

# 2. Du hast gültiges Auth Token
# → Melde dich als super_admin an
# → Öffne Browser Console
# → Kopiere das access_token

# 3. Database audit_logs existiert
# → Sollte bereits da sein (migrations)
```

---

## 🔑 Test Setup: Token vorbereiten

### Schritt 1: Als super_admin anmelden
```
1. Gehe zu http://localhost:3000/login
2. Login als super_admin (wenn vorhanden)
   oder als beliebiger admin user
3. Öffne Browser DevTools → Console
4. Kopiere dein access_token:
   → Rechtsklick → "Inspect"
   → Application Tab
   → Cookies → supabase-auth-token
```

Oder schneller: Schau in den Browser localStorage:
```javascript
// In Browser Console:
localStorage.getItem('sb-unyjaetebnaexaflpyoc-auth-token')
// → Kopiere den "access_token" Wert
```

### Schritt 2: Environment-Variablen setzen
```bash
# In Terminal:
export TOKEN="your_access_token_here"
export BASE_URL="http://localhost:3000"
```

---

## 🧪 Test 1: check-transaction-token

**Endpoint:** `GET /api/admin/check-transaction-token?transactionId=428029614`  
**Purpose:** Prüft ob eine Wallee Transaction einen Token hat  
**Security Tests:**

```bash
# ✅ Test 1.1: Authentication Success
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/check-transaction-token?transactionId=428029614"

# Expected Response:
# { "success": true, "data": { ... } }

# ❌ Test 1.2: No Authentication (should fail)
curl "$BASE_URL/api/admin/check-transaction-token?transactionId=428029614"

# Expected: 401 Unauthorized

# ❌ Test 1.3: Wrong Role (if not admin)
# (Skip if du super_admin bist)

# ⚠️ Test 1.4: Rate Limiting (call 31 times)
for i in {1..31}; do
  curl -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/admin/check-transaction-token?transactionId=428029614"
done

# Expected on call 31: 429 Rate Limit Exceeded

# ❌ Test 1.5: Invalid Format (should fail)
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/check-transaction-token?transactionId=not-a-number"

# Expected: 400 Bad Request
```

---

## 🧪 Test 2: fix-missing-payment-tokens

**Endpoint:** `POST /api/admin/fix-missing-payment-tokens`  
**Purpose:** Speichert fehlende Payment Tokens nachträglich  
**Security Tests:**

```bash
# ✅ Test 2.1: Authorization - Super Admin only
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "6db0ec32-6d04-410c-b3fe-9318d45166d1"}' \
  "$BASE_URL/api/admin/fix-missing-payment-tokens"

# Expected: 200 with result (or 404 if payment not found)
# → Check if your token has super_admin role

# ❌ Test 2.2: No Authentication
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "6db0ec32-6d04-410c-b3fe-9318d45166d1"}' \
  "$BASE_URL/api/admin/fix-missing-payment-tokens"

# Expected: 401 Unauthorized

# ❌ Test 2.3: Invalid UUID Format
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "not-a-uuid"}' \
  "$BASE_URL/api/admin/fix-missing-payment-tokens"

# Expected: 400 Bad Request - Invalid paymentId format

# ⚠️ Test 2.4: Rate Limiting (call 11 times in 1 minute)
for i in {1..11}; do
  curl -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"paymentId": "6db0ec32-6d04-410c-b3fe-9318d45166d1"}' \
    "$BASE_URL/api/admin/fix-missing-payment-tokens"
done

# Expected on call 11: 429 Rate Limit Exceeded
```

---

## 🧪 Test 3: test-email-config

**Endpoint:** `GET /api/admin/test-email-config`  
**Purpose:** Testet Email-Konfiguration (SAFE - keine Test-User!)  
**Security Tests:**

```bash
# ✅ Test 3.1: Authentication + Super Admin
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/test-email-config"

# Expected:
# {
#   "success": true,
#   "message": "Email configuration test completed...",
#   "recommendations": [...]
# }

# ❌ Test 3.2: No Authentication
curl "$BASE_URL/api/admin/test-email-config"

# Expected: 401 Unauthorized

# ❌ Test 3.3: Non Super-Admin
# (Benötigst second user der nicht super_admin ist)
# → Sollte 403 geben

# ⚠️ Test 3.4: Rate Limiting (5/hour max)
# Call 6 times schnell hintereinander
for i in {1..6}; do
  curl -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/admin/test-email-config"
done

# Expected on call 6: 429 Rate Limit Exceeded
```

---

## 🧪 Test 4: test-smtp-config

**Endpoint:** `GET /api/admin/test-smtp-config`  
**Purpose:** Testet SMTP-Konfiguration (SAFE - keine Test-User!)  
**Security Tests:**

```bash
# ✅ Test 4.1: Authentication + Super Admin
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/test-smtp-config"

# Expected:
# {
#   "success": true,
#   "message": "SMTP configuration test completed...",
#   "recommendations": [...]
# }

# ❌ Test 4.2: No Authentication
curl "$BASE_URL/api/admin/test-smtp-config"

# Expected: 401 Unauthorized

# ⚠️ Test 4.3: Rate Limiting (5/hour max)
for i in {1..6}; do
  curl -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/admin/test-smtp-config"
done

# Expected on call 6: 429 Rate Limit Exceeded
```

---

## 🧪 Test 5: send-device-verification

**Endpoint:** `POST /api/admin/send-device-verification`  
**Purpose:** Sendet Device Verification Email  
**Security Tests:**

```bash
# Zuerst: Brauchen wir eine echte deviceId
# → Finde einen Benutzer mit Devices in der DB
# → Oder erstelle einen Test-Device

# ✅ Test 5.1: Valid Request
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "04c1c7e1-2647-4848-a544-51716eef393f",
    "deviceId": "your-device-uuid",
    "userEmail": "test@example.com",
    "deviceName": "iPhone 14"
  }' \
  "$BASE_URL/api/admin/send-device-verification"

# Expected: 200 OK
# {
#   "success": true,
#   "message": "Verification email sent",
#   "verificationLink": "...",
#   "expiresAt": "..."
# }

# ❌ Test 5.2: No Authentication
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"userId": "...", "deviceId": "...", ...}' \
  "$BASE_URL/api/admin/send-device-verification"

# Expected: 401 Unauthorized

# ❌ Test 5.3: Invalid UUID Format
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "not-a-uuid",
    "deviceId": "...",
    "userEmail": "test@example.com",
    "deviceName": "iPhone"
  }' \
  "$BASE_URL/api/admin/send-device-verification"

# Expected: 400 Bad Request

# ❌ Test 5.4: Invalid Email Format
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "04c1c7e1-2647-4848-a544-51716eef393f",
    "deviceId": "...",
    "userEmail": "not-an-email",
    "deviceName": "iPhone"
  }' \
  "$BASE_URL/api/admin/send-device-verification"

# Expected: 400 Bad Request

# ⚠️ Test 5.5: Dual Rate Limiting
# Per IP: 20/min
# Per User: 50/hour
for i in {1..21}; do
  curl -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{...}' \
    "$BASE_URL/api/admin/send-device-verification"
done

# Expected on call 21: 429 Rate Limit Exceeded (IP limit)
```

---

## 📊 Audit Logging Verification

Nach Tests, prüfe die Audit Logs in der Datenbank:

```sql
-- In Supabase SQL Editor:

-- 1. Alle Admin API Aufrufe anschauen
SELECT 
  user_id,
  action,
  resource_id,
  status,
  details,
  created_at
FROM audit_logs
WHERE action LIKE 'admin_%'
ORDER BY created_at DESC
LIMIT 50;

-- 2. Nur Success prüfen
SELECT * FROM audit_logs
WHERE action LIKE 'admin_%' AND status = 'success'
ORDER BY created_at DESC
LIMIT 20;

-- 3. Nur Errors prüfen
SELECT * FROM audit_logs
WHERE action LIKE 'admin_%' AND status = 'error'
ORDER BY created_at DESC;

-- 4. Rate Limit Errors (sollten KEINE in DB sein!)
SELECT * FROM audit_logs
WHERE status = 'error' AND error_message LIKE '%Rate limit%';
```

---

## ✅ Success Criteria

Alle Tests bestanden wenn:

| Kriterium | Status |
|-----------|--------|
| Authentifizierte Requests funktionieren | ✅ |
| Unauthentifizierte Requests geben 401 | ✅ |
| Admin-only APIs geben 403 für non-admins | ✅ |
| Rate Limits greifer nach X Requests | ✅ |
| Invalid Input gibt 400 | ✅ |
| Audit Logs in DB aufgezeichnet | ✅ |
| Response Format konsistent | ✅ |

---

## 🔍 Debugging bei Fehlern

### Problem: 401 Unauthorized
```
→ Token invalid oder abgelaufen
→ Versuche: localStorage.getItem('sb-...-auth-token')
→ Copy access_token erneut
```

### Problem: 403 Forbidden
```
→ Dein Benutzer hat nicht die richtige Role
→ Check: SELECT role FROM users WHERE id = '...'
→ Oder benutze einen super_admin Account
```

### Problem: Rate Limit nach weniger Requests
```
→ Redis/Cache-Key vielleicht nicht reset
→ Warte 1 Minute und versuche erneut
→ Oder restart Server
```

### Problem: Audit Log nicht in DB
```
→ Check: Existiert audit_logs Tabelle?
→ SELECT * FROM information_schema.tables WHERE table_name = 'audit_logs';
→ Wenn nicht: Führe Migrations aus
```

---

## 🚀 Quick Test Script (All-in-One)

Speichere als `test_tier1_apis.sh`:

```bash
#!/bin/bash

TOKEN=$1
BASE_URL=${2:-"http://localhost:3000"}

if [ -z "$TOKEN" ]; then
  echo "Usage: ./test_tier1_apis.sh YOUR_ACCESS_TOKEN [BASE_URL]"
  exit 1
fi

echo "🧪 Testing TIER 1 Admin APIs..."
echo "Token: ${TOKEN:0:20}..."
echo "Base URL: $BASE_URL"
echo ""

# Test 1
echo "1️⃣  Testing check-transaction-token..."
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/check-transaction-token?transactionId=428029614"
echo ""

# Test 2
echo "2️⃣  Testing fix-missing-payment-tokens..."
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "invalid"}' \
  "$BASE_URL/api/admin/fix-missing-payment-tokens"
echo ""

# Test 3
echo "3️⃣  Testing test-email-config..."
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/test-email-config"
echo ""

# Test 4
echo "4️⃣  Testing test-smtp-config..."
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/test-smtp-config"
echo ""

# Test 5
echo "5️⃣  Testing send-device-verification..."
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "invalid"}' \
  "$BASE_URL/api/admin/send-device-verification"
echo ""

echo "✅ All tests completed!"
```

Usage:
```bash
chmod +x test_tier1_apis.sh
./test_tier1_apis.sh "your_token_here"
```

---

*Testing Guide erstellt: 3. Januar 2026*

