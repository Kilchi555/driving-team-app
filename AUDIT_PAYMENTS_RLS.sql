-- AUDIT: Check payments table RLS policies
-- Run this in Supabase SQL Editor

SELECT 
  policyname,
  cmd,
  roles::text as "Roles",
  qual as "SELECT Condition (USING)",
  with_check as "INSERT/UPDATE Condition (WITH CHECK)"
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY policyname;

-- Detail view of current policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN 'anon'::regrole = ANY(roles) THEN '🔴 ANON CAN ACCESS'
    WHEN 'authenticated'::regrole = ANY(roles) THEN '✅ Authenticated'
    WHEN 'service_role'::regrole = ANY(roles) THEN '✅ Service Role'
    ELSE '❓ Custom Role'
  END as "Access Type",
  CASE 
    WHEN qual IS NULL THEN '⚠️ No condition (allows ALL)'
    WHEN qual = 'true' THEN '⚠️ Always allows'
    WHEN qual LIKE '%user_id = auth.uid()%' THEN '✅ User self-access'
    WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
    ELSE '❓ Custom condition'
  END as "Risk Assessment"
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY cmd, policyname;

-- Show all payment records with user ownership
SELECT 
  id,
  user_id,
  appointment_id,
  payment_method,
  payment_status,
  total_amount_rappen,
  created_at,
  tenant_id
FROM payments
LIMIT 20;

