# TIER 1 API Testing - Quick Start Checklist

## 🚀 Schritt 1: Vorbereitung (5 min)

- [ ] Dev Server läuft: http://localhost:3000
- [ ] Du bist als admin/super_admin angemeldet
- [ ] Browser Console offen
- [ ] Access Token kopiert (siehe unten)

### Token ermitteln:
```javascript
// In Browser Console eingeben:
const session = JSON.parse(localStorage.getItem('sb-unyjaetebnaexaflpyoc-auth-token'))
console.log(session.access_token)
// → Kopiere den Token
```

---

## 🧪 Schritt 2: Test 1 - check-transaction-token (5 min)

```bash
# Terminal öffnen und Token setzen:
TOKEN="dein_token_hier"
BASE_URL="http://localhost:3000"

# Test mit authentifizierung:
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/check-transaction-token?transactionId=428029614"

# Sollte sagen: { "success": true, "data": { ... } }
```

**Check:**
- [ ] Response mit `"success": true`
- [ ] Keine 401/403/500 Fehler
- [ ] `data` Objekt vorhanden

---

## 🧪 Schritt 3: Test 2 - fix-missing-payment-tokens (5 min)

```bash
# Test mit authentication:
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "6db0ec32-6d04-410c-b3fe-9318d45166d1"}' \
  "$BASE_URL/api/admin/fix-missing-payment-tokens"

# Sollte geben:
# - 200 mit success (payment existiert)
# - 404 wenn payment nicht existiert
# - 400 wenn invalid format
```

**Check:**
- [ ] Response mit Status 200 oder 404
- [ ] Keine 403 (wenn sollte super_admin sein!)
- [ ] Keine 401 Fehler

---

## 🧪 Schritt 4: Test 3 - test-email-config (2 min)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/test-email-config"

# Sollte geben: { "success": true, "message": "...", "recommendations": [...] }
```

**Check:**
- [ ] `"success": true`
- [ ] Response hat `recommendations` Array
- [ ] Keine 401/403 Fehler

---

## 🧪 Schritt 5: Test 4 - test-smtp-config (2 min)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/test-smtp-config"

# Sollte geben: { "success": true, ... }
```

**Check:**
- [ ] `"success": true`
- [ ] Response hat `supabaseServiceRoleStatus: 'Connected'`
- [ ] Keine 401/403 Fehler

---

## 🧪 Schritt 6: Test 5 - send-device-verification (5 min)

```bash
# Brauchen wir eine gültige device ID
# → Schaue in Database nach einem Device

# Test mit gültiger Device:
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "04c1c7e1-2647-4848-a544-51716eef393f",
    "deviceId": "your-device-uuid",
    "userEmail": "test@example.com",
    "deviceName": "Test Device"
  }' \
  "$BASE_URL/api/admin/send-device-verification"

# Sollte geben: { "success": true, "verificationLink": "..." }
```

**Check:**
- [ ] `"success": true`
- [ ] Response hat `verificationLink`
- [ ] `expiresAt` Timestamp vorhanden

---

## 🔐 Schritt 7: Security Test - Authentication (3 min)

```bash
# Test OHNE Token (sollte 401 geben):
curl "$BASE_URL/api/admin/check-transaction-token?transactionId=428029614"

# Sollte geben: { "statusCode": 401, "statusMessage": "Unauthorized..." }
```

**Check:**
- [ ] Bekomme 401 Unauthorized
- [ ] Kein Zugriff ohne Token!

---

## ⚠️ Schritt 8: Rate Limiting Test (10 min)

```bash
# Rate Limit Test für check-transaction-token (30/min):
for i in {1..31}; do
  echo "Request $i..."
  curl -s -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/admin/check-transaction-token?transactionId=428029614" | grep -o "success\|429\|Rate"
  sleep 0.1
done

# Sollte bei Request 31 429 geben!
```

**Check:**
- [ ] Requests 1-30: "success"
- [ ] Request 31: "429" oder "Rate"
- [ ] Rate Limiting funktioniert!

---

## 📊 Schritt 9: Audit Log Verification (5 min)

```sql
-- In Supabase SQL Editor:

-- 1. Alle Audit Logs anschauen:
SELECT 
  user_id,
  action,
  status,
  created_at
FROM audit_logs
WHERE action LIKE 'admin_%'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Sollte sehen:
-- - admin_check_transaction_token (success)
-- - admin_fix_missing_tokens... (success/error)
-- - admin_test_email_config (success)
-- - admin_test_smtp_config (started)
-- - admin_send_verification_... (success/error)
```

**Check:**
- [ ] Mindestens 5 verschiedene admin_ Actions
- [ ] Alle haben timestamp
- [ ] Status ist success oder error
- [ ] user_id vorhanden

---

## 🎯 Schritt 10: Final Validation

```bash
# Alle 5 APIs nochmal quick testen:

echo "✅ Test 1: check-transaction-token"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/check-transaction-token?transactionId=428029614" | jq .success

echo "✅ Test 2: fix-missing-payment-tokens"
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "invalid"}' \
  "$BASE_URL/api/admin/fix-missing-payment-tokens" | jq .

echo "✅ Test 3: test-email-config"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/test-email-config" | jq .success

echo "✅ Test 4: test-smtp-config"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/admin/test-smtp-config" | jq .success

echo "✅ Test 5: send-device-verification"
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "invalid"}' \
  "$BASE_URL/api/admin/send-device-verification" | jq .
```

---

## ✅ Summary Checklist

| Test | Status | Notes |
|------|--------|-------|
| check-transaction-token | ⏳ | Pass/Fail |
| fix-missing-payment-tokens | ⏳ | Pass/Fail |
| test-email-config | ⏳ | Pass/Fail |
| test-smtp-config | ⏳ | Pass/Fail |
| send-device-verification | ⏳ | Pass/Fail |
| Authentication (401) | ⏳ | Pass/Fail |
| Rate Limiting (429) | ⏳ | Pass/Fail |
| Audit Logs (DB) | ⏳ | Pass/Fail |

---

## 🎉 Done!

Wenn alle Tests grün sind:
- [ ] TIER 1 APIs sind produktionsreif
- [ ] Alle Security-Layer funktionieren
- [ ] Ready für TIER 2! 🚀

---

## 🆘 Wenn etwas nicht funktioniert:

1. **401 Unauthorized**
   - Token ungültig → neu einloggen
   - Token abgelaufen → browser refresh

2. **403 Forbidden**
   - Dein User ist nicht admin/super_admin
   - Check deine Role in DB

3. **500 Internal Server Error**
   - Check Dev Server Logs
   - Server vielleicht gecrasht?
   - Restart: npm run dev

4. **404 Not Found**
   - API Endpoint nicht vorhanden
   - Check ob dev server läuft
   - Check URL Spelling

5. **Rate Limit nicht functional**
   - Redis vielleicht nicht laufen?
   - Check `.cursor/terminals/` Logs

---

*Checklist erstellt: 3. Januar 2026*  
*Geschätzter Zeit: 45-60 Minuten für alle Tests*

