# ALL UNUSED APIs - 43 Remaining (After Cleanup Wave 3)

**Total Unused:** 43 APIs (0 references anywhere in codebase)  
**After Wave 1 Cleanup:** 59 → 51 (10 deleted)  
**After Wave 2 Cleanup:** 51 → 43 (8 deleted)  
**After Wave 3 Cleanup:** 43 remaining (9 deleted)  
**Total APIs in System:** 161 (down from 188)  
**Total Cleaned:** 27 APIs deleted (2,100+ lines)  

---

## 📊 BREAKDOWN BY CATEGORY

### 🔴 ADMIN APIs (6 unused - down from 14)
```
1. admin/pendencies/handle-recurrence
2. admin/pendencies/update-overdue
3. admin/rate-limit-logs
4. admin/sync-all-wallee-payments
5. admin/sync-wallee-payment
6. admin/test
```

**Deleted in Wave 2:**
- ✂️ admin/device-security-handler
- ✂️ admin/email-templates
- ✂️ admin/fix-tenants-rls
- ✂️ admin/fix-user-devices-rls
- ✂️ admin/migrate-missing-student-credits
- ✂️ admin/repair-locations
- ✂️ admin/test-device-storage
- ✂️ admin/update-tenant-user

### 🟠 AUTHENTICATION/WEBAUTHN (6 unused - Never Implemented!)
```
15. auth/check-webauthn
16. auth/webauthn-assertion-options
17. auth/webauthn-credential/_id
18. auth/webauthn-login-verify
19. mfa/webauthn-register-complete
20. mfa/webauthn-register-start
```
**Status:** WebAuthn infrastructure - never activated

### 🟡 DEBUG APIs (0 unused - down from 9 - ALL DELETED!)
```
Deleted in Wave 3:
✂️ debug/check-credit-transaction
✂️ debug/check-payment
✂️ debug/decode-key
✂️ debug/manual-payment-update
✂️ debug/tenants-direct
✂️ debug/test-anon
✂️ debug/test-search
```
**Status:** All debug endpoints removed from production

### 🟢 CRON/BACKGROUND JOBS (5 unused)
```
28. cron/cleanup-booking-reservations
29. cron/cleanup-expired-reservations
30. cron/process-automatic-payments
31. cron/sync-sari-courses
```
**Status:** Background tasks - maybe scheduled elsewhere?

### 🔵 COURSES/PARTICIPANTS (3 unused)
```
32. course-participants/create
33. courses/enroll/post.ts
34. appointments/adjust-duration
```
**Status:** Course management - unused features

### 💜 SARI INTEGRATION (4 unused)
```
35. sari/enroll-student
36. sari/test-participants
37. sari/unenroll-student
38. sari/validate-student
```
**Status:** SARI integration endpoints - never called

### 🌐 WEBHOOKS (3 unused - IMPORTANT!)
```
39. payment-gateway/webhook
40. wallee/webhook-payment
41. webhooks/wallee-refund
```
**Status:** ⚠️ CRITICAL - Payment webhooks must be active!

### 📱 CUSTOMER/DOCUMENTS (1 unused)
```
42. customer/manage-documents
```

### 💳 PAYMENTS (4 unused)
```
43. payments/confirm-cash
44. payments/list
45. payments/status
46. mock/create-transaction
```

### 🎓 FEATURES (2 unused)
```
47. features/check
48. features/list
```
**Status:** Feature flags - never used

### 📧 NOTIFICATIONS (3 unused)
```
49. reminder/seed-templates
50. sms/test-sender
51. students/send-onboarding-sms
```

### 🏢 TENANTS (2 unused)
```
52. tenants/copy-evaluation-defaults
53. tenants/seed-defaults
```
**Status:** Setup only

### 👤 CREDITS (1 unused)
```
54. student-credits/request-withdrawal
```

### 🔒 SECURITY (2 unused)
```
55. security/block-ip
56. security/save-settings
```

### 🧪 TEST (1 unused)
```
57. test/feature-guards
```

---

## ✅ CLEANUP - WAVE 2 COMPLETED!

