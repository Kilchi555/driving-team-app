-- Date-specific staff working-hour exceptions.
-- Replacement semantics: one parent row per staff and civil date.
-- This file is not applied by the change that added it.
-- It does not update staff_working_hours, availability_slots, or appointments.

-- ---------------------------------------------------------------------------
-- Parent: one decision per staff and civil date
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.staff_working_hour_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'Europe/Zurich',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_working_hour_exceptions_timezone_len CHECK (char_length(timezone) > 0),
  CONSTRAINT staff_working_hour_exceptions_staff_date_key UNIQUE (tenant_id, staff_id, exception_date),
  CONSTRAINT staff_working_hour_exceptions_id_tenant_staff_key UNIQUE (id, tenant_id, staff_id)
);

COMMENT ON TABLE public.staff_working_hour_exceptions IS
  'Replaces weekly staff_working_hours for one civil date. Absence of a row means the weekly rule applies. is_closed means no working hours that day.';

COMMENT ON COLUMN public.staff_working_hour_exceptions.exception_date IS
  'Civil date (no time). Weekday is derived from this date, not from a timestamp.';

COMMENT ON COLUMN public.staff_working_hour_exceptions.timezone IS
  'Wall-clock zone for the intervals. Product writes Europe/Zurich, the same zone as staff_working_hours. Not a per-tenant timezone setting.';

CREATE INDEX IF NOT EXISTS idx_staff_working_hour_exceptions_staff_date
  ON public.staff_working_hour_exceptions (tenant_id, staff_id, exception_date);

-- ---------------------------------------------------------------------------
-- Child intervals. Composite FK keeps tenant_id and staff_id aligned.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.staff_working_hour_exception_intervals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_working_hour_exception_intervals_time_order CHECK (start_time < end_time),
  CONSTRAINT staff_working_hour_exception_intervals_unique_span UNIQUE (exception_id, start_time, end_time),
  CONSTRAINT staff_working_hour_exception_intervals_parent_fkey
    FOREIGN KEY (exception_id, tenant_id, staff_id)
    REFERENCES public.staff_working_hour_exceptions (id, tenant_id, staff_id)
    ON DELETE CASCADE
);

COMMENT ON TABLE public.staff_working_hour_exception_intervals IS
  'Replacement intervals for one exception date. Not merged with weekly hours.';

CREATE INDEX IF NOT EXISTS idx_staff_working_hour_exception_intervals_exception
  ON public.staff_working_hour_exception_intervals (exception_id);

CREATE INDEX IF NOT EXISTS idx_staff_working_hour_exception_intervals_tenant_staff
  ON public.staff_working_hour_exception_intervals (tenant_id, staff_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_staff_working_hour_exceptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_working_hour_exceptions_updated_at
  ON public.staff_working_hour_exceptions;

CREATE TRIGGER trg_staff_working_hour_exceptions_updated_at
  BEFORE UPDATE ON public.staff_working_hour_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_staff_working_hour_exceptions_updated_at();

-- ---------------------------------------------------------------------------
-- Interval integrity: no overlap, no intervals on a closed parent.
-- Runs per row so a multi-row insert sees earlier rows of the same statement.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_staff_working_hour_exception_interval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_closed boolean;
BEGIN
  SELECT is_closed
    INTO parent_closed
  FROM public.staff_working_hour_exceptions
  WHERE id = NEW.exception_id
    AND tenant_id = NEW.tenant_id
    AND staff_id = NEW.staff_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'child tenant != parent tenant or staff mismatch';
  END IF;

  IF parent_closed THEN
    RAISE EXCEPTION 'closed_exception_cannot_have_intervals';
  END IF;

  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'invalid_time_range';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.staff_working_hour_exception_intervals existing
    WHERE existing.exception_id = NEW.exception_id
      AND existing.id IS DISTINCT FROM NEW.id
      AND NEW.start_time < existing.end_time
      AND NEW.end_time > existing.start_time
  ) THEN
    RAISE EXCEPTION 'overlapping_intervals';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_working_hour_exception_interval
  ON public.staff_working_hour_exception_intervals;

CREATE TRIGGER trg_staff_working_hour_exception_interval
  BEFORE INSERT OR UPDATE ON public.staff_working_hour_exception_intervals
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_staff_working_hour_exception_interval();

