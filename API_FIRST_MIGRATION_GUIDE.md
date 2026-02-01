# API-First Migration Guide

## Overview

This document outlines the strategic plan to migrate your application from direct Supabase client queries to a secure, API-first architecture.

### Current Status
- **Composables**: ✅ 14 migrated (100% API-first)
- **Components/Pages**: 🚨 91 files with 1061 direct queries
- **Overall Progress**: ~15% (Composables only)
- **Target**: 100% API-first with RLS enforcement

### Security Impact
- **Current Risk**: HIGH - Direct client DB access, no tenant isolation, RLS bypass
- **After Migration**: PRODUCTION-READY - All queries authenticated, authorized, and tenant-isolated

---

## Strategy: 3-Week Sprint

### TIER 1 - CRITICAL (Week 1)
**Impact: 44% of queries | Risk: HIGH | Time: 5-7 days**

These files are user-facing and handle critical business logic:

1. **EventModal.vue** (5,689 lines)
   - Event creation, appointment management, payments
   - Used by: Staff booking flow
   - Queries: 50+ (appointments, payments, pricing, users, settings)
   - Approach: Extract into `useEventManagement` composable

2. **CalendarComponent.vue** (26 queries)
   - Calendar display, working hours, external busy times
   - Queries: Staff meetings, appointments, pricing rules
   - Approach: Extract into `useCalendarEvents` composable

3. **CustomerDashboard.vue** (13 queries)
   - Customer view of their appointments
   - Queries: User appointments, payments, course data
   - Approach: Extract into `useCustomerDashboard` composable

4. **EnhancedStudentModal.vue** (27 queries)
   - Student CRUD, document requirements, course info
   - Queries: Students, categories, documents, courses
   - Approach: Extract into `useStudentManagement` composable

5. **admin/UserPaymentDetails.vue** (68 queries)
   - Payment management and history
   - Queries: Payments, transactions, user data
   - Approach: Extract into `useAdminPayments` composable

6. **admin/EvaluationSystemManagerInline.vue** (86 queries)
   - Evaluation criteria, templates, settings
   - Queries: Evaluations, criteria, staff, students
   - Approach: Extract into `useEvaluationManagement` composable

7. **admin/categories.vue** (50 queries)
   - Driving categories, event types configuration
   - Queries: Categories, documents, pricing
   - Approach: Extract into `useCategoryManagement` composable

8. **admin/CashBalanceManager.vue** (28 queries)
   - Cash balance tracking, transactions
   - Queries: Staff cash balances, transactions
   - Approach: Extract into `useCashManagement` composable

9. **components/admin/ReglementeManager.vue** (41 queries)
   - Rules and policies management
   - Approach: Extract into `useRuleManagement` composable

10. **pages/booking/availability/[slug].vue** (31 queries)
    - Availability/booking logic
    - Approach: Extract into `useAvailabilityManagement` composable

### TIER 2 - HIGH PRIORITY (Week 2)
**Impact: 30% of queries | Risk: MEDIUM | Time: 3-4 days**

Admin-only pages with lower user impact:

- pages/admin/courses.vue (72 queries)
- pages/admin/discounts.vue (14 queries)
- pages/admin/products.vue (16 queries)
- pages/admin/examiners.vue (14 queries)
- pages/admin/exam-statistics.vue (12 queries)
- pages/tenant-admin/security.vue (12 queries)
- components/users/StaffTab.vue (37 queries)
- components/users/AdminsTab.vue (15 queries)
- And 10+ more

### TIER 3 - MEDIUM PRIORITY (Week 2-3)
**Impact: 25% of queries | Risk: LOW-MEDIUM | Time: 2-3 days**

Remaining components with < 15 queries:
- Modals, selectors, utility components
- Low-risk changes

---

## Migration Pattern

### Before (Direct Supabase)
```vue
<script setup lang="ts">
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

const loadData = async () => {
  const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('user_id', userId)
  
  if (error) throw error
  return data
}
</script>
```

### After (API-First via Composable)
```vue
<script setup lang="ts">
import { useFeatureData } from '~/composables/useFeatureData'

const { data, loading, error, refresh } = useFeatureData(userId)
</script>
```

### Composable Implementation
```typescript
// composables/useFeatureData.ts
export const useFeatureData = (userId: string) => {
  const data = ref([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const refresh = async () => {
    loading.value = true
    error.value = null
    try {
      // ✅ API-first: All queries through backend
      const response = await $fetch('/api/features/get-data', {
        method: 'POST',
        body: { userId }
      }) as any

      if (!response?.success) throw new Error(response?.error)
      data.value = response.data
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  onMounted(() => refresh())

  return { data: readonly(data), loading: readonly(loading), error: readonly(error), refresh }
}
```