**Date:** January 3, 2026  
**Action:** Deleted 8 more unused admin APIs  
**Commit:** 1e5e03c + 3667c3e

### 🗑️ Deleted Files (Wave 2):
```
✂️  admin/device-security-handler.post.ts
✂️  admin/email-templates.post.ts
✂️  admin/fix-tenants-rls.post.ts
✂️  admin/fix-user-devices-rls.post.ts
✂️  admin/migrate-missing-student-credits.post.ts
✂️  admin/repair-locations.post.ts
✂️  admin/test-device-storage.get.ts
✂️  admin/update-tenant-user.post.ts
```

### 📊 Updated Progress:
- **Total Cleaned:** 18 APIs (10 in Wave 1 + 8 in Wave 2)
- **Lines Deleted:** 1,470 lines
- **APIs Remaining:** 170 (down from 188)
- **Unused Remaining:** 51 (down from 59)
- **% Cleaned:** 9.6% of all APIs removed

---

## 🚨 CRITICAL CONCERNS

### 🚨 WEBHOOKS (MUST NOT DELETE!)
```
❌ DO NOT DELETE:
- payment-gateway/webhook       (Payment updates from provider)
- wallee/webhook-payment        (Wallee sends payment status)
- webhooks/wallee-refund        (Refund notifications)
```

These might be called by EXTERNAL systems, not by our code!

### ⚠️ CRON JOBS (MUST NOT DELETE!)
```
❌ DO NOT DELETE:
- cron/cleanup-*
- cron/process-automatic-payments
- cron/sync-sari-courses
```

These might be scheduled in Vercel Cron or external system!

### 🔧 RLS FIX APIs (MAYBE KEEP)
```
admin/fix-tenants-rls
admin/fix-user-devices-rls
```

These were created for fixing RLS issues - might be needed for future maintenance

---

## 🎯 DELETION STRATEGY

### Safe to Delete (28 APIs)
```
✂️ All debug/* endpoints (9)
✂️ All auth/webauthn/* (5 - never implemented)
✂️ Features flags APIs (2)
✂️ Test endpoints (1)
✂️ Courses APIs (3)
✂️ appointments/adjust-duration
✂️ customer/manage-documents
✂️ tenants/seed-defaults, tenants/copy-evaluation-defaults
✂️ reminder/seed-templates
✂️ security/block-ip, security/save-settings
✂️ payments/confirm-cash, payments/list, payments/status
✂️ mock/create-transaction
```

### RISKY TO DELETE (12 APIs)
```
⚠️ Keep for now:
- cron/* (5 - scheduled tasks)
- */webhook* (3 - external systems)
- sari/* (4 - integration endpoints)
```

### UNDECIDED (11 APIs)
```
? admin/rate-limit-logs
? admin/sync-all-wallee-payments
? admin/sync-wallee-payment
? admin/pendencies/*
? students/send-onboarding-sms
? student-credits/request-withdrawal
? payments/* (some)
```

---

## 💡 RECOMMENDATION

### Phase 1: Quick Safe Cleanup (28 APIs)
```bash
DELETE:
- All debug/* 
- All auth/webauthn/*
- All features/*
- All test/*
- courses/*
- tenants/seed-defaults
```
**Risk:** 🟢 VERY LOW
**Time:** 5 min
**Impact:** 28 fewer APIs to maintain

### Phase 2: Review & Delete (20 APIs)
```bash
REVIEW:
- Cron jobs (check if scheduled)
- Webhooks (check if called externally)
- SARI endpoints (check integration)
- Admin utilities (check if needed)
```
**Risk:** 🔴 HIGH
**Time:** 30 min analysis
**Impact:** Another 20 APIs cleaned

### Phase 3: Documentation
```bash
Document why each API is kept/deleted
Create migration guide if needed
```

---

## 🤔 WHAT TO DO?

1. **🟢 AGGRESSIVE:** Delete all 59 unsafe APIs now
2. **🟡 BALANCED:** Delete 28 safe APIs, review 20 risky
3. **🔴 CONSERVATIVE:** Keep all, just document them
4. 📋 **AUDIT FIRST:** Check which are called externally (cron, webhooks)

**Was willst du?** 👀

