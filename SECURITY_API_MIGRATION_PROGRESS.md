# 🔒 SECURITY API MIGRATION PLAN

## Status: IN PROGRESS

### Phase 1: Critical Payments & Credits (THIS WEEK)
- [ ] usePayments.ts - Refactor to use `/api/staff/` endpoints
- [ ] useStudentCredits.ts - Refactor to use `/api/staff/credit-transaction.post.ts`
- [ ] useUsers.ts - Create missing update endpoint

### Phase 2: Products & Discounts (NEXT WEEK)
- [ ] useProducts.ts - Create management endpoints
- [ ] useDiscountsConsolidated.ts - Refactor to use `/api/staff/get-discounts.get.ts`
- [ ] useInvoices.ts - Verify uses `/api/admin/invoice-*` endpoints

### Phase 3: Remaining Composables (ONGOING)
- [ ] 58 remaining composables with direct DB queries
- [ ] Audit every `.from()` call
- [ ] Create missing endpoints
- [ ] Migrate to API calls

## Priority Table

| Composable | Criticality | API Status | Action |
|-----------|------------|-----------|--------|
| usePayments.ts | 🔴 CRITICAL | Partial | Create `/api/staff/create-payment.post.ts` |
| useStudentCredits.ts | 🔴 CRITICAL | ✅ Covered | Use existing endpoints |
| useUsers.ts | 🔴 CRITICAL | Partial | Create user update endpoint |
| useProducts.ts | 🟠 HIGH | Partial | Create product management |
| useDiscountsConsolidated.ts | 🟠 HIGH | ✅ Covered | Use existing endpoints |
| useInvoices.ts | 🟠 HIGH | ✅ Covered | Verify usage |
| useStudents.ts | 🟠 HIGH | Partial | Create student management |

## Migration Checklist per Composable

1. [ ] Read composable and document all DB queries
2. [ ] Check which APIs already exist
3. [ ] Create missing APIs (if needed)
4. [ ] Refactor composable to use APIs
5. [ ] Add error handling and logging
6. [ ] Test in development
7. [ ] Verify no direct DB queries remain
8. [ ] Update git with commit message

## Example Migration: useStudentCredits.ts

### Step 1: Identify Direct DB Queries
```typescript
// BEFORE: Direct query
const { data: credits } = await supabase
  .from('student_credits')
  .select('*')
  .eq('student_id', studentId)
```

### Step 2: Use Existing API
```typescript
// AFTER: Use API endpoint
const response = await $fetch('/api/staff/get-student-credits', {
  query: { student_id: studentId }
}) as any
const credits = response?.data
```

### Step 3: Test and Verify
- Verify logs show API calls instead of direct queries
- Test credit transactions
- Verify tenant isolation
- Check audit logs

## Critical Security Issues Found

1. ❌ **Direct Payment Updates** - Payments can be modified from client
2. ❌ **Direct Credit Updates** - Credits can be changed from client  
3. ❌ **No User Input Validation** - User can update any user data
4. ❌ **Missing Tenant Isolation** - Some queries don't filter by tenant

## Expected Outcome

After migration:
- ✅ All DB operations go through secure APIs
- ✅ Server-side validation and authorization
- ✅ Audit logging for all changes
- ✅ Tenant isolation enforced
- ✅ Reduced client-side security attack surface
- ✅ Better performance (caching opportunities)

## Timeline

- **Week 1**: Phase 1 (3 critical composables)
- **Week 2**: Phase 2 (5 high-priority composables)
- **Week 3-4**: Phase 3 (remaining 50 composables)

**Estimated Total**: 4 weeks for full migration

## Notes

- Some composables are large (1000+ lines) - break into smaller refactoring steps
- Test thoroughly after each migration
- Consider feature flagging for gradual rollout
- Keep git history clean with clear commit messages