-- ---------------------------------------------------------------------------
-- Deferred shape check so parent + children can be written in one transaction:
--   is_closed = true  → zero intervals
--   is_closed = false → at least one interval
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_staff_working_hour_exception_shape()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_id uuid;
  closed boolean;
  interval_count integer;
BEGIN
  IF TG_TABLE_NAME = 'staff_working_hour_exceptions' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    parent_id := NEW.id;
  ELSE
    parent_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.exception_id ELSE NEW.exception_id END;
  END IF;

  SELECT is_closed
    INTO closed
  FROM public.staff_working_hour_exceptions
  WHERE id = parent_id;

  -- Parent already removed (cascade). Deleting the aggregate is valid.
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT count(*)
    INTO interval_count
  FROM public.staff_working_hour_exception_intervals
  WHERE exception_id = parent_id;

  IF closed AND interval_count > 0 THEN
    RAISE EXCEPTION 'closed_exception_cannot_have_intervals';
  END IF;

  IF NOT closed AND interval_count = 0 THEN
    RAISE EXCEPTION 'open_exception_requires_interval';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_working_hour_exception_shape
  ON public.staff_working_hour_exceptions;
DROP TRIGGER IF EXISTS trg_staff_working_hour_exception_interval_shape
  ON public.staff_working_hour_exception_intervals;

CREATE CONSTRAINT TRIGGER trg_staff_working_hour_exception_shape
  AFTER INSERT OR UPDATE ON public.staff_working_hour_exceptions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_staff_working_hour_exception_shape();

CREATE CONSTRAINT TRIGGER trg_staff_working_hour_exception_interval_shape
  AFTER INSERT OR UPDATE OR DELETE ON public.staff_working_hour_exception_intervals
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_staff_working_hour_exception_shape();

-- ---------------------------------------------------------------------------
-- Atomic replace. One transaction for every date in the payload.
-- Any error rolls the whole call back. Does not touch weekly hours,
-- appointments, or availability_slots.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.replace_staff_working_hour_exceptions(
  p_tenant_id uuid,
  p_staff_id uuid,
  p_days jsonb
) RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  day jsonb;
  block jsonb;
  v_date date;
  v_closed boolean;
  v_blocks jsonb;
  v_start time;
  v_end time;
  v_id uuid;
  v_count integer := 0;
  v_block_count integer;
  v_seen date[] := ARRAY[]::date[];
  v_today date := (timezone('Europe/Zurich', now()))::date;
  v_n integer;
