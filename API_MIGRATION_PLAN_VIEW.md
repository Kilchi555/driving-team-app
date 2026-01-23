# API Endpoints to Migrate to course_registrations_with_participant VIEW

## Summary
- 14 API files use course_registrations
- 8 can safely use VIEW (SELECT only)
- 6 need special handling (INSERT/UPDATE/DELETE)

---

## Safe to Migrate (SELECT → VIEW)

### 1. ✅ server/api/admin/courses/enrollments.post.ts
```typescript
// BEFORE
.from('course_registrations')
.select('*')

// AFTER
.from('course_registrations_with_participant')
.select('*')
```
Status: **Easy**

### 2. ✅ server/api/admin/courses/participants.post.ts
```typescript
// Queries registrations, joins to users
// Only SELECT queries
.from('course_registrations')  → .from('course_registrations_with_participant')
```
Status: **Easy**

### 3. ✅ server/api/admin/dashboard-summary.post.ts
```typescript
// COUNT and status checks
// Only SELECT queries
```
Status: **Easy**

### 4. ✅ server/api/emails/send-course-enrollment-confirmation.post.ts
```typescript
// Only reads registrations
.from('course_registrations')
.select(...)  → Can use VIEW with limited select
```
Status: **Moderate** (might need field adjustments)

---

## Need Special Handling (INSERT/UPDATE)

These create/update registrations, so they still use course_registrations table:

### 5. ⚠️ server/api/courses/enroll-wallee.post.ts
```typescript
// INSERTS into course_registrations (creates enrollment)
// Must stay on course_registrations table
// Cannot INSERT into VIEW
```
Status: **Leave as-is**

### 6. ⚠️ server/api/courses/enroll-cash.post.ts
```typescript
// INSERTS into course_registrations
// Must stay on course_registrations table
```
Status: **Leave as-is**

### 7. ⚠️ server/api/courses/enroll-complete.post.ts
```typescript
// INSERTS into course_registrations and course_participants
// Cannot INSERT into VIEW
```
Status: **Leave as-is**

### 8. ⚠️ server/api/sari/sync-participants.post.ts
```typescript
// INSERTS course_registrations during SARI sync
// Cannot INSERT into VIEW
```
Status: **Leave as-is**

### 9. ⚠️ server/api/sari/enroll-student.post.ts
```typescript
// INSERTS into course_registrations
// Cannot INSERT into VIEW
```
Status: **Leave as-is**

### 10. ⚠️ server/api/sari/unenroll-student.post.ts
```typescript
// Updates course_registrations (soft delete)
// Cannot UPDATE VIEW (without INSTEAD OF trigger)
```
Status: **Leave as-is** OR add INSTEAD OF trigger

### 11. ⚠️ server/api/admin/create-user.post.ts
```typescript
// Might INSERT course_registrations
```
Status: **Check & leave as-is if INSERT**

### 12. ⚠️ server/api/courses/enroll/post.ts
```typescript
// Old enrollment endpoint
// Status unknown
```
Status: **Check**

---

## Webhook (Special Case)

### 13. ⚠️ server/api/wallee/webhook.post.ts
```typescript
// READS registrations (SELECT)
// Could use VIEW for reading
// But also UPDATES registrations on payment completion
// Mixed read+write
```
Status: **Hybrid** - Can use VIEW for reads, table for updates

### 14. ⚠️ server/api/payments/process-public.post.ts
```typescript
// Creates payment record
// Updates course_registrations with payment info
// Mixed operations
```
Status: **Leave as-is** - updates required

---

## Migration Strategy

### Immediate (Low Risk)
```
✅ Migrate to VIEW:
- admin/courses/enrollments.post.ts
- admin/courses/participants.post.ts
- admin/dashboard-summary.post.ts
```

### Phase 2 (Moderate Risk)
```
⚠️ Review & Migrate:
- emails/send-course-enrollment-confirmation.post.ts (SELECT only)
- wallee/webhook.post.ts (read via VIEW, update table)
```

### Leave As-Is (No Changes Needed)
```
- All INSERT operations (enroll-*.post.ts, sync-participants.post.ts)
- UPDATE operations (unenroll, webhook updates)
```

---

## Action Items

### Priority 1 (Do Now - 30 min)
- [ ] Migrate 3 admin endpoints to use VIEW

### Priority 2 (Do Next - 1 hour)
- [ ] Review email confirmation endpoint
- [ ] Review webhook endpoint for read-side optimization

### Priority 3 (Do Later - Optional)
- [ ] Add INSTEAD OF triggers on VIEW for UPDATE/DELETE (if desired)
- [ ] Test all endpoints work correctly

---

## Testing

After migration, test:
```bash
# Test SELECT queries (should use VIEW)
npm test -- admin/courses/enrollments.post.ts
npm test -- admin/courses/participants.post.ts

# Test INSERT queries (still use table)
npm test -- courses/enroll-wallee.post.ts
npm test -- courses/enroll-cash.post.ts

# Integration test
npm run test:integration
```

---

## Files to Update Now

1. server/api/admin/courses/enrollments.post.ts
2. server/api/admin/courses/participants.post.ts
3. server/api/admin/dashboard-summary.post.ts

---

## Safe - No Breaking Changes

All these migrations are backward compatible:
- VIEW returns same columns as table (with COALESCE fallback)
- RLS policies identical
- Data structure flat (simpler for consumer)

No application code changes needed in most places! 🎉

