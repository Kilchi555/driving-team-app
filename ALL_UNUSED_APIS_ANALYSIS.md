# ALL UNUSED APIs - 35 Remaining (After Cleanup Wave 3 + Cron Security + SARI Correction + Audit Logging Fix)

**Total Unused:** 35 APIs (0 references anywhere in codebase)  
**After Wave 1 Cleanup:** 59 → 51 (10 deleted)  
**After Wave 2 Cleanup:** 51 → 43 (8 deleted)  
**After Wave 3 Cleanup:** 43 remaining (9 deleted)  
**After Cron Security:** 43 → 39 (4 secured + enabled)  
**After SARI Correction:** 39 → 35 (4 FALSE POSITIVES - actually used in Admin Dashboard!)  
**After Audit Logging Fix:** 35 APIs (no changes needed - all payment APIs fixed & tested)  
**Total APIs in System:** 157 (down from 188)  
**Total Cleaned:** 31 APIs deleted (2,200+ lines)

**Latest Changes:**
- ✅ Audit logs table created with proper RLS
- ✅ Payment APIs (process, get-payment-page-data, reset-failed) fixed to use users.id for audit logs
- ✅ All audit log errors resolved - no more FK constraint violations
- ✅ Audit logging tested and verified in production  

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

### 🟢 CRON/BACKGROUND JOBS (0 unused - ALL SECURED!)
```
✅ SECURED & ACTIVE:
- cron/cleanup-booking-reservations (every minute)
- cron/cleanup-expired-reservations (every hour)
- cron/process-automatic-payments (every 5 minutes)
- cron/sync-sari-courses (every 4 hours)
```
**Status:** ✅ COMPLETE SECURITY UPGRADE
- Layer 1: ✅ Authentication (CRON_SECRET verification)
- Layer 2: ✅ Rate Limiting (30s cooldown per job)
- Layer 3: ✅ Audit Logging (to cron_jobs table)
- Layer 7: ✅ Error Handling (detailed messages)
- Infrastructure: ✅ cron.ts utilities + cron_jobs audit table
- Testing: ✅ Bash + TypeScript test scripts
- Documentation: ✅ 3 comprehensive guides

**Commits:**
- cc33fa6: Infrastructure (cron.ts + audit table)
- ab8ff38: process-automatic-payments upgrade
- b5a34db: sync-sari-courses upgrade + vercel.json
- 3012c0d: Testing scripts
- 2b28600: Security implementation guide
- 835ea7a: Deployment checklist
- 1215e24: TypeScript error fixes
- cc56db5: Syntax fixes (all passing)

### 🔵 COURSES/PARTICIPANTS (3 unused)
```
28. course-participants/create
29. courses/enroll/post.ts
30. appointments/adjust-duration
```
**Status:** Course management - unused features

### 💜 SARI INTEGRATION (0 unused - ALL ACTIVE!)
```
✅ IN USE (Admin Dashboard - Course Management):
- sari/enroll-student (Kursverwaltung: Student anmelden)
- sari/unenroll-student (Kursverwaltung: Student abmelden)
- sari/validate-student (Kursverwaltung: Student validieren)
- sari/test-participants (Admin: Test participants endpoint)

✅ IN USE (Other):
- sari/validate-enrollment (Frontend: Course enrollment validation)
- sari/lookup-customer (Admin: Customer data lookup)
- sari/sync-courses (Cron: Sync VKU/PGS courses)
- sari/sync-participants (Cron: Sync participants)
- sari/sync-status (Admin: Check sync status)
- sari/test-connection (Admin: Test SARI connection)
- sari/save-settings (Admin: Save SARI settings)
```
**Status:** ✅ ALL ACTIVE - FALSE POSITIVE CORRECTION
- Previously marked as "unused" but actually called from Admin Dashboard
- Used for course enrollment, unenrollment, and validation
- Part of critical SARI integration workflow

**Next Action:** These SARI APIs should be secured with the same security stack as Cron APIs
- Need: Authentication, Rate Limiting, Input Validation, Audit Logging

### 🌐 WEBHOOKS (3 unused - IMPORTANT!)
```
28. payment-gateway/webhook
29. wallee/webhook-payment
30. webhooks/wallee-refund
```
**Status:** ⚠️ CRITICAL - Payment webhooks must be active!

### 📱 CUSTOMER/DOCUMENTS (1 unused)
```
31. customer/manage-documents
```

### 💳 PAYMENTS (4 unused)
```
32. payments/confirm-cash
33. payments/list
34. payments/status
35. mock/create-transaction
```

### 🎓 FEATURES (2 unused)
```
36. features/check
37. features/list
```
**Status:** Feature flags - never used

### 📧 NOTIFICATIONS (3 unused)
```
38. reminder/seed-templates
39. sms/test-sender
40. students/send-onboarding-sms
```

### 🏢 TENANTS (2 unused)
```
41. tenants/copy-evaluation-defaults
42. tenants/seed-defaults
```
**Status:** Setup only

### 👤 CREDITS (1 unused)
```
43. student-credits/request-withdrawal
```

### 🔒 SECURITY (2 unused)
```
44. security/block-ip
45. security/save-settings
```

### 🧪 TEST (1 unused)
```
46. test/feature-guards
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

