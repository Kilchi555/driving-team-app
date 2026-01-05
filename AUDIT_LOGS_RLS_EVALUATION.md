# RLS Audit Logs - Evaluation Guide

Führen Sie diese SQL-Befehle im Supabase Dashboard SQL Editor aus, um die aktuelle RLS-Konfiguration zu überprüfen:

https://app.supabase.com/project/unyjaetebnaexaflpyoc/sql/new

## Step 1: Check RLS Status

```sql
-- Check if RLS is enabled on audit_logs
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled?"
FROM pg_tables
WHERE tablename = 'audit_logs';
```

**Erwartet:** `rowsecurity = true` (RLS ist aktiviert)

---

## Step 2: Check Existing Policies

```sql
-- Check all existing policies on audit_logs
SELECT 
  policyname,
  cmd,
  roles::text,
  SUBSTR(qual, 1, 100) as "SELECT Condition",
  SUBSTR(with_check, 1, 100) as "INSERT/UPDATE Condition"
FROM pg_policies
WHERE tablename = 'audit_logs'
ORDER BY policyname;
```

**Erwartet:** 
- Minimum 1 Policy: `service_role` mit `FOR ALL` access
- Optional: `authenticated` Policies für admins/staff

---

## Step 3: Check Table Structure

```sql
-- Check audit_logs table columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;
```

---

## Step 4: Check Sample Data

```sql
-- See recent audit logs (last 10)
SELECT 
  id,
  user_id,
  action,
  status,
  created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## Possible Issues & Solutions

### Issue 1: RLS is DISABLED (rowsecurity = false)

```sql
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
```

### Issue 2: NO Policies exist

```sql
-- Add service_role policy
CREATE POLICY "audit_logs_service_role_all" ON public.audit_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Issue 3: service_role policy exists but doesn't work

Check the policy details - make sure it has:
- `FOR ALL` (not just SELECT or INSERT)
- `TO service_role`
- `USING (true)` and `WITH CHECK (true)`

---

## Next: Run These Checks

1. Execute Step 1 → Note the `rowsecurity` value
2. Execute Step 2 → List all policies
3. Compare with expected output
4. Report back what you see!

