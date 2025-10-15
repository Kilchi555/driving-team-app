-- Restore proper RLS policies for discounts table with tenant isolation
-- Now that case-sensitivity is fixed, we can use the secure tenant-based policies

-- Drop the temporary emergency policies
DROP POLICY IF EXISTS "discounts_allow_authenticated_read" ON discounts;
DROP POLICY IF EXISTS "discounts_allow_authenticated_insert" ON discounts;
DROP POLICY IF EXISTS "discounts_allow_authenticated_update" ON discounts;
DROP POLICY IF EXISTS "discounts_allow_authenticated_delete" ON discounts;

-- Create the proper tenant-isolated policy
CREATE POLICY "discounts_tenant_isolation" ON discounts
FOR ALL
TO authenticated
USING (
  (
    tenant_id IN (
      SELECT users.tenant_id
      FROM users
      WHERE users.auth_user_id = auth.uid() 
      AND users.is_active = true 
      AND users.deleted_at IS NULL
    )
  ) 
  OR (
    is_voucher = true 
    AND (
      (voucher_buyer_email)::text = (auth.jwt() ->> 'email'::text) 
      OR (voucher_recipient_email)::text = (auth.jwt() ->> 'email'::text)
    )
  )
);

-- Verify the restored policy
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'discounts'
ORDER BY policyname;

-- Test query to verify it works with proper tenant isolation
SELECT 'Testing discount access with tenant isolation...' as status;
SELECT id, code, name, is_active, tenant_id 
FROM discounts 
WHERE code ILIKE 'student10' 
LIMIT 1;

