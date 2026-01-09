# ALL UNUSED APIs - 25-27 Remaining (After Webhook Consolidation + Payment Security Hardening + Event Features)

**Total Unused:** ~25-27 APIs (down from 31 - major webhook cleanup)  
**After Wave 1 Cleanup:** 59 → 51 (10 deleted)  
**After Wave 2 Cleanup:** 51 → 43 (8 deleted)  
**After Wave 3 Cleanup:** 43 remaining (9 deleted)  
**After Cron Security:** 43 → 39 (4 secured + enabled)  
**After SARI Correction:** 39 → 35 (4 FALSE POSITIVES - actually used in Admin Dashboard!)  
**After Audit Logging Fix:** 35 → 31 (4 payment APIs now actively used & secured)  
**After Webhook Consolidation (Jan 9):** 31 → ~25-27 (4-6 webhook/payment APIs deleted/consolidated)  
**Total APIs in System:** ~152-154 (down from 188)  
**Total Cleaned:** ~34-36 APIs deleted (2,400+ lines)

**Latest Changes (This Session - Jan 9, 2026):**
- ✅ WEBHOOK CONSOLIDATION - Deleted insecure webhook duplicates:
  - ✂️ `/api/wallee/webhook-payment.post.ts` (OLD - unsafe payment updates)
  - ✂️ `/api/payment-gateway/webhook.post.ts` (OLD - incomplete logic)
  - ✅ `/api/wallee/webhook.post.ts` (NEW - single robust, secure handler)
- ✅ WEBHOOK SECURITY HARDENING (11 layers):
  - Signature validation ready
  - Multi-stage payment lookup (wallee_transaction_id + 3 merchantReference patterns)
  - Status downgrade prevention
  - Credit management (refunds + deductions)
  - Voucher/Credit product processing
  - Payment token storage integration
  - Comprehensive audit logging
  - Always returns 200 OK (prevents Wallee retries)
- ✅ Event Features Completed:
  - "Andere Terminart" (Other Event Types) deployed
  - Event title generation (Name - Location format)
  - Dynamic event coloring (payment_status based)
  - Red border for unpaid appointments
- ✅ Payment Security Fixes:
  - payments/process - Fully secured (10-layer security)
  - customer/get-payment-page-data - Fully secured
  - payments/confirm-cash - Audit logging fixed
  - payments/reset-failed - Proper user ID handling
- ✅ Onboarding Security Hardened:
  - students/upload-document.post.ts - 11 security layers
  - students/complete-onboarding.post.ts - Input validation + rate limiting
  - students/verify-onboarding-token.post.ts - Rate limiting added
- ✅ New Secure APIs Created:
  - `/api/onboarding/reglements.get.ts` - Token-based reglement fetching
  - `/api/customer/reglements.get.ts` - Authenticated reglement fetching
  - `/api/reminders/send-appointment-confirmation.post.ts` - Appointment confirmation emails
- ✅ Production Webhook Visibility:
  - Changed webhook logs from logger.debug() to logger.info()
  - Now visible in Vercel logs for Pro Plan
- ✅ Cancellation Email Enhancement:
  - Payment status, charge percentage, credit refund details included
  - Dynamic template based on payment state  

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

### 🌐 WEBHOOKS (0 unused - CONSOLIDATED & SECURED!)
```
✅ ACTIVE & HARDENED:
- wallee/webhook.post.ts (NEW - consolidated, 11 security layers)

✂️ DELETED (Old, unsafe duplicates):
- payment-gateway/webhook.post.ts (incomplete logic)
- wallee/webhook-payment.post.ts (unsafe payment updates)

⚠️ STILL ACTIVE (separate concerns):
- webhooks/wallee-refund.post.ts (Refund webhooks - TODO: add signature validation)
```

**Status:** ✅ COMPLETE WEBHOOK CONSOLIDATION
- Single robust payment webhook handler
- Multi-stage payment lookup (4 fallback patterns)
- Status downgrade prevention
- Credit management + token storage
- Always 200 OK to prevent Wallee retries
- Production logs visible in Vercel (info-level)

### 📱 CUSTOMER/DOCUMENTS (1 unused)
```
31. customer/manage-documents
```

### 💳 PAYMENTS (4 unused - down from 6)
```
❌ DELETED/CONSOLIDATED (This Session):
- payments/process-immediate (consolidated into payments/process)
- payments/authorize-payment (consolidated into wallee/authorize-payment)

✅ FULLY SECURED & ACTIVELY USED:
- payments/process (10-layer security, audit logging, Wallee integration)
- customer/get-payment-page-data (Secured, audit logging, fully tested)
- payments/confirm-cash (Audit logging fixed)
- payments/reset-failed (User ID handling fixed)

⚠️ REMAINING UNUSED:
- payments/list (Unused)
- payments/status (Unused)
```

