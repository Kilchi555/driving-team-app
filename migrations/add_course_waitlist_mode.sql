-- Migration: Add waitlist mode to courses
-- Allows creating courses without a fixed date to collect interested participants

-- 1. Ensure status column exists
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled';

-- 2. Drop old check constraint if it exists
ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_status_check;

-- 3. Backfill BEFORE adding the new constraint:
--    Map any existing values to the new allowed set
UPDATE public.courses SET status = 'scheduled'
  WHERE status IS NULL OR status NOT IN ('waitlist', 'scheduled', 'draft', 'active', 'completed', 'cancelled');

-- 'active' is a valid value already — keep it as-is.
-- Courses that were set to 'active' by the old public.get.ts filter stay 'active'.

-- 4. Now add the expanded constraint (all rows already conform)
ALTER TABLE public.courses
  ADD CONSTRAINT courses_status_check
  CHECK (status IN ('waitlist', 'scheduled', 'draft', 'active', 'completed', 'cancelled'));

-- 5. RLS policies so unauthenticated users can INSERT into course_waitlist
ALTER TABLE public.course_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_waitlist_public_insert ON public.course_waitlist;
CREATE POLICY course_waitlist_public_insert
  ON public.course_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

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
