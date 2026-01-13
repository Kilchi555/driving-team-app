-- =====================================================
-- FIX: appointments RLS - Remove anon policy with non-existent column
-- =====================================================

BEGIN;

-- Drop the policy that references non-existent is_bookable column
DROP POLICY IF EXISTS "anon_read_bookable_appointments" ON appointments;

COMMIT;

