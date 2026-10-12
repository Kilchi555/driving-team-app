-- F1: atomic public cash_on_site course enrollment + pending payment + request idempotency.
-- Create only. Do not apply automatically to Production or shared staging.
-- Isolated/local apply only.
--
-- IDEMPOTENCY CONTRACT (canonical transport: body.idempotencyKey UUID v4):
--   Client generates one UUID per cash submit attempt; retries reuse the same key;
--   new human submit uses a new key. Server requires the key for cash_on_site.
--   Unique (tenant_id, idempotency_key) stores request_hash + registration_id + payment_id.
--   Same key + same hash → idempotent_replay (HTTP 200 + original IDs).
--   Same key + different hash → idempotency_conflict (HTTP 409).
--   Different key + business duplicate (email/faber/user) → payment_conflict (HTTP 409).
--   Contact fields are NOT the sole concurrency lock; advisory xact lock + idempotency PK are.
--
-- REQUEST HASH CANONICALIZATION (server-only; never trust a client hash):
--   md5 of pipe-joined fields:
--     course_id|tenant_id|user_id|cash_on_site|amount_rappen|lower(email)|faber|
--     is_partial|individual_session|partial_start|canonical_custom_sessions_json|vehicle_id
--   custom_sessions: jsonb text as stored (empty string if null).
--
-- OWNERSHIP / PRIVILEGE:
--   Function owner: postgres (explicit ALTER). EXECUTE: postgres + service_role only.
--   Table: RLS enabled; service_role ALL; no anon/authenticated grants.
--
-- Read-only preflight BEFORE apply (expect 0):
--   SELECT tenant_id, course_registration_id, COUNT(*) AS cnt
--   FROM public.payments
--   WHERE course_registration_id IS NOT NULL AND tenant_id IS NOT NULL
--     AND (metadata->>'public_cash_course_enroll') = 'true'
--   GROUP BY 1, 2 HAVING COUNT(*) > 1;
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, uuid, jsonb);
--   DROP FUNCTION IF EXISTS public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, jsonb);
--   DROP TABLE IF EXISTS public.public_cash_course_enroll_idempotency;
--   DROP INDEX IF EXISTS public.payments_public_cash_course_enroll_registration_uidx;

