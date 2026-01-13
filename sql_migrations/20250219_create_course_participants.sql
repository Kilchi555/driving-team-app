-- Migration: Separate course_participants from users table
-- Date: 2025-12-19
-- Purpose: Clean separation between app users (with login) and course participants

-- ============================================================
-- STEP 1: Create course_participants table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.course_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Optional link to app user (wenn sich jemand registriert)
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- SARI identification
  faberid VARCHAR(20),
  
  -- Personal data
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  birthdate DATE,
  
  -- Address
  street VARCHAR(255),
  street_nr VARCHAR(20),
  zip VARCHAR(10),
  city VARCHAR(100),
  
  -- SARI sync tracking
  sari_synced BOOLEAN DEFAULT FALSE,
  sari_synced_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT course_participants_tenant_faberid_unique UNIQUE(tenant_id, faberid),
  CONSTRAINT course_participants_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL),
  CONSTRAINT course_participants_phone_check CHECK (phone ~ '^[\d\s\+\-\(\)]+$' OR phone IS NULL)
);

-- Indexes for performance
CREATE INDEX idx_course_participants_tenant ON public.course_participants(tenant_id);
CREATE INDEX idx_course_participants_user ON public.course_participants(user_id);
CREATE INDEX idx_course_participants_faberid ON public.course_participants(faberid);
CREATE INDEX idx_course_participants_email ON public.course_participants(email);

-- ============================================================
-- STEP 2: Migrate existing data from users to course_participants
-- ============================================================

-- Insert course participants from users who have course registrations
INSERT INTO public.course_participants (
  id,
  tenant_id,
  user_id,
  faberid,
  first_name,
  last_name,
  email,
  phone,
  birthdate,
  street,
  street_nr,
  zip,
  city,
  created_at,
  created_by
)
SELECT DISTINCT
  gen_random_uuid() as id,
  u.tenant_id,
  u.id as user_id,
  u.faberid,
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  u.birthdate,
  u.street,
  u.street_nr,
  u.zip,
  u.city,
  u.created_at,
  u.created_by
FROM public.users u
WHERE u.id IN (
  SELECT DISTINCT user_id 
  FROM public.course_registrations 
  WHERE user_id IS NOT NULL
)
ON CONFLICT (tenant_id, faberid) DO NOTHING;

-- ============================================================
-- STEP 3: Add participant_id to course_registrations
-- ============================================================

-- Add new column
ALTER TABLE public.course_registrations 
ADD COLUMN IF NOT EXISTS participant_id UUID REFERENCES public.course_participants(id) ON DELETE CASCADE;

-- Populate participant_id from existing user_id mappings
UPDATE public.course_registrations cr
SET participant_id = cp.id
FROM public.course_participants cp
WHERE cr.user_id = cp.user_id
AND cr.participant_id IS NULL;

-- Create index
CREATE INDEX idx_course_registrations_participant ON public.course_registrations(participant_id);

-- ============================================================
-- STEP 4: RLS Policies for course_participants
-- ============================================================

-- Enable RLS
ALTER TABLE public.course_participants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view participants in their tenant
CREATE POLICY "Users can view participants in their tenant"
ON public.course_participants
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND is_active = true
  )
);

-- Policy: Staff and admins can insert participants
CREATE POLICY "Staff and admins can insert participants"
ON public.course_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND tenant_id = course_participants.tenant_id
    AND role IN ('admin', 'staff', 'superadmin')
    AND is_active = true
  )
);

-- Policy: Staff and admins can update participants
CREATE POLICY "Staff and admins can update participants"
ON public.course_participants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND tenant_id = course_participants.tenant_id
    AND role IN ('admin', 'staff', 'superadmin')
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND tenant_id = course_participants.tenant_id
    AND role IN ('admin', 'staff', 'superadmin')
    AND is_active = true
  )
);

-- Policy: Staff and admins can delete participants
CREATE POLICY "Staff and admins can delete participants"
ON public.course_participants
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND tenant_id = course_participants.tenant_id
    AND role IN ('admin', 'staff', 'superadmin')
    AND is_active = true
  )
);

-- Policy: Users can view their own participant record
CREATE POLICY "Users can view their own participant record"
ON public.course_participants
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
);

-- ============================================================
-- STEP 5: Update course_registrations RLS policies
-- ============================================================

-- Drop old policies that reference user_id directly
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.course_registrations;
DROP POLICY IF EXISTS "Users can insert own registrations" ON public.course_registrations;

-- New policy: Users can view registrations linked to their participant record
CREATE POLICY "Users can view registrations via participant"
ON public.course_registrations
FOR SELECT
TO authenticated
USING (
  participant_id IN (
    SELECT id 
    FROM public.course_participants 
    WHERE user_id IN (
      SELECT id 
      FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  )
  OR
  tenant_id IN (
    SELECT tenant_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'staff', 'superadmin')
  )
);

-- ============================================================
-- STEP 6: Add trigger for updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_course_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_participants_updated_at
BEFORE UPDATE ON public.course_participants
FOR EACH ROW
EXECUTE FUNCTION update_course_participants_updated_at();

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check that all registrations have a participant_id
SELECT 
  COUNT(*) as total_registrations,
  COUNT(participant_id) as with_participant,
  COUNT(*) - COUNT(participant_id) as missing_participant
FROM public.course_registrations;

-- Check participant records
SELECT 
  COUNT(*) as total_participants,
  COUNT(user_id) as linked_to_user,
  COUNT(*) - COUNT(user_id) as not_linked
FROM public.course_participants;

COMMENT ON TABLE public.course_participants IS 'Course participants - separate from app users. Can be linked to users table when someone registers.';
COMMENT ON COLUMN public.course_participants.user_id IS 'Optional link to app user when participant registers for an account';
COMMENT ON COLUMN public.course_participants.faberid IS 'SARI identification number (Ausweisnummer)';

