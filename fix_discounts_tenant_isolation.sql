-- Fix the discounts_tenant_isolation policy to include deleted_at check
-- This ensures deleted users cannot access discounts

-- Drop the existing policy
DROP POLICY IF EXISTS "discounts_tenant_isolation" ON discounts;

-- Create the improved policy with deleted_at check
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

-- Verify the updated policy
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

