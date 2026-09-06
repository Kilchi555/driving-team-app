-- Booking occupancy + online-booking concurrency.
-- Transitional safety boundary BEFORE appointments_staff_occupancy_excl.
--
-- DO NOT install EXCLUDE / btree_gist in this migration.
-- DO NOT remediate existing production overlaps here.
-- DO NOT use NOT VALID on an EXCLUDE (PostgreSQL 17 does not support it).

-- =====================================================================
-- PHASE 1 — occupies_staff snapshot
-- =====================================================================

ALTER TABLE public.event_types
  ADD COLUMN IF NOT EXISTS occupies_staff boolean NOT NULL DEFAULT true;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS occupies_staff boolean NOT NULL DEFAULT true;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS occupies_staff_overridden boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.event_types.occupies_staff IS
  'Default occupancy for new appointments of this type. Changing this does not cascade.';
COMMENT ON COLUMN public.appointments.occupies_staff IS
  'Snapshot: this row occupies staff time when also not cancelled/deleted.';
COMMENT ON COLUMN public.appointments.occupies_staff_overridden IS
  'When true, appointment occupies_staff is not overwritten from event_types on insert.';

-- =====================================================================
-- PHASE 2 — idempotency
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.booking_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  session_id text,
  user_id uuid,
  slot_id uuid,
  appointment_id uuid,
  payment_id uuid,
  status text NOT NULL DEFAULT 'claiming'
    CHECK (status IN ('claiming', 'completed', 'failed')),
  response_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS booking_idempotency_keys_slot_idx
  ON public.booking_idempotency_keys (tenant_id, slot_id);
CREATE INDEX IF NOT EXISTS booking_idempotency_keys_appointment_idx
  ON public.booking_idempotency_keys (appointment_id);

ALTER TABLE public.booking_idempotency_keys ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.booking_idempotency_keys FROM PUBLIC;
REVOKE ALL ON TABLE public.booking_idempotency_keys FROM anon;
REVOKE ALL ON TABLE public.booking_idempotency_keys FROM authenticated;
GRANT ALL ON TABLE public.booking_idempotency_keys TO service_role;

-- No anon/authenticated policies: clients cannot read or write idempotency rows.

