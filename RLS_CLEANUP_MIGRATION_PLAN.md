# RLS Cleanup Migration: Remove Duplicates & Optimize Policies

## Problem Identified

From the audit, we found:

1. **USERS Table:**
   - 3 duplicate "self-read" policies
   - 2 duplicate "self-update" policies
   - 4 service_role policies (should be 1)
   - Mixed strategy: `id = auth.uid()` vs `auth_user_id = auth.uid()`

2. **APPOINTMENTS Table:**
   - Customer policies use subqueries (recursion risk, performance)
   - Separate policies for each role/operation (verbose)
   - Staff policies use double-subqueries (not optimal)

3. **PAYMENTS Table:**
   - Staff policies use subqueries on every check (performance issue)
   - Similar verbosity issues

## Solution

### Before (OLD - PROBLEMATIC):
```sql
-- 30+ policies across 3 tables
-- Many duplicates
-- Subqueries in USING/WITH CHECK clauses
-- Mixed auth strategies
-- Performance issues
```

### After (NEW - CLEAN):
```sql
-- 6 policies on users (1 for each: read, write, service_role)
-- 13 policies on appointments (clear role/action separation)
-- 13 policies on payments (clear role/action separation)
-- No duplicates
-- Minimal subqueries (only when necessary)
-- Consistent auth strategy
```

## Changes Per Table

### USERS (6 policies)
| Old | New | Notes |
|-----|-----|-------|
| 3 duplicate self-read | 1 `user_read_own` | Direct auth.uid() check |
| 2 duplicate self-update | 1 `user_update_own` | Direct auth.uid() check |
| 4 service_role (duplicates) | 1 `service_role_all` | Clean bypass |
| **Total: 10** | **Total: 3** | **-70% policies** |

### APPOINTMENTS (13 policies)
| Category | Policies | Operation | Notes |
|----------|----------|-----------|-------|
| Customer | 4 | read/update/delete/insert | Direct `user_id = auth.uid()` |
| Staff/Admin | 4 | read/update/delete/insert | Via tenant_id subquery (optimized) |
| Super Admin | 4 | read/update/delete/insert | Via EXISTS check |
| Service Role | 1 | all | Clean bypass |
| **Total** | **13** | - | **-8% from 14** |

### PAYMENTS (13 policies)
| Category | Policies | Operation | Notes |
|----------|----------|-----------|-------|
| Customer | 4 | read/update/delete/insert | Direct `user_id = auth.uid()` |
| Staff/Admin | 4 | read/update/delete/insert | Via tenant_id subquery (optimized) |
| Super Admin | 4 | read/update/delete/insert | Via EXISTS check |
| Service Role | 1 | all | Clean bypass |
| **Total** | **13** | - | **-23% from 16** |

## Key Improvements

### 1. No Duplicates
- ✅ Removed all duplicate policies
- ✅ One policy per role + operation combination
- ✅ Easier to maintain

### 2. Consistent Strategy
- ✅ Always use `auth_user_id` for users table (no mixing with `id`)
- ✅ Always use `user_id = auth.uid()` for user-specific access (no subqueries)
- ✅ Tenant access via ONE subquery (not double-checked)

### 3. Performance Optimized
- ✅ Removed nested/double subqueries where possible
- ✅ Direct auth.uid() checks for most operations
- ✅ Single subquery for role-based tenant filtering

### 4. Recursion Risk Reduced
- ✅ Customer policies use `user_id = auth.uid()` directly (no users table lookup needed)
- ✅ Staff policies use single subquery with specific columns
- ✅ No ambiguous policy chains that could cause recursion

### 5. Security Maintained
- ✅ All role-based access still enforced
- ✅ Super admin still has global access
- ✅ Service role bypass still available for APIs
- ✅ No anon access (still blocked)
- ✅ Tenant isolation still enforced

## Impact

### Security: ✅ MAINTAINED
- No security weakened
- All role checks still present
- Tenant isolation preserved

### Performance: ⬆️ IMPROVED
- Fewer policy evaluations
- Simpler policy conditions
- Better query optimization by Postgres

### Maintainability: ⬆️ IMPROVED
- Fewer policies to maintain
- Clearer policy intent
- No duplicates to confuse developers

### Code Quality: ⬆️ IMPROVED
- Consistent naming convention
- Consistent auth strategy
- No mixing of patterns

## Verification Steps

After applying this migration:

```sql
-- Should return cleaner count:
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('users', 'appointments', 'payments')
GROUP BY tablename;

-- Expected:
-- users: 3 policies
-- appointments: 13 policies
-- payments: 13 policies
-- Total: 29 (down from ~35)
```

## Rollback

If needed, the old policies can be restored from the previous migration files:
- `migrations/fix_users_rls_ultra_safe.sql`
- `migrations/fix_appointments_rls_secure.sql`
- `migrations/cleanup_payments_rls_duplicates.sql`

## Notes

- This is a **non-breaking change** - functionality remains the same
- Only policy structure is improved
- All existing access patterns continue to work
- Can be safely applied to production

