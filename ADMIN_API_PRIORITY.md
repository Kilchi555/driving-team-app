# Admin APIs - Priorisierung nach Kritikalität

**Ziel:** Sichere 10 Admin-APIs mit allen 7 Security Layers + 10 Maßnahmen  
**Strategie:** Mit weniger kritischen APIs starten → schrittweise zu Critical APIs

---

## 🚨 Kritikalitäts-Matrix

```
HIGH USAGE → CRITICAL IMPACT
├─ CREATE/DELETE User
├─ UPDATE Tenant User
├─ GET Pending Appointments (Pendenzen)
├─ UPDATE User Assigned Staff
└─ GET Students (Schüler für Terminerstellung)

MEDIUM USAGE → MEDIUM IMPACT
├─ GET Tenant Users (User auflisten)
├─ SYNC Wallee Payments
├─ CHECK Transaction Token
├─ CREATE User
└─ SEND Device Verification

LOW USAGE → LOW IMPACT
├─ FIX Missing Payment Tokens (Maintenance)
├─ TEST Email Config (Debug)
├─ TEST SMTP Config (Debug)
├─ TEST Device Storage (Debug)
└─ CREATE Driving Team Tenant (Setup)
```

---

## ✅ EMPFEHLUNG: Starten mit DIESEN 10 Admin-APIs

### Tier 1: SAFE TO EDIT (Low Impact, Low Usage)

Diese APIs werden **selten verwendet**, sind **nicht kritisch** → perfekt zum Üben!

| # | Endpoint | Used Where? | Frequency | Impact | Reason |
|---|----------|------------|-----------|--------|--------|
| 1️⃣ | `POST /api/admin/check-transaction-token` | QUICK_TOKEN_CHECK.md, FIX_MISSING_TOKENS.md | 🟢 LOW | 🟢 LOW | Nur für manuelle Debugging |
| 2️⃣ | `POST /api/admin/fix-missing-payment-tokens` | Maintenance/Manual | 🟢 LOW | 🟡 MEDIUM | Nur bei Payment Issues |
| 3️⃣ | `POST /api/admin/send-device-verification` | `/api/[slug].vue` (DeviceManager) | 🟡 MEDIUM | 🟢 LOW | Nur für Device Auth |
| 4️⃣ | `GET /api/admin/test-email-config` | Debug/Manual | 🟢 LOW | 🟢 LOW | Nur für Email Testing |
| 5️⃣ | `GET /api/admin/test-smtp-config` | Debug/Manual | 🟢 LOW | 🟢 LOW | Nur für SMTP Testing |

**Status:** ✅ SAFE - Können wir getrost mit Sicherheit upgraden!

---

### Tier 2: MEDIUM RISK (Medium Usage, Medium Impact)

Diese APIs werden **gelegentlich verwendet** → testen mit Vorsicht!

| # | Endpoint | Used Where? | Frequency | Impact | Reason |
|---|----------|------------|-----------|--------|--------|
| 6️⃣ | `POST /api/admin/update-user-device` | `DeviceManager.vue` (line 257) | 🟡 MEDIUM | 🟡 MEDIUM | Staff Device Management |
| 7️⃣ | `GET /api/admin/get-tenant-users` | `pages/customers.vue` (line 631) | 🟡 MEDIUM | 🟡 MEDIUM | User Listing |
| 8️⃣ | `POST /api/admin/sync-wallee-payment` | WALLEE_TOKENIZATION.md | 🟢 LOW | 🔴 HIGH | Payment Sync - BE CAREFUL! |

**Status:** ⚠️ MEDIUM RISK - Testing vor Production!

---

### Tier 3: CRITICAL (High Usage, Critical Impact)

Diese APIs sind **SEHR HÄUFIG VERWENDET** → nur nach gründlichen Tests!

