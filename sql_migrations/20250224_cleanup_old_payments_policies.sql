-- Migration: Cleanup Old Payments Policies
-- Date: 2025-02-24
-- Purpose: Remove duplicate/old policies that are causing conflicts

-- ============================================
-- PART 1: Drop old/duplicate policies
-- ============================================

DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;
DROP POLICY IF EXISTS "payments_delete_policy" ON payments;

-- ============================================
-- PART 2: Verify cleanup
-- ============================================

SELECT 
  policyname,
  CASE WHEN cmd = 'SELECT' THEN '📖 READ'
       WHEN cmd = 'INSERT' THEN '✍️  WRITE'
       WHEN cmd = 'UPDATE' THEN '✏️  UPDATE'
       WHEN cmd = 'DELETE' THEN '🗑️  DELETE'
       ELSE cmd END as operation,
  roles
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY policyname;

