# useEventModalForm.ts - DEEP REFACTORING GUIDE

## File Overview
- **Size**: 1,766 lines
- **Direct Queries Found**: ~20
- **Criticality**: EXTREME (EventModal.vue depends entirely on this)
- **Complexity**: HIGH (mixed async operations, form validation, pricing)

## Current Status
✅ Some functions already migrated to APIs:
- `loadStudentById()` → uses `/api/admin/get-user-for-edit`
- `loadExistingDiscount()` → uses `/api/admin/get-discount-sales`
- `loadExistingPayment()` → uses `/api/staff/get-appointment-payment`

❌ Direct Supabase Queries Found:
- `loadStudentBillingAddress()` (Line 410-445) - SELECT from addresses table
- Potentially in `saveAppointment()` - needs detailed analysis
- Various other form loading functions

## Refactoring Strategy (Phase-Based)

### PHASE 1: Identify All Direct Queries
Run this search to find all direct Supabase queries:
```bash
grep -n "supabase\.from\|\.select(\|\.insert(\|\.update(\|\.delete(" composables/useEventModalForm.ts
```

### PHASE 2: Group by Function
Categories:
1. **Read Operations** (SELECT) - Can be parallelized
2. **Write Operations** (INSERT/UPDATE) - Need transaction safety
3. **Form Initialization** - Can be preloaded

### PHASE 3: Required API Endpoints
Create these new endpoints (if not existing):
- [ ] `/api/addresses/get-by-user` - Get user's billing address
- [ ] `/api/addresses/list` - List all active addresses
- [ ] `/api/appointments/save` - Save appointment (consolidate all writes)
- [ ] `/api/appointments/check-availability` - Check time slot availability
- [ ] `/api/discounts/check-eligibility` - Validate discount applicability

### PHASE 4: Refactoring Per Function

#### Function: loadStudentBillingAddress
**Current** (Lines 410-445):
```typescript
const supabaseClient = getSupabase()
const { data: addressData, error: addressError } = await supabaseClient
  .from('addresses')
  .select('*')
  .eq('user_id', studentId)
  .single()
```

**Target**:
```typescript
const response = await $fetch('/api/addresses/get-by-user', {
  query: { user_id: studentId }
}) as any
const addressData = response?.data
```

**Requires New Endpoint**: `/api/addresses/get-by-user.get.ts`

#### Function: [Other functions]
**TBD**: Requires detailed line-by-line analysis

## Testing Checklist
- [ ] Form loads without errors
- [ ] Student selection triggers location loading
- [ ] Discounts apply correctly
- [ ] Payment status displays
- [ ] Appointment save succeeds
- [ ] Calendar updates after save

## Risk Assessment
**HIGH RISK** - This file is central to appointment creation.
Recommend:
1. Do NOT refactor entire file in one go
2. Test each function individually after migration
3. Keep rollback plan ready (git revert)
4. Consider feature flag for new API usage

## Estimated Effort
- Analysis: 30-45 mins
- API endpoint creation: 45-60 mins
- Function migration: 60-90 mins
- Testing: 30-45 mins
- **Total: 3-4 hours** (requires fresh session)

## Next Steps
1. Run detailed query inventory
2. Group queries by function
3. Prioritize by risk (write ops first)
4. Create endpoints incrementally
5. Migrate functions one at a time
6. Test after each function

---
**RECOMMENDATION**: Schedule this as separate, dedicated refactoring session with fresh team focus and comprehensive testing plan.
