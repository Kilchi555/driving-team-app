# Vollständige Checklist - Was bleibt zu tun?

**Status**: Viel erledigt, aber noch wichtige Tasks offen

---

## 🎯 CRITICAL (Must Do Before Deployment)

### 1. ⚠️ Deploy the Migrations (Database)
```bash
# 2 neue Migrations müssen auf Production deployed werden:
✅ migrations/backfill_sari_sync_data_20260123.sql
   → Füllt existing SARI registrations mit Daten

✅ migrations/create_course_registrations_view_20260123.sql
   → Erstellt course_registrations_with_participant VIEW
   → Adds RLS policies

⚠️ ACTION: In Supabase SQL Editor ausführen oder
   via Supabase CLI deployen
```

**Why**: Ohne diese Migrations funktioniert die View und Sync nicht!

---

### 2. ⚠️ Test the VIEW Works
```sql
-- In Supabase SQL Editor:

-- Test 1: VIEW returns data
SELECT COUNT(*) FROM course_registrations_with_participant;

-- Test 2: Personal data is present (not NULL)
SELECT 
  COUNT(*) as total,
  COUNT(first_name) as with_name,
  COUNT(email) as with_email
FROM course_registrations_with_participant;

-- Test 3: SARI data is synced
SELECT 
  COUNT(*) as total,
  COUNT(sari_data) as with_sari_data,
  COUNT(sari_licenses) as with_licenses
FROM course_registrations_with_participant;
```

**Why**: Validation before frontend depends on it

---

### 3. ⚠️ Test Frontend Queries Still Work
```bash
# In browser console:
# 1. Go to Admin → Courses page
# 2. Select a course
# 3. Check if Enrollments load correctly
# 4. Verify names, emails show up

# Expected: Same data as before, but loaded from VIEW
```

**Why**: Frontend might have other queries we missed

---

### 4. ⚠️ Run Backfill Migration
```sql
-- Make sure historic SARI registrations get filled:
SELECT COUNT(*) FROM course_registrations 
WHERE sari_synced = true AND first_name IS NULL;
-- Before: Many NULLs
-- After running backfill: Should be 0 or very few
```

**Why**: Otherwise old registrations stay empty

---

## 🟡 HIGH PRIORITY (Do This Week)

### 5. Migrate 3 Safe API Endpoints to VIEW
```typescript
Files to update:
  - server/api/admin/courses/enrollments.post.ts
  - server/api/admin/courses/participants.post.ts
  - server/api/admin/dashboard-summary.post.ts

Changes:
  .from('course_registrations')
  →
  .from('course_registrations_with_participant')
```

**Time**: 30 minutes  
**Risk**: Very low (SELECT-only)

---

### 6. Test Email Confirmation Works
```bash
# Test Cash Enrollment Flow:
1. Go to public course page
2. Enroll as guest (cash payment, Einsiedeln course)
3. Check email confirmation
   - Should say: "Please bring CHF XX in bar"
   - Should have all enrollment details

# Test Wallee Enrollment Flow:
1. Go to public course page
2. Enroll as guest (Wallee payment, Zürich course)
3. Make test payment
4. Check webhook triggers confirmation email
   - Should say: "Payment received, spot confirmed"
   - Should have all course details
```

**Why**: Email template was newly added, needs validation

---

### 7. Test Rate Limiting Works
```bash
# Simulate brute force attack:
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/courses/enroll-wallee \
    -H "Content-Type: application/json" \
    -d '{"courseId":"...", "faberid":"1.234.567", ...}'
done

# Expected:
# - First 5 requests: Success
# - Request 6: 429 Too Many Requests
```

**Why**: Security feature we added needs validation

---

### 8. Test Webhook Signature Validation
```bash
# Send webhook WITHOUT signature:
curl -X POST https://your-domain/api/wallee/webhook \
  -H "Content-Type: application/json" \
  -d '{"entityId": 123, "state": "FULFILL"}'

# Expected: 401 Unauthorized

# Send WITH valid signature:
# (calculated with HMAC-SHA-256)

# Expected: 200 OK, processes correctly
```

**Why**: Security validation was added

---

## 🟢 MEDIUM PRIORITY (Nice To Have This Week)

### 9. Migrate Remaining API Endpoints (Optional)
```
If you want to fully standardize:
- wallee/webhook.post.ts → Can use VIEW for read-side
- admin/dashboard-summary.post.ts → Check if using VIEW now

These are lower priority since they already work.
```

**Time**: 1-2 hours  
**Risk**: Low-medium

---

### 10. Document Deployment Steps
```markdown
Create: DEPLOYMENT_STEPS.md

Include:
1. Run 2 migrations
2. Test VIEW works
3. Test frontend loads
4. Verify email confirmations
5. Monitor for errors
6. Rollback steps if needed
```

**Why**: Makes deployment safer next time

