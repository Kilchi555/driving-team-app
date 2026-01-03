# ALL UNUSED APIs - 59 Remaining (After Initial Cleanup)

**Total Unused:** 59 APIs (0 references anywhere in codebase)  
**After Previous Delete:** Still 59 more  
**Total APIs:** ~178 remaining  

---

## 📊 BREAKDOWN BY CATEGORY

### 🔴 ADMIN APIs (14 unused)
```
1. admin/device-security-handler
2. admin/email-templates
3. admin/fix-tenants-rls           (RLS fix - maybe important?)
4. admin/fix-user-devices-rls      (RLS fix - maybe important?)
5. admin/migrate-missing-student-credits
6. admin/pendencies/handle-recurrence
7. admin/pendencies/update-overdue
8. admin/rate-limit-logs
9. admin/repair-locations
10. admin/sync-all-wallee-payments
11. admin/sync-wallee-payment
12. admin/test-device-storage
13. admin/test
14. admin/update-tenant-user
```

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

### 🟡 DEBUG APIs (9 unused - Testing/Development Only)
```
21. debug/check-credit-transaction
22. debug/check-payment
23. debug/decode-key
24. debug/manual-payment-update
25. debug/tenants-direct
26. debug/test-anon
27. debug/test-search
```
**Status:** Development debugging - should be removed from production

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

## ⚠️ CRITICAL CONCERNS

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

### SAFE TO DELETE (28 APIs)
```
✂️ All DEBUG/* APIs
✂️ All AUTH/WEBAUTHN/* APIs (never implemented)
✂️ FEATURES/* (feature flags not used)
✂️ TEST/* (test endpoints)
✂️ courses/* (not using courses feature)
✂️ course-participants/*
✂️ appointments/adjust-duration
✂️ customer/manage-documents
✂️ tenants/seed-defaults, tenants/copy-evaluation-defaults
✂️ reminder/seed-templates
✂️ security/block-ip, security/save-settings
✂️ payments/confirm-cash, payments/list, payments/status
✂️ mock/create-transaction
```

### RISKY TO DELETE (20 APIs)
```
⚠️ Keep for now:
- cron/* (scheduled tasks)
- */webhook* (external systems)
- admin/sync-* (important for data sync)
- admin/fix-* (maintenance tools)
- admin/migrate-* (data migration)
- sari/* (integration endpoints)
- student-credits/*
```

### UNDECIDED (11 APIs)
```
? admin/device-security-handler (device verification?)
? admin/rate-limit-logs (monitoring?)
? admin/email-templates (email config?)
? admin/repair-locations (data repair?)
? admin/pendencies/* (background tasks?)
? students/send-onboarding-sms (notifications?)
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

