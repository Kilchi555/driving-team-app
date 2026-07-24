-- Keep courses.current_participants in sync with active registrations only.
-- Soft-deleted / cancelled rows must never occupy seats.

CREATE OR REPLACE FUNCTION public.recount_course_participants(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM course_registrations
  WHERE course_id = p_course_id
    AND deleted_at IS NULL
    AND status IS DISTINCT FROM 'cancelled';

  UPDATE courses
  SET
    current_participants = v_count,
    updated_at = now()
  WHERE id = p_course_id;

  UPDATE course_sessions cs
  SET
    current_participants = (
      SELECT COUNT(*)
      FROM course_registrations r
      WHERE r.course_id = cs.course_id
        AND r.deleted_at IS NULL
        AND r.status IS DISTINCT FROM 'cancelled'
        AND (
          CASE
            WHEN r.individual_session_number IS NOT NULL
              THEN r.individual_session_number = cs.session_number
            WHEN r.partial_start_session IS NOT NULL
              THEN cs.session_number >= r.partial_start_session
            ELSE true
          END
        )
        AND (
          r.custom_sessions IS NULL
          OR (r.custom_sessions->>cs.session_number::text) IS NULL
        )
    ),
    updated_at = now()
  WHERE cs.course_id = p_course_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recount_course_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recount_course_participants(OLD.course_id);
    RETURN OLD;
  END IF;

  PERFORM public.recount_course_participants(NEW.course_id);

  IF TG_OP = 'UPDATE' AND OLD.course_id IS DISTINCT FROM NEW.course_id THEN
    PERFORM public.recount_course_participants(OLD.course_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Prevent stale/wrong writes to courses.current_participants from app code
CREATE OR REPLACE FUNCTION public.trg_courses_force_live_participant_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COUNT(*) INTO NEW.current_participants
  FROM course_registrations
  WHERE course_id = NEW.id
    AND deleted_at IS NULL
    AND status IS DISTINCT FROM 'cancelled';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_registrations_recount ON public.course_registrations;
CREATE TRIGGER trg_course_registrations_recount
AFTER INSERT OR UPDATE OF course_id, status, deleted_at, individual_session_number, partial_start_session, custom_sessions
OR DELETE
ON public.course_registrations
FOR EACH ROW
EXECUTE FUNCTION public.trg_recount_course_participants();

DROP TRIGGER IF EXISTS trg_courses_force_live_participant_count ON public.courses;
CREATE TRIGGER trg_courses_force_live_participant_count
BEFORE UPDATE OF current_participants
ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.trg_courses_force_live_participant_count();

-- Repair all courses whose cached count is wrong
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.id
    FROM courses c
    WHERE c.current_participants IS DISTINCT FROM (
      SELECT COUNT(*)
      FROM course_registrations cr
      WHERE cr.course_id = c.id
        AND cr.deleted_at IS NULL
        AND cr.status IS DISTINCT FROM 'cancelled'
    )
  LOOP
    PERFORM public.recount_course_participants(r.id);
  END LOOP;
END;
$$;