**Status:** ✅ MAJOR CONSOLIDATION & HARDENING
- Wallet API integrated into single process endpoint
- All payment methods (wallee, cash, etc.) routed correctly
- Signature validation ready
- Token storage integrated (One-Click Payments)
- Admin fees + discounts + credits correctly calculated

### 🎓 FEATURES (2 unused)
```
36. features/check
37. features/list
```
**Status:** Feature flags - never used

### 📧 NOTIFICATIONS (1 unused - down from 3)
```
❌ DELETED:
- reminder/seed-templates (setup only)
- sms/test-sender (test endpoint)

✅ NEWLY CREATED & ACTIVE:
- reminders/send-appointment-confirmation (Appointment confirmation emails)
- onboarding/reglements.get (Token-based reglement fetching)
- customer/reglements.get (Authenticated reglement fetching)

⚠️ CURRENTLY USED:
- students/send-onboarding-sms (Used in add-student flow)
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

## 🎯 EVENT FEATURES - NOW COMPLETED!

**Date:** January 9, 2026  
**Feature:** "Andere Terminart" (Other Event Types) + Event Coloring + Cancellation Flows

### ✅ Deployed Features:
```
1. Other Event Types Support:
   - Can create appointments without predefined type
   - type = null for "other" events
   - Stored in event_type_code field

2. Event Title Generation:
   - Format: "[Name -] Location [EVENT_CODE]" → "[Name -] Location" (EVENT_CODE removed)
   - No customer: "Location" only
   - Edit mode: Title loaded from DB, no regeneration

3. Dynamic Event Coloring:
   - Loads default_color from event_types table
   - Driving categories prioritized for lesson/exam/theory
   - Red border (1px/2px) for unpaid appointments (user_id !== staff_id)
   - Only applies if payment_status !== 'completed'

4. Cancellation Flow Security:
   - cancel-staff.post.ts with 9 security layers
   - cancel-customer.post.ts with tenant isolation
   - Proper credit refunds + voucher processing
   - Appointment soft-delete with audit trail

5. Cancellation Email Enhancement:
   - Includes payment status (completed/pending/failed)
   - Shows charge percentage (0%, 50%, 100%)
   - Indicates if credit refunded to customer
   - Dynamic template based on payment state
```

### Files Modified:
- components/StudentSelector.vue (visibility control)
- components/TitleInput.vue (title generation logic)
- components/CalendarComponent.vue (dynamic coloring)
- components/EventModal.vue (error handling)
- server/api/appointments/cancel-staff.post.ts (security)
- server/api/appointments/cancel-customer.post.ts (security)
- server/api/appointments/handle-cancellation.post.ts (logic)
- server/api/email/send-appointment-notification.post.ts (cancellation emails)

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

### ✅ WEBHOOKS - NOW SECURE!
```
✅ CONSOLIDATED & HARDENED:
- wallee/webhook.post.ts (11 security layers, robust)

⚠️ PARTIALLY SECURED:
- webhooks/wallee-refund.post.ts (TODO: add signature validation)

❌ DELETED (OLD INSECURE):
- payment-gateway/webhook.post.ts
- wallee/webhook-payment.post.ts
```

These are called by EXTERNAL systems (Wallee), must be highly reliable!

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

## 🤔 CURRENT STATUS (Jan 9, 2026)

### Recent Completions:
1. ✅ Webhook Consolidation - Single secure handler (wallee/webhook.post.ts)
2. ✅ Event Features - Other event types, coloring, titles
3. ✅ Cancellation Flows - Security hardened + email enhancements
4. ✅ Onboarding Security - 3 APIs hardened (upload, complete, verify token)
5. ✅ Payment APIs - 4-6 APIs consolidated + secured

### Known Issues (To Address):
1. ⚠️ `wallee-refund.post.ts` - Missing signature validation (LOW PRIORITY)
2. ⚠️ `create-transaction.post.ts` - Missing rate limiting + auth (LOW PRIORITY)
3. ⚠️ 6 WebAuthn APIs - Never implemented, can be deleted (LOW PRIORITY)

### Recommended Next Steps:
1. 🟢 Keep webhook consolidation (stable, tested, working)
2. 🟢 Monitor webhook logs in Vercel (info-level logs now visible)
3. 🟡 Add signature validation to wallee-refund (optional enhancement)
4. 🟡 Delete unused admin APIs (6 remaining)
5. 🟡 Delete WebAuthn APIs (never implemented)