---

### 11. Add Monitoring/Alerts
```typescript
// Monitor these metrics:
- Webhook signature validation failures
  Alert if: > 5 in 1 hour
  
- Rate limit hits
  Alert if: > 10 in 1 hour
  
- Email delivery failures
  Alert if: > 3 in 1 hour
  
- SARI sync failures
  Alert if: Any sync fails
```

**Time**: 1-2 hours  
**Value**: High (production safety)

---

## 🔵 LOW PRIORITY (Later)

### 12. Cleanup Redundant Columns (Phase 3)
```sql
-- Only after everything stable for 1 week:

ALTER TABLE course_registrations
DROP COLUMN _deprecated_first_name,
DROP COLUMN _deprecated_last_name,
DROP COLUMN _deprecated_email,
...

-- Can only do this AFTER:
-- - All APIs migrated to VIEW
-- - All data backfilled
-- - Week of monitoring passes
```

**Time**: 1 hour  
**Risk**: Medium (data structure change)

---

### 13. Add INSTEAD OF Triggers (Optional Enhancement)
```sql
-- If you want to be able to UPDATE via VIEW:

CREATE TRIGGER course_registrations_with_participant_update
INSTEAD OF UPDATE ON course_registrations_with_participant
FOR EACH ROW
EXECUTE FUNCTION update_course_registrations_via_view();

-- This allows:
-- UPDATE course_registrations_with_participant SET status = 'confirmed'
```

**Time**: 2 hours  
**Value**: Nice-to-have (would simplify admin APIs)

---

### 14. Migrate Wallee Secrets to tenant_secrets (From Earlier)
```
Remember: We talked about this security improvement
- Move from tenants table
- Into tenant_secrets with RLS
- Reduces accidental credential exposure

Time: 3-4 hours
Priority: Medium (security improvement)
```

---

## 📋 DEPLOYMENT CHECKLIST

### Pre-Deployment (Tonight)
- [ ] Reviewed all migration files
- [ ] Tested migrations locally
- [ ] Documented rollback steps

### Deployment (Production)
- [ ] Run backfill_sari_sync_data migration
- [ ] Run create_course_registrations_view migration
- [ ] Verify VIEW has data
- [ ] Frontend loads course enrollments
- [ ] Email confirmations work
- [ ] Rate limiting works

### Post-Deployment (Monitor 24h)
- [ ] No webhook signature errors
- [ ] No rate limit false positives
- [ ] Course enrollments working
- [ ] SARI syncs working
- [ ] Email confirmations delivered
- [ ] No orphaned registrations
- [ ] Error rate normal

---

## 🎯 TODAY'S PRIORITY RANKING

### Must Do Today (4 hours)
1. ✅ Security audit (done)
2. ✅ Email template (done)
3. ✅ Rate limiting (done)
4. ✅ SARI sync enhancements (done)
5. ✅ Elegant VIEW refactor (done)
6. 🔄 **Run database migrations** ← DO THIS NOW
7. 🔄 **Test VIEW works** ← DO THIS NOW
8. 🔄 **Test email confirmations** ← DO THIS NOW

### This Week (6-8 hours)
9. Migrate 3 API endpoints to VIEW
10. Run all validation tests
11. Setup monitoring
12. Documentation

### Next Week (As Needed)
13. Cleanup redundant columns
14. INSTEAD OF triggers
15. Wallee secrets migration

---

## ⏱️ TIME ESTIMATE

| Task | Time | Priority |
|------|------|----------|
| Deploy migrations | 30 min | 🔴 Critical |
| Test VIEW | 30 min | 🔴 Critical |
| Test emails | 30 min | 🔴 Critical |
| Test rate limiting | 20 min | 🔴 Critical |
| Migrate API endpoints | 30 min | 🟡 High |
| Setup monitoring | 2 hours | 🟡 High |
| Documentation | 1 hour | 🟡 High |
| **Total Critical** | **1.5 hours** | **Today** |
| **Total This Week** | **6-8 hours** | **By Friday** |

---

## 📞 Questions Before You Start

1. Do you want to deploy migrations to production today?
2. Should I write the deployment steps document?
3. Do you have a staging environment to test in first?
4. Should we setup monitoring/alerts?

---

## Summary

✅ **DONE (Today)**:
- Security fixes (webhook signature, rate limiting)
- Email confirmation API
- SARI sync enhancements
- Elegant VIEW refactor
- Frontend updated

⏳ **TODO (Critical - Do Now)**:
- Deploy 2 database migrations
- Test VIEW in production
- Test email confirmations
- Validate rate limiting

🔄 **TODO (This Week)**:
- Migrate API endpoints
- Complete testing
- Setup monitoring
- Documentation

🚀 **Ready for Production**: ~95% - Just need to deploy and validate

---

**Want me to write the deployment steps or start migrating the API endpoints?**