BEGIN
  IF p_tenant_id IS NULL OR p_staff_id IS NULL THEN
    RAISE EXCEPTION 'tenant_and_staff_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = p_staff_id
      AND tenant_id = p_tenant_id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'staff_not_in_tenant';
  END IF;

  IF p_days IS NULL OR jsonb_typeof(p_days) <> 'array' THEN
    RAISE EXCEPTION 'days_must_be_array';
  END IF;

  v_n := jsonb_array_length(p_days);
  IF v_n < 1 OR v_n > 62 THEN
    RAISE EXCEPTION 'invalid_day_count';
  END IF;

  FOR day IN SELECT value FROM jsonb_array_elements(p_days)
  LOOP
    BEGIN
      v_date := (day->>'date')::date;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'invalid_date';
    END;

    IF v_date IS NULL THEN
      RAISE EXCEPTION 'invalid_date';
    END IF;
    IF v_date < v_today THEN
      RAISE EXCEPTION 'date_in_past';
    END IF;
    IF v_date = ANY (v_seen) THEN
      RAISE EXCEPTION 'duplicate_date';
    END IF;
    v_seen := array_append(v_seen, v_date);

    v_closed := COALESCE((day->>'is_closed')::boolean, false);
    v_blocks := COALESCE(day->'blocks', '[]'::jsonb);
    IF jsonb_typeof(v_blocks) <> 'array' THEN
      RAISE EXCEPTION 'blocks_must_be_array';
    END IF;

    v_block_count := jsonb_array_length(v_blocks);
    IF v_closed AND v_block_count > 0 THEN
      RAISE EXCEPTION 'closed_exception_cannot_have_intervals';
    END IF;
    IF NOT v_closed AND v_block_count = 0 THEN
      RAISE EXCEPTION 'open_exception_requires_interval';
    END IF;
    IF v_block_count > 8 THEN
      RAISE EXCEPTION 'too_many_blocks';
    END IF;

    DELETE FROM public.staff_working_hour_exceptions
    WHERE tenant_id = p_tenant_id
      AND staff_id = p_staff_id
      AND exception_date = v_date;

    INSERT INTO public.staff_working_hour_exceptions (
      tenant_id, staff_id, exception_date, is_closed, timezone
    ) VALUES (
      p_tenant_id, p_staff_id, v_date, v_closed, 'Europe/Zurich'
    )
    RETURNING id INTO v_id;

    IF NOT v_closed THEN
      FOR block IN SELECT value FROM jsonb_array_elements(v_blocks)
      LOOP
        BEGIN
          v_start := (block->>'start_time')::time;
          v_end := (block->>'end_time')::time;
        EXCEPTION WHEN others THEN
          RAISE EXCEPTION 'invalid_time_range';
        END;

        IF v_start IS NULL OR v_end IS NULL OR v_start >= v_end THEN
          RAISE EXCEPTION 'invalid_time_range';
        END IF;

        INSERT INTO public.staff_working_hour_exception_intervals (
          exception_id, tenant_id, staff_id, start_time, end_time
        ) VALUES (
          v_id, p_tenant_id, p_staff_id, v_start, v_end
        );
      END LOOP;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_staff_working_hour_exceptions(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_staff_working_hour_exceptions(uuid, uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.replace_staff_working_hour_exceptions(uuid, uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replace_staff_working_hour_exceptions(uuid, uuid, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- RLS. Same shape as staff_working_hours (20260909): no FOR ALL, no anon.
-- Writes in the product go through the service-role API after
-- authorizeWorkingHoursMutation. These policies cover direct JWT access.
-- ---------------------------------------------------------------------------

ALTER TABLE public.staff_working_hour_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_working_hour_exception_intervals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_working_hour_exceptions_select ON public.staff_working_hour_exceptions;
DROP POLICY IF EXISTS staff_working_hour_exceptions_insert ON public.staff_working_hour_exceptions;
DROP POLICY IF EXISTS staff_working_hour_exceptions_update ON public.staff_working_hour_exceptions;
DROP POLICY IF EXISTS staff_working_hour_exceptions_delete ON public.staff_working_hour_exceptions;
DROP POLICY IF EXISTS staff_working_hour_exception_intervals_select ON public.staff_working_hour_exception_intervals;
DROP POLICY IF EXISTS staff_working_hour_exception_intervals_insert ON public.staff_working_hour_exception_intervals;
DROP POLICY IF EXISTS staff_working_hour_exception_intervals_update ON public.staff_working_hour_exception_intervals;
DROP POLICY IF EXISTS staff_working_hour_exception_intervals_delete ON public.staff_working_hour_exception_intervals;

CREATE POLICY staff_working_hour_exceptions_select
  ON public.staff_working_hour_exceptions
  FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT u.id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
    OR tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'tenant_admin', 'super_admin')
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );

CREATE POLICY staff_working_hour_exceptions_insert
  ON public.staff_working_hour_exceptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.users target ON target.id = staff_working_hour_exceptions.staff_id
      WHERE actor.auth_user_id = auth.uid()
        AND actor.is_active = true
        AND actor.deleted_at IS NULL
        AND target.deleted_at IS NULL
        AND actor.tenant_id = staff_working_hour_exceptions.tenant_id
        AND target.tenant_id = staff_working_hour_exceptions.tenant_id
        AND (
          (
            actor.id = staff_working_hour_exceptions.staff_id
            AND actor.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
          )
          OR actor.role IN ('admin', 'tenant_admin', 'super_admin')
        )
    )
  );

CREATE POLICY staff_working_hour_exceptions_update
  ON public.staff_working_hour_exceptions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.users target ON target.id = staff_working_hour_exceptions.staff_id
      WHERE actor.auth_user_id = auth.uid()
        AND actor.is_active = true
        AND actor.deleted_at IS NULL
        AND target.tenant_id = actor.tenant_id
        AND staff_working_hour_exceptions.tenant_id = actor.tenant_id
        AND (
          (
            actor.id = staff_working_hour_exceptions.staff_id
            AND actor.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
          )
          OR actor.role IN ('admin', 'tenant_admin', 'super_admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.users target ON target.id = staff_working_hour_exceptions.staff_id
      WHERE actor.auth_user_id = auth.uid()
        AND actor.is_active = true
        AND actor.deleted_at IS NULL
        AND target.deleted_at IS NULL
        AND actor.tenant_id = staff_working_hour_exceptions.tenant_id
        AND target.tenant_id = staff_working_hour_exceptions.tenant_id
        AND (
          (
            actor.id = staff_working_hour_exceptions.staff_id
            AND actor.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
          )
          OR actor.role IN ('admin', 'tenant_admin', 'super_admin')
        )
    )
  );