### API Endpoint
```typescript
// server/api/features/get-data.post.ts
export default defineEventHandler(async (event) => {
  const { userId } = await readBody(event)

  // ✅ Authentication enforced
  const user = await requireAuth(event)
  if (user.id !== userId) throw createError({ statusCode: 403 })

  // ✅ Query via secure backend
  const data = await db.query('SELECT * FROM table WHERE user_id = ?', [userId])

  // ✅ Tenant isolation enforced
  if (!data.every(row => row.tenant_id === user.tenant_id)) {
    throw createError({ statusCode: 403 })
  }

  return { success: true, data }
})
```

---

## Implementation Checklist

### Per-Component Checklist
- [ ] Identify all direct Supabase queries
- [ ] Create composable with extracted logic
- [ ] Implement API endpoint(s)
- [ ] Replace component queries with composable
- [ ] Test component functionality
- [ ] Remove getSupabase import
- [ ] Verify no direct queries remain

### Daily Standup
- What TIER 1 files did we complete?
- Any blockers or unexpected issues?
- API endpoint needs for upcoming files?
- Testing status?

### Deployment Gates
- [ ] All TIER 1 components tested
- [ ] All API endpoints reviewed
- [ ] Authorization checks verified
- [ ] Tenant isolation confirmed
- [ ] Performance baseline established
- [ ] E2E tests pass

---

## Key Principles

### 1. Create API Before Removing Queries
- Build the API endpoint first
- Test it works
- THEN remove the client-side .from() calls
- Allows easy rollback

### 2. Extract to Composables
- Don't put logic in components
- Composables are reusable and testable
- One composable per feature area
- Enables code sharing

### 3. Gradual Rollout
- Deploy TIER 1 first (1 week)
- Monitor for issues (3-5 days)
- Deploy TIER 2, etc.
- Easy to identify which migration caused issues

### 4. Authorization on Backend
- Never trust the client
- Always verify user permissions on backend
- Always check tenant isolation
- Log all sensitive operations

### 5. Backward Compatibility
- Keep old code temporarily
- Use feature flags for switching
- Enable quick rollback if needed
- Remove old code after 1-2 weeks confidence

---

## Files That Need Migration

### TIER 1 (Priority 1)
```
components/EventModal.vue (5,689 lines) - 50+ queries
components/CalendarComponent.vue (26 queries)
components/customer/CustomerDashboard.vue (13 queries)
components/EnhancedStudentModal.vue (27 queries)
components/admin/UserPaymentDetails.vue (68 queries)
components/admin/EvaluationSystemManagerInline.vue (86 queries)
pages/admin/categories.vue (50 queries)
components/admin/CashBalanceManager.vue (28 queries)
components/admin/ReglementeManager.vue (41 queries)
pages/booking/availability/[slug].vue (31 queries)
```

### TIER 2 (Priority 2)
```
pages/admin/courses.vue (72 queries)
pages/admin/discounts.vue (14 queries)
pages/admin/products.vue (16 queries)
pages/admin/examiners.vue (14 queries)
pages/admin/exam-statistics.vue (12 queries)
pages/tenant-admin/security.vue (12 queries)
components/users/StaffTab.vue (37 queries)
components/users/AdminsTab.vue (15 queries)
... 10+ more admin pages
```

### TIER 3 (Priority 3)
```
Remaining 40+ components with < 15 queries each
Modals, selectors, utility components
```

---

## Success Metrics

### Quantitative
- [ ] 100% of TIER 1 components migrated
- [ ] 0 direct .from() calls in TIER 1
- [ ] 0 getSupabase imports in TIER 1
- [ ] 100% test coverage for critical paths
- [ ] 0 security audit findings

### Qualitative
- [ ] Team understands API-first pattern
- [ ] Documentation complete
- [ ] New developers can follow pattern
- [ ] Performance acceptable
- [ ] No user-facing bugs

---

## Final Phase: RLS Enforcement

Once all 91 files are migrated:

1. **Week 4: Enable RLS Policies**
   - Create policies that BLOCK direct client access
   - All .from() calls now fail
   - Forces any remaining code to use APIs

2. **Benefit**
   - Complete security lock-in
   - Impossible to bypass APIs
   - Guaranteed tenant isolation
   - Audit trail enabled

3. **Implementation**
   - Disable public/anon access to sensitive tables
   - Only allow service_role for backend APIs
   - RLS policies verify user context

---

## Questions?

Contact the team lead or refer to individual API documentation in `/server/api/`.
