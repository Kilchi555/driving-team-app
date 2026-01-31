# useCancellationPolicies.ts - QUICK REFACTORING PLAN

## FUNCTIONS TO MIGRATE (10 total)

### READ OPERATIONS (2)
1. `fetchPolicies()` - Get policies by type
2. `fetchAllPolicies()` - Get all policies with rules

### CREATE OPERATIONS (2)
3. `createPolicy()` - Create new policy
4. `createRule()` - Create new rule

### UPDATE OPERATIONS (3)
5. `updatePolicy()` - Update policy
6. `updateRule()` - Update rule
7. `setDefaultPolicy()` - Set as default (includes unset others)

### DELETE OPERATIONS (2)
8. `deletePolicy()` - Soft delete policy
9. `deleteRule()` - Hard delete rule

---

## REQUIRED API ENDPOINTS (Strategy: 1 consolidated endpoint)

### Option A: SEPARATE ENDPOINTS (9 endpoints)
- GET /api/cancellation-policies/list
- GET /api/cancellation-policies/fetch-all
- POST /api/cancellation-policies/create
- POST /api/cancellation-policies/update
- POST /api/cancellation-policies/delete
- POST /api/cancellation-rules/create
- POST /api/cancellation-rules/update
- POST /api/cancellation-rules/delete
- POST /api/cancellation-policies/set-default

### Option B: CONSOLIDATED ENDPOINT (1 endpoint) ✅ BETTER
- POST /api/cancellation-policies/manage
  - Action: 'list' | 'fetch-all' | 'create-policy' | 'update-policy' | 'delete-policy' | 'create-rule' | 'update-rule' | 'delete-rule' | 'set-default'

**I'll use Option B** - Much cleaner, reduces boilerplate

---

## COMPLEXITY MAPPING

Similar to useEventModalForm but SIMPLER because:
- No form state complexity
- No payment calculations
- No product/discount logic
- Mostly CRUD operations

**Estimated Time**: 1.5-2 hours
- Endpoint creation: 30-45 mins (consolidated)
- Function migration: 45-60 mins
- Testing: 15-30 mins

---

## NEXT: CREATE THE CONSOLIDATED ENDPOINT