CREATE POLICY staff_working_hour_exceptions_delete
  ON public.staff_working_hour_exceptions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.users target ON target.id = staff_working_hour_exceptions.staff_id
      WHERE actor.auth_user_id = auth.uid()
        AND actor.is_active = true
        AND actor.deleted_at IS NULL
        AND target.tenant_id = actor.tenant_id
        AND staff_working_hour_exceptions.tenant_id = actor.tenant_id
        AND (
          (
            actor.id = staff_working_hour_exceptions.staff_id
            AND actor.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
          )
          OR actor.role IN ('admin', 'tenant_admin', 'super_admin')
        )
    )
  );

CREATE POLICY staff_working_hour_exception_intervals_select
  ON public.staff_working_hour_exception_intervals
  FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT u.id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
    OR tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'tenant_admin', 'super_admin')
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );

CREATE POLICY staff_working_hour_exception_intervals_insert
  ON public.staff_working_hour_exception_intervals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.users target ON target.id = staff_working_hour_exception_intervals.staff_id
      WHERE actor.auth_user_id = auth.uid()
        AND actor.is_active = true
        AND actor.deleted_at IS NULL
        AND target.deleted_at IS NULL
        AND actor.tenant_id = staff_working_hour_exception_intervals.tenant_id
        AND target.tenant_id = staff_working_hour_exception_intervals.tenant_id
        AND (
          (
            actor.id = staff_working_hour_exception_intervals.staff_id
            AND actor.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
          )
          OR actor.role IN ('admin', 'tenant_admin', 'super_admin')
        )
    )
  );

CREATE POLICY staff_working_hour_exception_intervals_update
  ON public.staff_working_hour_exception_intervals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.users target ON target.id = staff_working_hour_exception_intervals.staff_id
      WHERE actor.auth_user_id = auth.uid()
        AND actor.is_active = true
        AND actor.deleted_at IS NULL
        AND target.tenant_id = actor.tenant_id
        AND staff_working_hour_exception_intervals.tenant_id = actor.tenant_id
        AND (
          (
            actor.id = staff_working_hour_exception_intervals.staff_id
            AND actor.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
          )
          OR actor.role IN ('admin', 'tenant_admin', 'super_admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.users target ON target.id = staff_working_hour_exception_intervals.staff_id
      WHERE actor.auth_user_id = auth.uid()
        AND actor.is_active = true
        AND actor.deleted_at IS NULL
        AND target.deleted_at IS NULL
        AND actor.tenant_id = staff_working_hour_exception_intervals.tenant_id
        AND target.tenant_id = staff_working_hour_exception_intervals.tenant_id
        AND (
          (
            actor.id = staff_working_hour_exception_intervals.staff_id
            AND actor.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
          )
          OR actor.role IN ('admin', 'tenant_admin', 'super_admin')
        )
    )
  );

CREATE POLICY staff_working_hour_exception_intervals_delete
  ON public.staff_working_hour_exception_intervals
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.users target ON target.id = staff_working_hour_exception_intervals.staff_id
      WHERE actor.auth_user_id = auth.uid()
        AND actor.is_active = true
        AND actor.deleted_at IS NULL
        AND target.tenant_id = actor.tenant_id
        AND staff_working_hour_exception_intervals.tenant_id = actor.tenant_id
        AND (
          (
            actor.id = staff_working_hour_exception_intervals.staff_id
            AND actor.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
          )
          OR actor.role IN ('admin', 'tenant_admin', 'super_admin')
        )
    )
  );

REVOKE ALL ON TABLE public.staff_working_hour_exceptions FROM anon;
REVOKE ALL ON TABLE public.staff_working_hour_exception_intervals FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.staff_working_hour_exceptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.staff_working_hour_exception_intervals TO authenticated;
GRANT ALL ON TABLE public.staff_working_hour_exceptions TO service_role;
GRANT ALL ON TABLE public.staff_working_hour_exception_intervals TO service_role;