| # | Endpoint | Used Where? | Frequency | Impact | Reason |
|---|----------|------------|-----------|--------|--------|
| 9️⃣ | `GET /api/admin/get-pending-appointments` | `composables/usePendingTasks.ts` (line 223) | 🔴 VERY HIGH | 🔴 CRITICAL | Pendenzen-Modal für JEDEN Staff |
| 🔟 | `GET /api/admin/get-students` | `StudentSelector.vue` (line 401) | 🔴 VERY HIGH | 🔴 CRITICAL | Termin-Erstellung braucht das! |

**Status:** 🚨 CRITICAL - Nur nach vollständigen Tests deployen!

---

## 📋 Roadmap: Diese 10 APIs Upgraden

### PHASE 1: TEST APIS (👈 START HERE!)
**Aufwand:** ~2-3 Stunden (LOW RISK!)

```
✅ 1. POST /api/admin/check-transaction-token
   - Used: QUICK_TOKEN_CHECK.md (Debug)
   - Risk: 🟢 SEHR NIEDRIG
   - Test: 1 Test-Aufruf nur
   - Sicherheits-Fixes:
     ✅ Rate Limiting
     ✅ Auth
     ✅ Input Validation (transactionId UUID)
     ✅ Sanitization (N/A)
     ✅ Authorization (super_admin only)
     ✅ Audit Logging
     ✅ Error Handling

✅ 2. POST /api/admin/fix-missing-payment-tokens
   - Used: Manual Maintenance
   - Risk: 🟢 NIEDRIG
   - Test: Dry-Run nur
   - Sicherheits-Fixes: [same as above]

✅ 3. POST /api/admin/send-device-verification
   - Used: DeviceManager.vue (Rare)
   - Risk: 🟡 MEDIUM
   - Test: Send to test device
   - Sicherheits-Fixes: [same as above]

✅ 4. GET /api/admin/test-email-config
   - Used: Debug only
   - Risk: 🟢 SEHR NIEDRIG
   - Test: Call once
   - Sicherheits-Fixes: [same as above]

✅ 5. GET /api/admin/test-smtp-config
   - Used: Debug only
   - Risk: 🟢 SEHR NIEDRIG
   - Test: Call once
   - Sicherheits-Fixes: [same as above]
```

**Nach PHASE 1 fertig:** ~5 sichere Admin-APIs!

---

### PHASE 2: MEDIUM RISK APIS (~1-2 Stunden)

```
✅ 6. POST /api/admin/update-user-device
   - Used: DeviceManager.vue (Occasional)
   - Risk: 🟡 MEDIUM
   - Test: Update 1 device, verify in DB
   - Sicherheits-Fixes: [same as above] + Tenant check

✅ 7. GET /api/admin/get-tenant-users
   - Used: pages/customers.vue (When loading customers)
   - Risk: 🟡 MEDIUM
   - Test: Load customer list, check count
   - Sicherheits-Fixes: [same as above] + Rate Limiting extra (30 req/min)

✅ 8. POST /api/admin/sync-wallee-payment
   - Used: Manual Payment Sync
   - Risk: 🔴 HIGH (touches payments!)
   - Test: Sync 1 payment, verify result
   - Sicherheits-Fixes: [same as above] + Extra validation
```

**Nach PHASE 2 fertig:** ~8 sichere Admin-APIs!

---

### PHASE 3: CRITICAL APIS (🚨 LAST!)
**Aufwand:** ~3-4 Stunden (VERY CAREFUL!)

```
✅ 9. GET /api/admin/get-pending-appointments
   - Used: EVERY TIME Staff loads Pendenzen
   - Risk: 🔴 CRITICAL (affects staff workflow!)
   - Test: STAGING server only!
   - ⚠️ PRODUCTION TEST ONLY AFTER FULL VALIDATION
   - Sicherheits-Fixes: [all 7] + Extra Rate Limiting (50 req/min)

✅ 10. GET /api/admin/get-students
   - Used: EVERY TIME creating appointment
   - Risk: 🔴 CRITICAL (breaks appointment creation!)
   - Test: STAGING server only!
   - ⚠️ PRODUCTION TEST ONLY AFTER FULL VALIDATION
   - Sicherheits-Fixes: [all 7] + Extra Rate Limiting (50 req/min)
```

