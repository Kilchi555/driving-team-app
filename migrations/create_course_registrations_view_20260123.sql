-- Migration: Create course_registrations_with_participant VIEW
-- Purpose: Eliminate redundancy, provide single source of truth for participant data
-- Date: 2026-01-23
-- 
-- This VIEW joins course_registrations with course_participants to provide:
-- 1. Flat structure (no nested queries needed)
-- 2. Single source of truth (data from course_participants)
-- 3. Backward compatibility (fallback to CR columns if CP data missing)

BEGIN;

-- ============================================================
-- STEP 1: Create VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.course_registrations_with_participant AS
SELECT 
  -- Core registration fields
  cr.id,
  cr.course_id,
  cr.participant_id,
  cr.user_id,
  cr.tenant_id,
  cr.status,
  cr.payment_status,
  cr.payment_id,
  cr.payment_method,
  cr.registered_by,
  cr.notes,
  cr.sari_synced,
  cr.sari_synced_at,
  cr.created_at,
  cr.updated_at,
  cr.deleted_at,
  cr.deleted_by,
  cr.registered_at,
  cr.enrollment_date,
  cr.enrollment_time,
  cr.enrollment_notes,
  
  -- Participant data (from course_participants via JOIN)
  -- Using COALESCE for backward compatibility with old data in CR
  COALESCE(cp.first_name, cr.first_name) AS first_name,
  COALESCE(cp.last_name, cr.last_name) AS last_name,
  COALESCE(cp.email, cr.email) AS email,
  COALESCE(cp.phone, cr.phone) AS phone,
  COALESCE(cp.street, cr.street) AS street,
  COALESCE(cp.zip, cr.zip) AS zip,
  COALESCE(cp.city, cr.city) AS city,
  
  -- SARI data (from course_participants)
  cp.faberid,
  cp.birthdate,
  cp.sari_data,
  cp.sari_licenses,
  
  -- Participant metadata
  cp.created_by AS participant_created_by
FROM public.course_registrations cr
LEFT JOIN public.course_participants cp 
  ON cr.participant_id = cp.id 
  AND cr.tenant_id = cp.tenant_id;

COMMENT ON VIEW public.course_registrations_with_participant IS 
'Flattened view of course registrations with participant data. 
Single source of truth for participant info (from course_participants table). 
Use this instead of manual JOINs in application queries.';

-- ============================================================
-- STEP 2: Enable RLS on VIEW
-- ============================================================

ALTER VIEW public.course_registrations_with_participant SET (security_barrier = on);

-- ============================================================
-- STEP 3: Create RLS Policies for VIEW
-- ============================================================

-- Policy 1: Admins and staff can view all registrations in their tenant
CREATE POLICY "Admin staff view all registrations via view"
ON public.course_registrations_with_participant
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.tenant_id = course_registrations_with_participant.tenant_id
      AND u.role IN ('admin', 'staff', 'superadmin')
      AND u.is_active = true
  )
);

-- Policy 2: Users can view their own registration
CREATE POLICY "Users view own registration via view"
ON public.course_registrations_with_participant
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id 
    FROM public.users 
    WHERE auth_user_id = auth.uid() 
      AND is_active = true
  )
  OR
  participant_id IN (
    SELECT cp.id
    FROM public.course_participants cp
    INNER JOIN public.users u ON cp.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = true
  )
);

-- ============================================================
-- STEP 4: Verification
-- ============================================================

-- Check VIEW returns expected data
SELECT 
  COUNT(*) as total_registrations,
  COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as with_first_name,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
  COUNT(CASE WHEN faberid IS NOT NULL THEN 1 END) as with_sari_faberid,
  COUNT(CASE WHEN sari_licenses IS NOT NULL THEN 1 END) as with_licenses
FROM public.course_registrations_with_participant;

-- Check for NULL participants (orphaned registrations)
SELECT 
  COUNT(*) as orphaned_registrations,
  STRING_AGG(DISTINCT course_id::text, ', ') as affected_courses
FROM public.course_registrations_with_participant
WHERE participant_id IS NULL;

COMMIT;

