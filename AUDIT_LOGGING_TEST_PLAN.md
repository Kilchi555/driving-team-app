# AUDIT LOGGING FIX - TEST PLAN

## Prerequisites (Must do FIRST!)

### 1. Run SQL Migration in Supabase Dashboard
URL: https://app.supabase.com/project/unyjaetebnaexaflpyoc/sql/new

**First:** Add the `auth_user_id` column:
```sql
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS auth_user_id UUID;
```

**Then:** Create/update RLS policies:
```sql
-- Drop and recreate RLS policies (idempotent)
DROP POLICY IF EXISTS "audit_logs_service_role_all" ON public.audit_logs;
CREATE POLICY "audit_logs_service_role_all" ON public.audit_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "audit_logs_authenticated_read_tenant" ON public.audit_logs;
CREATE POLICY "audit_logs_authenticated_read_tenant" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM public.users
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'staff', 'tenant_admin')
    AND is_active = true
  ));

DROP POLICY IF EXISTS "audit_logs_super_admin_read_all" ON public.audit_logs;
CREATE POLICY "audit_logs_super_admin_read_all" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.role = 'super_admin'
  ));

DROP POLICY IF EXISTS "audit_logs_authenticated_read_own" ON public.audit_logs;
CREATE POLICY "audit_logs_authenticated_read_own" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (user_id = (
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
  ));
```

---

## Testing Steps

### Test 1: Restart Dev Server
```bash
# Kill old server (if running)
# Restart: npm run dev
```

### Test 2: Payment Page Data API
1. Open browser DevTools → Application → LocalStorage
2. Get token from `sb-...-auth-token` (copy access_token)
3. Navigate to `/customer/payments`
4. Check browser console for errors
5. Expected: NO audit log errors

**Success Indicator:**
```
✅ Fetched payment page data for customer 89f9ae5d...: 2 payments
```

**Failure Indicator:**
```
❌ ERROR Failed to log audit entry - database error: { code: '23503', ... }
```

### Test 3: Process Payment API
1. On `/customer/payments` page
2. Click "Pay individually" button
3. Should redirect to Wallee payment page
4. Check browser console and server logs
5. Expected: NO audit log errors

**Success Indicator:**
```
✅ Payment processed successfully
Audit entry logged successfully: process_payment success
```

**Failure Indicator:**
```
❌ ERROR Failed to log audit entry - database error: { code: '23503', ... }
```

### Test 4: Verify Audit Logs in Database
In Supabase Dashboard SQL Editor:
```sql
-- Check recent audit logs
SELECT 
  id,
  user_id,
  auth_user_id,
  action,
  status,
  created_at
FROM audit_logs
WHERE action IN ('customer_get_payment_page_data', 'process_payment')
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Results:**
- `user_id` = 89f9ae5d... (users.id) ✅
- `auth_user_id` = 99fceb0b... (auth.uid()) ✅
- `action` = 'process_payment' or 'customer_get_payment_page_data'
- `status` = 'success' (not error)
- NO null values in user_id (except for early auth failures)

---

## Common Issues & Fixes

### Issue 1: Column auth_user_id doesn't exist
```
ERROR: column "auth_user_id" of relation "audit_logs" does not exist
```
**Fix:** Run the ALTER TABLE command first

### Issue 2: Still getting FK constraint violations
```
ERROR: violates foreign key constraint "audit_logs_user_id_fkey"
Key (user_id)=(99fceb0b...) is not present in table "users"
```
**Fix:** 
- Check if dev server picked up latest code changes
- Restart dev server: Kill and `npm run dev`
- Verify auth_user_id is being used for early-stage logs

### Issue 3: RLS policy "already exists" error
**Fix:** Already handled in migration with DROP POLICY IF EXISTS

### Issue 4: Audit logs not appearing in database
**Fix:**
- Check server logs for "Audit entry logged successfully"
- Verify service_role RLS policy exists
- Verify tenant_id is being set

---

## Test Checklist

- [ ] SQL migration executed in Supabase
- [ ] Dev server restarted
- [ ] Payment page data API tested (no errors)
- [ ] Process payment API tested (no errors)
- [ ] Audit logs in database verified
- [ ] user_id is users.id (not auth.uid())
- [ ] auth_user_id correctly stores auth.uid()
- [ ] No foreign key constraint errors
- [ ] Ready to push!

---

## If All Tests Pass

```bash
git push origin main
```

If any test fails, DO NOT PUSH. Debug the issue first.

