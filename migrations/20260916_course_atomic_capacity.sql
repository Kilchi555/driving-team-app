-- Course atomic seat claim (C-P1-01).
-- Create only. Do not apply automatically to production.
-- Idempotent: CREATE OR REPLACE + DROP TRIGGER IF EXISTS + REVOKE/GRANT.
--
-- Source: driving-team-app-course-p0 migrations/20260909_course_rls_and_atomic_capacity.sql
-- Ported onto origin/main after #208/#209 and P0-09.
--
-- NOT ported from that source file (would collide with current main):
--   * JWT write-denial triggers / dropping course_registrations_staff_* write
--     policies — main P0-09 keeps staff JWT roster writes.
--   * GRANT SELECT ON course_sessions TO anon — would undo #209.
--   * Recreating courses/categories/registrations SELECT policies already
--     defined by later migrations.
--
-- Seat-consuming predicate (matches recount_course_participants /
-- adminEnrollInCourse):
--   deleted_at IS NULL AND status IS DISTINCT FROM 'cancelled'
--
-- ADMIN CAPACITY OVERRIDE: DOES NOT EXIST
--   restore into a full course is rejected (no silent overbook).
-- Waitlist overflow uses public.course_waitlist (unchanged).
-- Registration status 'waitlist' still occupies a seat (same as recount).
--
-- Depends on: public.courses, public.course_registrations (existing tables).
-- Required by: 20260916_fulfill_course_wallee_payment.sql

-- ============================================================================
-- C-P1-01 — atomic seat claim
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_course_registration_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_max integer;
  v_count integer;
  v_consumes boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  v_consumes := (NEW.deleted_at IS NULL AND NEW.status IS DISTINCT FROM 'cancelled');
  IF NOT v_consumes THEN
    RETURN NEW;
  END IF;

  -- Serialize claims for this course. Lock before counting.
  SELECT c.max_participants
    INTO v_max
  FROM public.courses c
  WHERE c.id = NEW.course_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'course_not_found'
      USING ERRCODE = '23503',
            HINT = 'COURSE_NOT_FOUND';
  END IF;

  SELECT COUNT(*)::integer
    INTO v_count
  FROM public.course_registrations r
  WHERE r.course_id = NEW.course_id
    AND r.deleted_at IS NULL
    AND r.status IS DISTINCT FROM 'cancelled'
    AND (TG_OP = 'INSERT' OR r.id IS DISTINCT FROM NEW.id);

  IF v_count >= COALESCE(v_max, 0) THEN
    RAISE EXCEPTION 'course_capacity_exceeded'
      USING ERRCODE = 'P0001',
            HINT = 'COURSE_FULL';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_course_registration_capacity ON public.course_registrations;
CREATE TRIGGER trg_enforce_course_registration_capacity
  BEFORE INSERT OR UPDATE OF course_id, status, deleted_at
  ON public.course_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_course_registration_capacity();

REVOKE ALL ON FUNCTION public.enforce_course_registration_capacity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_course_registration_capacity() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_course_registration_capacity() TO postgres, service_role;