-- =====================================================================
-- Canonical occupancy + staff advisory locks
-- Lock order: staff (hashtextextended seed 0) BEFORE any slot row locks.
-- Multiple staff IDs: lock in ascending UUID order. Never slot → staff.
-- Payment checkout uses seed 1 and is session-scoped (unlock in finally).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.appointment_row_occupies_staff(
  p_deleted_at timestamptz,
  p_status text,
  p_occupies_staff boolean
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT p_deleted_at IS NULL
    AND p_status IS DISTINCT FROM 'cancelled'
    AND p_status IS DISTINCT FROM 'deleted'
    AND p_occupies_staff IS TRUE;
$$;

CREATE OR REPLACE FUNCTION public.lock_staff_occupancy(p_staff_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  sid uuid;
BEGIN
  -- Staff advisory locks (namespace seed 0), always sorted, always before slot locks.
  IF p_staff_ids IS NULL THEN
    RETURN;
  END IF;
  FOR sid IN
    SELECT DISTINCT s
    FROM unnest(p_staff_ids) AS s
    WHERE s IS NOT NULL
    ORDER BY s
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(sid::text, 0));
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_has_occupancy_conflict(
  p_staff_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_exclude_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.staff_id = p_staff_id
      AND a.deleted_at IS NULL
      AND a.status NOT IN ('cancelled', 'deleted')
      AND a.occupies_staff IS TRUE
      AND (p_exclude_id IS NULL OR a.id IS DISTINCT FROM p_exclude_id)
      AND a.start_time < p_end
      AND a.end_time > p_start
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_appointment_staff_occupancy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_default boolean;
  v_relevant boolean := false;
  v_staff_ids uuid[];
BEGIN
  IF TG_OP = 'INSERT' AND COALESCE(NEW.occupies_staff_overridden, false) IS NOT TRUE THEN
    SELECT et.occupies_staff
      INTO v_default
    FROM public.event_types et
    WHERE et.tenant_id = NEW.tenant_id
      AND (
        (NEW.event_type_code IS NOT NULL AND et.code = NEW.event_type_code)
        OR (NEW.type IS NOT NULL AND et.code = NEW.type)
      )
    ORDER BY CASE
      WHEN NEW.event_type_code IS NOT NULL AND et.code = NEW.event_type_code THEN 0
      ELSE 1
    END
    LIMIT 1;
    NEW.occupies_staff := COALESCE(v_default, true);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_relevant := true;
  ELSE
    v_relevant :=
      NEW.staff_id IS DISTINCT FROM OLD.staff_id
      OR NEW.start_time IS DISTINCT FROM OLD.start_time
      OR NEW.end_time IS DISTINCT FROM OLD.end_time
      OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
      OR NEW.occupies_staff IS DISTINCT FROM OLD.occupies_staff
      OR (
        public.appointment_row_occupies_staff(NEW.deleted_at, NEW.status, NEW.occupies_staff)
        AND NOT public.appointment_row_occupies_staff(OLD.deleted_at, OLD.status, OLD.occupies_staff)
      );
  END IF;

  IF NOT v_relevant THEN
    RETURN NEW;
  END IF;

  IF NOT public.appointment_row_occupies_staff(NEW.deleted_at, NEW.status, NEW.occupies_staff) THEN
    RETURN NEW;
  END IF;

  IF NEW.staff_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.end_time IS NULL OR NEW.start_time IS NULL OR NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'BOOKING_CONFLICT'
      USING ERRCODE = '23P01',
            HINT = 'BOOKING_CONFLICT',
            DETAIL = 'invalid_time_range';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.staff_id IS NOT NULL AND OLD.staff_id IS DISTINCT FROM NEW.staff_id THEN
    v_staff_ids := ARRAY[OLD.staff_id, NEW.staff_id];
  ELSE
    v_staff_ids := ARRAY[NEW.staff_id];
  END IF;

  PERFORM public.lock_staff_occupancy(v_staff_ids);

  IF public.staff_has_occupancy_conflict(NEW.staff_id, NEW.start_time, NEW.end_time, NEW.id) THEN
    RAISE EXCEPTION 'BOOKING_CONFLICT'
      USING ERRCODE = '23P01',
            HINT = 'BOOKING_CONFLICT',
            DETAIL = 'staff_occupancy';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_staff_occupancy ON public.appointments;
CREATE TRIGGER trg_appointments_staff_occupancy
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_appointment_staff_occupancy();

-- Payment checkout serialization lives in 20260906_wallee_checkout_claim.sql.
-- Do not install session-scoped pg_advisory_lock RPCs here.

-- =====================================================================
-- PHASE 6/7 — atomic online booking RPC (service_role only)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.book_online_appointment(
  p_tenant_id uuid,
  p_idempotency_key text,
  p_request_hash text,
  p_session_id text,
  p_user_id uuid,
  p_slot_id uuid,
  p_appointment jsonb,
  p_payment jsonb,
  p_create_vehicle_booking boolean DEFAULT false,
  p_room_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_idemp public.booking_idempotency_keys%ROWTYPE;
  v_slot public.availability_slots%ROWTYPE;
  v_appt public.appointments%ROWTYPE;
  v_pay public.payments%ROWTYPE;
  v_status text;
  v_snapshot jsonb;
BEGIN
  IF p_tenant_id IS NULL OR p_slot_id IS NULL OR p_user_id IS NULL OR p_session_id IS NULL THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED'
      USING ERRCODE = '22023', HINT = 'IDEMPOTENCY_KEY_REQUIRED';
  END IF;

  IF p_idempotency_key IS NULL
     OR p_idempotency_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED'
      USING ERRCODE = '22023', HINT = 'IDEMPOTENCY_KEY_REQUIRED';
  END IF;

  IF p_request_hash IS NULL OR length(p_request_hash) < 32 THEN
    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'
      USING ERRCODE = 'P0001', HINT = 'IDEMPOTENCY_CONFLICT';
  END IF;

  LOOP
    INSERT INTO public.booking_idempotency_keys (
      tenant_id, idempotency_key, request_hash, session_id, user_id, slot_id, status
    ) VALUES (
      p_tenant_id, p_idempotency_key, p_request_hash, p_session_id, p_user_id, p_slot_id, 'claiming'
    )
    ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
    RETURNING * INTO v_idemp;

    IF FOUND THEN
      EXIT;
    END IF;

    SELECT *
      INTO v_idemp
    FROM public.booking_idempotency_keys
    WHERE tenant_id = p_tenant_id
      AND idempotency_key = p_idempotency_key
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF v_idemp.request_hash IS DISTINCT FROM p_request_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'
        USING ERRCODE = 'P0001', HINT = 'IDEMPOTENCY_CONFLICT';
    END IF;

    IF v_idemp.status = 'completed' THEN
      RETURN COALESCE(v_idemp.response_snapshot, '{}'::jsonb)
        || jsonb_build_object('replayed', true);
    END IF;

    EXIT;
  END LOOP;

  SELECT *
    INTO v_slot
  FROM public.availability_slots
  WHERE id = p_slot_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE'
      USING ERRCODE = 'P0001', HINT = 'SLOT_UNAVAILABLE';
  END IF;

  -- Staff lock FIRST, then slot row lock via the conditional UPDATE.
  PERFORM public.lock_staff_occupancy(ARRAY[v_slot.staff_id]);

  UPDATE public.availability_slots
  SET
    reserved_by_session = p_session_id,
    reserved_until = now() + interval '5 minutes',
    is_primary_reservation = true
  WHERE id = p_slot_id
    AND tenant_id = p_tenant_id
    AND appointment_id IS NULL
    AND (
      reserved_by_session IS NULL
      OR reserved_until < now()
      OR reserved_by_session = p_session_id
    )
  RETURNING * INTO v_slot;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE'
      USING ERRCODE = 'P0001', HINT = 'SLOT_UNAVAILABLE';
  END IF;

  IF public.staff_has_occupancy_conflict(v_slot.staff_id, v_slot.start_time, v_slot.end_time, NULL) THEN
    RAISE EXCEPTION 'BOOKING_CONFLICT'
      USING ERRCODE = '23P01', HINT = 'BOOKING_CONFLICT', DETAIL = 'staff_occupancy';
  END IF;

  v_status := COALESCE(p_appointment->>'status', 'confirmed');
  IF v_status = 'scheduled' THEN
    v_status := 'confirmed';
  END IF;
  IF v_status NOT IN ('pending', 'confirmed') THEN
    v_status := 'confirmed';
  END IF;

  INSERT INTO public.appointments (
    user_id, tenant_id, staff_id, location_id,
    start_time, end_time, duration_minutes,
    type, event_type_code, title, description, status,
    original_price_rappen, source, created_by,
    marketing_session_id, gclid, gbraid, wbraid, fbclid, fbc, fbp,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    customer_pickup_plz, customer_pickup_address, vehicle_mode, room_id
  ) VALUES (
    p_user_id,
    p_tenant_id,
    v_slot.staff_id,
    v_slot.location_id,
    v_slot.start_time,
    v_slot.end_time,
    v_slot.duration_minutes,
    p_appointment->>'type',
    p_appointment->>'event_type_code',
    p_appointment->>'title',
    COALESCE(p_appointment->>'description', ''),
    v_status,
    COALESCE((p_appointment->>'original_price_rappen')::integer, 0),
    COALESCE(p_appointment->>'source', 'online'),
    COALESCE((p_appointment->>'created_by')::uuid, p_user_id),
    p_appointment->>'marketing_session_id',
    p_appointment->>'gclid',
    p_appointment->>'gbraid',
    p_appointment->>'wbraid',
    p_appointment->>'fbclid',
    p_appointment->>'fbc',
    p_appointment->>'fbp',
    p_appointment->>'utm_source',
    p_appointment->>'utm_medium',
    p_appointment->>'utm_campaign',
    p_appointment->>'utm_content',
    p_appointment->>'utm_term',
    p_appointment->>'customer_pickup_plz',
    p_appointment->>'customer_pickup_address',
    p_appointment->>'vehicle_mode',
    p_room_id
  )
  RETURNING * INTO v_appt;

  INSERT INTO public.payments (
    appointment_id, user_id, tenant_id, staff_id,
    lesson_price_rappen, admin_fee_rappen, products_price_rappen,
    discount_amount_rappen, total_amount_rappen,
    payment_status, payment_method, payment_provider,
    description, currency, created_by, metadata
  ) VALUES (
    v_appt.id,
    p_user_id,
    p_tenant_id,
    v_slot.staff_id,
    COALESCE((p_payment->>'lesson_price_rappen')::integer, 0),
    COALESCE((p_payment->>'admin_fee_rappen')::integer, 0),
    COALESCE((p_payment->>'products_price_rappen')::integer, 0),
    COALESCE((p_payment->>'discount_amount_rappen')::integer, 0),
    COALESCE((p_payment->>'total_amount_rappen')::integer, 0),
    COALESCE(p_payment->>'payment_status', 'pending'),
    COALESCE(NULLIF(p_payment->>'payment_method', ''), 'wallee'),
    p_payment->>'payment_provider',
    COALESCE(p_payment->>'description', v_appt.title),
    COALESCE(p_payment->>'currency', 'CHF'),
    COALESCE((p_payment->>'created_by')::uuid, p_user_id),
    COALESCE(p_payment->'metadata', '{}'::jsonb)
  )
  RETURNING * INTO v_pay;

  IF p_create_vehicle_booking THEN
    BEGIN
      INSERT INTO public.vehicle_bookings (
        vehicle_id, tenant_id, location_id, category_code,
        start_time, end_time, purpose, appointment_id, booked_by, status
      ) VALUES (
        NULL,
        p_tenant_id,
        v_slot.location_id,
        p_appointment->>'type',
        v_slot.start_time,
        v_slot.end_time,
        'lesson',
        v_appt.id,
        p_user_id,
        'confirmed'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'vehicle_bookings insert failed: %', SQLERRM;
    END;
  END IF;

  IF p_room_id IS NOT NULL THEN
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM public.room_bookings rb
        WHERE rb.room_id = p_room_id
          AND rb.status IS DISTINCT FROM 'cancelled'
          AND rb.start_time < v_slot.end_time
          AND rb.end_time > v_slot.start_time
      ) THEN
        UPDATE public.appointments SET room_id = NULL WHERE id = v_appt.id;
        v_appt.room_id := NULL;
      ELSE
        INSERT INTO public.room_bookings (
          room_id, tenant_id, start_time, end_time, purpose, appointment_id, booked_by, status
        ) VALUES (
          p_room_id, p_tenant_id, v_slot.start_time, v_slot.end_time,
          'lesson', v_appt.id, p_user_id, 'confirmed'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.appointments SET room_id = NULL WHERE id = v_appt.id;
      v_appt.room_id := NULL;
      RAISE WARNING 'room_bookings insert failed: %', SQLERRM;
    END;
  END IF;

  UPDATE public.availability_slots
  SET
    is_available = false,
    appointment_id = v_appt.id,
    reserved_by_session = NULL,
    reserved_until = NULL,
    updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND (
      id = p_slot_id
      OR reserved_by_session = p_session_id
    );

  v_snapshot := jsonb_build_object(
    'replayed', false,
    'appointment', to_jsonb(v_appt),
    'payment', to_jsonb(v_pay)
  );

  UPDATE public.booking_idempotency_keys
  SET
    status = 'completed',
    appointment_id = v_appt.id,
    payment_id = v_pay.id,
    response_snapshot = v_snapshot,
    updated_at = now()
  WHERE id = v_idemp.id;

  RETURN v_snapshot;
END;
$$;

REVOKE ALL ON FUNCTION public.book_online_appointment(uuid, text, text, text, uuid, uuid, jsonb, jsonb, boolean, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_online_appointment(uuid, text, text, text, uuid, uuid, jsonb, jsonb, boolean, uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.lock_staff_occupancy(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lock_staff_occupancy(uuid[]) TO service_role;

-- UX hold only. Online booking re-claims inside book_online_appointment.
CREATE OR REPLACE FUNCTION public.claim_availability_slot_hold(
  p_slot_id uuid,
  p_session_id text,
  p_until timestamptz
) RETURNS SETOF public.availability_slots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_slot_id IS NULL OR p_session_id IS NULL OR p_until IS NULL THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE'
      USING ERRCODE = 'P0001', HINT = 'SLOT_UNAVAILABLE';
  END IF;

  RETURN QUERY
  UPDATE public.availability_slots
  SET
    reserved_by_session = p_session_id,
    reserved_until = p_until,
    is_primary_reservation = true
  WHERE id = p_slot_id
    AND appointment_id IS NULL
    AND (
      reserved_by_session IS NULL
      OR reserved_until < now()
      OR reserved_by_session = p_session_id
    )
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_availability_slot_hold(uuid, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_availability_slot_hold(uuid, text, timestamptz)
  TO service_role;
