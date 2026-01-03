# 🧪 TIER 1 API Testing - Quick Start Guide

## 📚 Dokumentation Übersicht

Wir haben 4 Testing-Dokumente erstellt:

| Dokument | Inhalt | Wann Lesen |
|----------|--------|-----------|
| **TIER1_API_QUICK_REFERENCE.md** | One-Page Cheat Sheet | Jederzeit als Quick Lookup |
| **TIER1_API_TESTING_CHECKLIST.md** | Step-by-Step mit Checkboxen | Während Testing (direkt folgen) |
| **TIER1_API_TESTING.md** | Detaillierte Erklärungen | Wenn etwas nicht funktioniert |
| **TIER1_API_SECURITY_COMPLETE.md** | Was wir gebaut haben | Nach Testing, für Dokumentation |

---

## ⚡ Super Quick Start (10 Minuten)

### 1. Terminal öffnen
```bash
cd /Users/pascalkilchenmann/driving-team-app

# Setze dein Token (von Browser Console kopieren):
export TOKEN="your_token_here"
export BASE_URL="http://localhost:3000"
```

### 2. Test 1 - check-transaction-token
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/check-transaction-token?transactionId=428029614"
# ✅ Sollte: {"success":true,"data":{...}}
```

### 3. Test 2 - fix-missing-payment-tokens
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "6db0ec32-6d04-410c-b3fe-9318d45166d1"}' \
  "$BASE_URL/api/admin/fix-missing-payment-tokens"
# ✅ Sollte: 200 OK oder 404 (je nachdem)
```

### 4. Test 3 - test-email-config
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/test-email-config"
# ✅ Sollte: {"success":true,"message":"..."}
```

### 5. Test 4 - test-smtp-config
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/test-smtp-config"
# ✅ Sollte: {"success":true,"message":"..."}
```

### 6. Test 5 - send-device-verification
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"04c1c7e1-2647-4848-a544-51716eef393f","deviceId":"test-id","userEmail":"test@example.com","deviceName":"Test"}' \
  "$BASE_URL/api/admin/send-device-verification"
# ✅ Sollte: {"success":true,"verificationLink":"..."}
```

### 7. Test 6 - Authentication (kein Token)
```bash
curl "$BASE_URL/api/admin/check-transaction-token?transactionId=428029614"
# ✅ Sollte: 401 Unauthorized
```

### 8. Test 7 - Rate Limiting
```bash
# 31x aufrufen (limit 30/min):
for i in {1..31}; do
  curl -s -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/admin/check-transaction-token?transactionId=428029614" | grep -o "success\|429"
done
# ✅ Letzte sollte: 429
```

---

## 🗂️ Docs die du brauchst

### Zum Testen direkt folgen:
👉 **TIER1_API_TESTING_CHECKLIST.md** (Step-by-Step)

### Zum Nachschlagen während Testing:
👉 **TIER1_API_QUICK_REFERENCE.md** (Schnelle Commands)

### Wenn etwas nicht funktioniert:
👉 **TIER1_API_TESTING.md** (Detaillierte Erklärungen)

### Nach Testing (für Reports):
👉 **TIER1_API_SECURITY_COMPLETE.md** (Was wir erreicht haben)

---

## ✅ Tests sind erfolgreich wenn:

```
✅ Alle 5 APIs antworten mit 200 OK
✅ Unauthentifizierte Requests geben 401
✅ Rate Limit triggert 429 nach X Requests
✅ Invalid Input gibt 400
✅ Audit Logs in DB sichtbar
```

---

## 📊 Was wird getestet?

```
Tier 1 APIs - 5 Tests pro API:

LAYER 1: Authentication ← Wird getestet ✅
LAYER 2: Authorization ← Wird getestet ✅
LAYER 3: Rate Limiting ← Wird getestet ✅
LAYER 4: Input Validation ← Wird getestet ✅
LAYER 5: Sanitization ← Wird getestet ✅
LAYER 6: Audit Logging ← Wird getestet ✅
LAYER 7: Error Handling ← Wird getestet ✅
```

---

## 🎯 Nächste Schritte nach Testing

**Wenn alle Tests GRÜN:**
1. ✅ TIER 1 fertig
2. ✅ Ready für TIER 2 (3 Medium-Risk APIs)
3. ✅ Ready für TIER 3 (2 Critical-Risk APIs)

**Wenn Tests ROT:**
1. ❌ Finde das Problem (siehe TIER1_API_TESTING.md)
2. ❌ Fix im Code
3. ❌ Restart Server
4. ❌ Re-test

---

## 🚀 Let's Go! 

Du brauchst nur:

```bash
# 1. Terminal + Token
export TOKEN="..."
export BASE_URL="http://localhost:3000"

# 2. TIER1_API_TESTING_CHECKLIST.md öffnen und folgen
# 3. Commands copy-paste
# 4. Check Ergebnisse

# 5. FERTIG! 🎉
```

---

*Ready zum Testen? 🧪*  
*Öffne TIER1_API_TESTING_CHECKLIST.md und starten Sie!*