CREATE TABLE IF NOT EXISTS public.public_cash_course_enroll_idempotency (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL,
  registration_id uuid NOT NULL REFERENCES public.course_registrations(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_public_cash_enroll_idempotency_registration
  ON public.public_cash_course_enroll_idempotency (tenant_id, registration_id);

ALTER TABLE public.public_cash_course_enroll_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_cash_course_enroll_idempotency_service_role
  ON public.public_cash_course_enroll_idempotency;
CREATE POLICY public_cash_course_enroll_idempotency_service_role
  ON public.public_cash_course_enroll_idempotency
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON TABLE public.public_cash_course_enroll_idempotency FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.public_cash_course_enroll_idempotency TO service_role;

COMMENT ON TABLE public.public_cash_course_enroll_idempotency IS
  'F1: completed public cash course enroll idempotency. Rows exist only after a successful atomic enroll+payment.';

-- One public-cash enrollment payment per tenant + course registration.
CREATE UNIQUE INDEX IF NOT EXISTS payments_public_cash_course_enroll_registration_uidx
  ON public.payments (tenant_id, course_registration_id)
  WHERE course_registration_id IS NOT NULL
    AND tenant_id IS NOT NULL
    AND (metadata->>'public_cash_course_enroll') = 'true';

-- Drop prior F1 signature (6-arg) if present from earlier PR revision.
DROP FUNCTION IF EXISTS public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, jsonb);
DROP FUNCTION IF EXISTS public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.enroll_public_cash_course_with_pending_payment(
  p_user_id uuid,
  p_tenant_id uuid,
  p_course_id uuid,
  p_amount_rappen integer,
  p_course_name text,
  p_idempotency_key uuid,
  p_registration jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_course public.courses%ROWTYPE;
  v_exist public.course_registrations%ROWTYPE;
  v_pay public.payments%ROWTYPE;
  v_idem public.public_cash_course_enroll_idempotency%ROWTYPE;
  v_user_tenant uuid;
  v_payload_course uuid;
  v_payload_tenant uuid;
  v_payload_user uuid;
  v_reg_id uuid;
  v_payment_id uuid;
  v_email text;
  v_faber text;
  v_custom jsonb;
  v_new_session integer;
  v_partial_start integer;
  v_is_partial boolean;
  v_vehicle uuid;
  v_desc text;
  v_request_hash text;
  v_canonical text;
  v_lock_key bigint;
BEGIN
  IF p_user_id IS NULL OR p_tenant_id IS NULL OR p_course_id IS NULL OR p_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_args');
  END IF;

  IF p_amount_rappen IS NULL OR p_amount_rappen < 0 OR p_amount_rappen > 100000000 THEN
    RETURN jsonb_build_object('status', 'invalid_args');
  END IF;

  IF p_registration IS NULL OR jsonb_typeof(p_registration) IS DISTINCT FROM 'object' THEN
    RETURN jsonb_build_object('status', 'invalid_args');
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  -- Serialize concurrent claims for the same tenant+key (DB-enforced coordination).
  v_lock_key := hashtextextended(p_tenant_id::text || ':' || p_idempotency_key::text, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT u.tenant_id INTO v_user_tenant
  FROM public.users u
  WHERE u.id = p_user_id;
  IF NOT FOUND OR v_user_tenant IS DISTINCT FROM p_tenant_id THEN
    RETURN jsonb_build_object('status', 'tenant_mismatch');
  END IF;

  BEGIN
    v_payload_course := NULLIF(btrim(COALESCE(p_registration->>'course_id', '')), '')::uuid;
    v_payload_tenant := NULLIF(btrim(COALESCE(p_registration->>'tenant_id', '')), '')::uuid;
    v_payload_user := NULLIF(btrim(COALESCE(p_registration->>'user_id', '')), '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('status', 'tenant_mismatch');
  END;

  IF v_payload_course IS NOT NULL AND v_payload_course IS DISTINCT FROM p_course_id THEN
    RETURN jsonb_build_object('status', 'tenant_mismatch');
  END IF;
  IF v_payload_tenant IS NOT NULL AND v_payload_tenant IS DISTINCT FROM p_tenant_id THEN
    RETURN jsonb_build_object('status', 'tenant_mismatch');
  END IF;
  IF v_payload_user IS NOT NULL AND v_payload_user IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('status', 'tenant_mismatch');
  END IF;

  SELECT * INTO v_course
  FROM public.courses
  WHERE id = p_course_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'course_not_found');
  END IF;
  IF v_course.tenant_id IS DISTINCT FROM p_tenant_id THEN
    RETURN jsonb_build_object('status', 'tenant_mismatch');
  END IF;

  v_email := NULLIF(btrim(COALESCE(p_registration->>'email', '')), '');
  v_faber := NULLIF(btrim(COALESCE(p_registration->>'sari_faberid', '')), '');
  v_desc := COALESCE(
    NULLIF(btrim(COALESCE(p_course_name, '')), ''),
    NULLIF(btrim(COALESCE(v_course.name, '')), ''),
    'Kursanmeldung'
  );

  BEGIN
    IF jsonb_typeof(p_registration->'individual_session_number') = 'number' THEN
      v_new_session := (p_registration->>'individual_session_number')::integer;
    ELSIF NULLIF(btrim(COALESCE(p_registration->>'individual_session_number', '')), '') IS NOT NULL THEN
      v_new_session := (p_registration->>'individual_session_number')::integer;
    ELSE
      v_new_session := NULL;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    v_new_session := NULL;
  END;

  BEGIN
    IF NULLIF(p_registration->>'partial_start_session', '') IS NULL THEN
      v_partial_start := NULL;
    ELSE
      v_partial_start := (p_registration->>'partial_start_session')::integer;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    v_partial_start := NULL;
  END;

  v_is_partial := COALESCE((p_registration->>'is_partial_enrollment')::boolean, false);

  BEGIN
    v_vehicle := NULLIF(p_registration->>'vehicle_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('status', 'invalid_args');
  END;

  IF jsonb_typeof(p_registration->'custom_sessions') = 'object'
     OR jsonb_typeof(p_registration->'custom_sessions') = 'array' THEN
    v_custom := p_registration->'custom_sessions';
  ELSE
    v_custom := NULL;
  END IF;

  v_canonical :=
    p_course_id::text || '|' ||
    p_tenant_id::text || '|' ||
    p_user_id::text || '|' ||
    'cash_on_site' || '|' ||
    p_amount_rappen::text || '|' ||
    lower(COALESCE(v_email, '')) || '|' ||
    COALESCE(v_faber, '') || '|' ||
    CASE WHEN v_is_partial THEN '1' ELSE '0' END || '|' ||
    COALESCE(v_new_session::text, '') || '|' ||
    COALESCE(v_partial_start::text, '') || '|' ||
    COALESCE(v_custom::text, '') || '|' ||
    COALESCE(v_vehicle::text, '');
  v_request_hash := md5(v_canonical);

  -- Completed idempotency row for this key?
  SELECT * INTO v_idem
  FROM public.public_cash_course_enroll_idempotency i
  WHERE i.tenant_id = p_tenant_id
    AND i.idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_idem.request_hash IS DISTINCT FROM v_request_hash THEN
      RETURN jsonb_build_object(
        'status', 'idempotency_conflict',
        'registration_id', v_idem.registration_id,
        'payment_id', v_idem.payment_id
      );
    END IF;
    RETURN jsonb_build_object(
      'status', 'idempotent_replay',
      'registration_id', v_idem.registration_id,
      'payment_id', v_idem.payment_id
    );
  END IF;

  -- Business duplicate for a *different* request key (preserve existing product semantics).
  SELECT * INTO v_exist
  FROM public.course_registrations r
  WHERE r.course_id = p_course_id
    AND r.tenant_id = p_tenant_id
    AND r.deleted_at IS NULL
    AND r.status IS DISTINCT FROM 'cancelled'
    AND (
      r.user_id = p_user_id
      OR (v_email IS NOT NULL AND lower(r.email) = lower(v_email))
      OR (v_faber IS NOT NULL AND r.sari_faberid = v_faber)
    )
  ORDER BY CASE
             WHEN r.user_id = p_user_id AND r.payment_method = 'cash_on_site' THEN 0
             ELSE 1
           END,
           r.created_at
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'payment_conflict',
      'registration_id', v_exist.id
    );
  END IF;

  BEGIN
    INSERT INTO public.course_registrations (
      course_id,
      tenant_id,
      user_id,
      first_name,
      last_name,
      email,
      phone,
      sari_faberid,
      street,
      street_nr,
      zip,
      city,
      birthdate,
      license_number,
      status,
      payment_status,
      payment_method,
      amount_paid_rappen,
      custom_sessions,
      is_partial_enrollment,
      partial_start_session,
      individual_session_number,
      vehicle_id,
      notes,
      registration_date,
      registered_at,
      sari_synced,
      sari_synced_at,
      created_at,
      updated_at
    ) VALUES (
      p_course_id,
      p_tenant_id,
      p_user_id,
      COALESCE(p_registration->>'first_name', p_registration->>'firstname', ''),
      COALESCE(p_registration->>'last_name', p_registration->>'lastname', ''),
      v_email,
      NULLIF(p_registration->>'phone', ''),
      v_faber,
      NULLIF(p_registration->>'street', ''),
      NULLIF(p_registration->>'street_nr', ''),
      NULLIF(p_registration->>'zip', ''),
      NULLIF(p_registration->>'city', ''),
      NULLIF(p_registration->>'birthdate', '')::date,
      NULLIF(p_registration->>'license_number', ''),
      'confirmed',
      'pending',
      'cash_on_site',
      0,
      v_custom,
      v_is_partial,
      v_partial_start,
      v_new_session,
      v_vehicle,
      NULLIF(p_registration->>'notes', ''),
      now(),
      now(),
      COALESCE((p_registration->>'sari_synced')::boolean, false),
      CASE
        WHEN COALESCE((p_registration->>'sari_synced')::boolean, false) THEN now()
        ELSE NULL
      END,
      now(),
      now()
    )
    RETURNING id INTO v_reg_id;

    INSERT INTO public.payments (
      tenant_id,
      user_id,
      course_registration_id,
      appointment_id,
      payment_method,
      payment_status,
      payment_provider,
      total_amount_rappen,
      lesson_price_rappen,
      currency,
      description,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      p_tenant_id,
      p_user_id,
      v_reg_id,
      NULL,
      'cash_on_site',
      'pending',
      NULL,
      p_amount_rappen,
      p_amount_rappen,
      'CHF',
      'Kurs: ' || v_desc,
      jsonb_build_object(
        'course_id', p_course_id,
        'course_name', v_desc,
        'course_registration_id', v_reg_id,
        'public_cash_course_enroll', true,
        'idempotency_key', p_idempotency_key
      ),
      now(),
      now()
    )
    RETURNING id INTO v_payment_id;

    UPDATE public.course_registrations
    SET payment_id = v_payment_id,
        updated_at = now()
    WHERE id = v_reg_id
      AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'registration_link_failed' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.public_cash_course_enroll_idempotency (
      tenant_id,
      idempotency_key,
      request_hash,
      registration_id,
      payment_id,
      created_at
    ) VALUES (
      p_tenant_id,
      p_idempotency_key,
      v_request_hash,
      v_reg_id,
      v_payment_id,
      now()
    );

    RETURN jsonb_build_object(
      'status', 'enrolled',
      'registration_id', v_reg_id,
      'payment_id', v_payment_id
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Concurrent claim: prefer idempotency replay if our key landed.
      SELECT * INTO v_idem
      FROM public.public_cash_course_enroll_idempotency i
      WHERE i.tenant_id = p_tenant_id
        AND i.idempotency_key = p_idempotency_key;
      IF FOUND THEN
        IF v_idem.request_hash IS DISTINCT FROM v_request_hash THEN
          RETURN jsonb_build_object(
            'status', 'idempotency_conflict',
            'registration_id', v_idem.registration_id,
            'payment_id', v_idem.payment_id
          );
        END IF;
        RETURN jsonb_build_object(
          'status', 'idempotent_replay',
          'registration_id', v_idem.registration_id,
          'payment_id', v_idem.payment_id
        );
      END IF;

      SELECT * INTO v_exist
      FROM public.course_registrations r
      WHERE r.deleted_at IS NULL
        AND r.course_id = p_course_id
        AND r.tenant_id = p_tenant_id
        AND (
          r.user_id = p_user_id
          OR (v_email IS NOT NULL AND lower(r.email) = lower(v_email))
          OR (v_faber IS NOT NULL AND r.sari_faberid = v_faber)
        )
      ORDER BY r.created_at
      LIMIT 1;
      IF FOUND THEN
        RETURN jsonb_build_object(
          'status', 'payment_conflict',
          'registration_id', v_exist.id
        );
      END IF;
      RETURN jsonb_build_object('status', 'session_conflict');
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM LIKE '%course_capacity_exceeded%' OR SQLERRM LIKE '%COURSE_FULL%' THEN
        RETURN jsonb_build_object('status', 'capacity_exceeded');
      END IF;
      IF SQLERRM LIKE '%registration_link_failed%' THEN
        RETURN jsonb_build_object('status', 'rpc_error');
      END IF;
      RAISE;
  END;
END;
$$;

ALTER FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, uuid, jsonb)
  OWNER TO postgres;

REVOKE ALL ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, uuid, jsonb) TO postgres, service_role;

COMMENT ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, uuid, jsonb) IS
  'F1: atomic public cash enroll + pending payment + idempotency claim. OWNER postgres. EXECUTE service_role/postgres only. Isolated/local; do not apply to production automatically.';