**Nach PHASE 3 fertig:** ✅ ALLE 10 CRITICAL ADMIN-APIs SECURE!

---

## 🛡️ Sicherheits-Fixes (für ALLE 10 APIs)

### Mandatory in jedem API:

```
1. ✅ Rate Limiting: checkRateLimit(ip, 'admin', 30-50, 60000)
2. ✅ Authentication: getAuthenticatedUser() - must exist
3. ✅ Authorization: Check role = 'admin'/'super_admin'/'tenant_admin'
4. ✅ Input Validation: All query/body params validated
5. ✅ Input Sanitization: DOMPurify.sanitize() für Strings
6. ✅ Audit Logging: Log WHO, WHAT, WHEN, IP
7. ✅ Error Handling: createError() mit HTTP codes
```

### Zusätzliche Fixes:

```
+ Input Validation Helpers erstellen
  - validateTransactionId()
  - validateDeviceId()
  - validateUserId()
  - validateEmail()
  - validatePhone()

+ Audit Logging Middleware
  - Log nach Business Logic success
  - Include: user_id, action, resource_id, ip_address, status_code

+ Error Response Standard
  - { success: false, statusCode: 500, message: "...", errorId: "uuid" }
```

---

## 📊 Zeitleiste

```
TAG 1 (Montag):
  Morgens: PHASE 1 (Tier 1 Low-Risk APIs) - 3 APIs
    - [ ] check-transaction-token
    - [ ] fix-missing-payment-tokens
    - [ ] test-email-config
    - [ ] test-smtp-config
  
  Nachmittags: Testen auf STAGING
    - [ ] Manual Testing
    - [ ] Check Audit Logs
    - [ ] Verify Rate Limiting

TAG 2 (Dienstag):
  Morgens: PHASE 2 (Tier 2 Medium-Risk APIs) - 3 APIs
    - [ ] update-user-device
    - [ ] get-tenant-users
    - [ ] send-device-verification
  
  Nachmittags: Testen auf STAGING
    - [ ] Integration Testing
    - [ ] Performance Check

TAG 3 (Mittwoch):
  Morgens: PHASE 3 (Tier 3 Critical APIs) - 2 APIs
    - [ ] get-pending-appointments
    - [ ] get-students
  
  Nachmittags: Testen auf STAGING
    - [ ] Full Workflow Testing
    - [ ] Stress Testing
    - [ ] Staff Feedback

TAG 4-5 (Donnerstag-Freitag):
  Production Rollout (mit Monitoring):
    - [ ] PHASE 1 → Production
    - [ ] PHASE 2 → Production (nach Monitoring)
    - [ ] PHASE 3 → Production (nach Full Testing)
```

---

## ✨ Bonus: Welche Admin-APIs NICHT upgraden? (SKIP)

Diese sind **DEBUG/TEST nur**, in Production sowieso deaktiviert:

```
❌ /api/admin/check-auth-user
❌ /api/admin/check-user-devices-rls
❌ /api/admin/create-driving-team-tenant
❌ /api/admin/create-test-device
❌ /api/admin/create-user-devices-table
❌ /api/admin/fix-tenants-rls
❌ /api/admin/fix-user-devices-rls
❌ /api/admin/test-device-storage

Grund: Sind nur für Development/Debugging!
```

---

## 🎯 TL;DR - START SOFORT MIT:

### **DIESE 5 APIS ZUERST (Montag Morgen):**

1. `POST /api/admin/check-transaction-token` - 15 min
2. `POST /api/admin/fix-missing-payment-tokens` - 15 min
3. `GET /api/admin/test-email-config` - 10 min
4. `GET /api/admin/test-smtp-config` - 10 min
5. `POST /api/admin/send-device-verification` - 20 min

**Total:** ~70 Minuten, ZERO RISK! ✅

---

*Plan generiert: 3. Januar 2026*

