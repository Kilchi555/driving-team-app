-- Migration: Add waitlist mode to courses
-- Allows creating courses without a fixed date to collect interested participants

-- 1. Ensure status column exists with all needed values
-- (column may already exist as free-text; this makes it explicit)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled';

-- 2. Drop old check constraint if it exists (to replace with expanded one)
ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_status_check;

-- 3. Add expanded check constraint
ALTER TABLE public.courses
  ADD CONSTRAINT courses_status_check
  CHECK (status IN ('waitlist', 'scheduled', 'draft', 'active', 'completed', 'cancelled'));

-- 4. Backfill: anything that was 'active' stays as-is; any NULL → 'scheduled'
UPDATE public.courses
  SET status = 'scheduled'
  WHERE status IS NULL;

-- 5. Add RLS policy so unauthenticated users can INSERT into course_waitlist
-- (needed for the public waitlist signup API)
ALTER TABLE public.course_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_waitlist_public_insert ON public.course_waitlist;
CREATE POLICY course_waitlist_public_insert
  ON public.course_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Tenant admins can read their own waitlist entries
DROP POLICY IF EXISTS course_waitlist_tenant_read ON public.course_waitlist;
CREATE POLICY course_waitlist_tenant_read
  ON public.course_waitlist
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

-- Tenant admins can update (e.g. change status from waiting → offered)
DROP POLICY IF EXISTS course_waitlist_tenant_update ON public.course_waitlist;
CREATE POLICY course_waitlist_tenant_update
  ON public.course_waitlist
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'Migration completed: course waitlist mode added at %', NOW();
END $$;
