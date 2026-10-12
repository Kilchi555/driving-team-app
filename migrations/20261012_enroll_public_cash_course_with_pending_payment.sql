-- F1: atomic public cash_on_site course enrollment + pending payment.
-- Create only. Do not apply automatically to Production or shared staging.
-- Isolated/local apply only.
--
-- OLD PATH:
--   enroll-cash INSERT course_registrations (confirmed, payment_status=pending)
--   with no payments row. Open Items then invoice from source=course_registrations;
--   mark-invoice-paid cannot sync a missing payments row; Payments UI stays empty.
-- NEW PATH:
--   public.enroll_public_cash_course_with_pending_payment(...) inserts the
--   registration AND the pending cash payment AND sets payment_id in ONE TX.
-- WHY REQUIRED:
--   Business rule: public cash success requires both rows. PostgREST multi-step
--   leaves a crash window (seat without payment). Sibling SECURITY DEFINER RPCs
--   (enroll_course_with_credit, fulfill_course_wallee_payment) already use this
--   pattern for the same class of inconsistency.
-- BLAST RADIUS:
--   server/api/courses/enroll-cash.post.ts cash_on_site branch only.
--   Wallee / invoice / admin / credit / SARI transfer unchanged.
-- IDEMPOTENCY:
--   Existing confirmed seat for same course+tenant+(user|email|faber) returns
--   already_enrolled / payment_conflict (same identity contract as credit enroll).
--   Unique(course,email/faberid) + partial payment uidx are concurrency backstops.
--   No separate client idempotency key exists on this public path.
--
-- Read-only duplicate preflight BEFORE apply (expect 0):
--   SELECT tenant_id, course_registration_id, COUNT(*) AS cnt
--   FROM public.payments
--   WHERE course_registration_id IS NOT NULL
--     AND tenant_id IS NOT NULL
--     AND (metadata->>'public_cash_course_enroll') = 'true'
--   GROUP BY 1, 2
--   HAVING COUNT(*) > 1;
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, jsonb);
--   DROP INDEX IF EXISTS public.payments_public_cash_course_enroll_registration_uidx;

-- One public-cash enrollment payment per tenant + course registration.
CREATE UNIQUE INDEX IF NOT EXISTS payments_public_cash_course_enroll_registration_uidx
  ON public.payments (tenant_id, course_registration_id)
  WHERE course_registration_id IS NOT NULL
    AND tenant_id IS NOT NULL
    AND (metadata->>'public_cash_course_enroll') = 'true';

CREATE OR REPLACE FUNCTION public.enroll_public_cash_course_with_pending_payment(
  p_user_id uuid,
  p_tenant_id uuid,
  p_course_id uuid,
  p_amount_rappen integer,
  p_course_name text,
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
  v_desc text;
BEGIN
  IF p_user_id IS NULL OR p_tenant_id IS NULL OR p_course_id IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_args');
  END IF;

  IF p_amount_rappen IS NULL OR p_amount_rappen < 0 OR p_amount_rappen > 100000000 THEN
    RETURN jsonb_build_object('status', 'invalid_args');
  END IF;

  IF p_registration IS NULL OR jsonb_typeof(p_registration) IS DISTINCT FROM 'object' THEN
    RETURN jsonb_build_object('status', 'invalid_args');
  END IF;

  -- service_role-only RPC. JWT claim lets payment-field triggers allow writes.
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

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

  -- Active enrollment for this identity: idempotent replay or conflict.
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
    IF v_exist.payment_method = 'cash_on_site'
       AND v_exist.user_id = p_user_id THEN
      SELECT * INTO v_pay
      FROM public.payments p
      WHERE p.id = v_exist.payment_id
         OR (
           p.course_registration_id = v_exist.id
           AND p.tenant_id = p_tenant_id
           AND (p.metadata->>'public_cash_course_enroll') = 'true'
         )
      ORDER BY CASE WHEN p.id = v_exist.payment_id THEN 0 ELSE 1 END
      LIMIT 1;

      IF FOUND
         AND v_pay.tenant_id = p_tenant_id
         AND v_pay.payment_method = 'cash_on_site'
         AND (v_pay.metadata->>'public_cash_course_enroll') = 'true' THEN
        RETURN jsonb_build_object(
          'status', 'already_enrolled',
          'registration_id', v_exist.id,
          'payment_id', v_pay.id
        );
      END IF;
    END IF;
    RETURN jsonb_build_object(
      'status', 'payment_conflict',
      'registration_id', v_exist.id
    );
  END IF;

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

  IF jsonb_typeof(p_registration->'custom_sessions') = 'object'
     OR jsonb_typeof(p_registration->'custom_sessions') = 'array' THEN
    v_custom := p_registration->'custom_sessions';
  ELSE
    v_custom := NULL;
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
      COALESCE((p_registration->>'is_partial_enrollment')::boolean, false),
      CASE
        WHEN NULLIF(p_registration->>'partial_start_session', '') IS NULL THEN NULL
        ELSE (p_registration->>'partial_start_session')::integer
      END,
      v_new_session,
      NULLIF(p_registration->>'vehicle_id', '')::uuid,
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
        'public_cash_course_enroll', true
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

    RETURN jsonb_build_object(
      'status', 'enrolled',
      'registration_id', v_reg_id,
      'payment_id', v_payment_id
    );
  EXCEPTION
    WHEN unique_violation THEN
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
      ORDER BY CASE
                 WHEN r.user_id = p_user_id AND r.payment_method = 'cash_on_site' THEN 0
                 ELSE 1
               END,
               r.created_at
      LIMIT 1;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'session_conflict');
      END IF;
      IF v_exist.payment_method = 'cash_on_site'
         AND v_exist.user_id = p_user_id
         AND v_exist.status IS DISTINCT FROM 'cancelled' THEN
        SELECT p.id INTO v_payment_id
        FROM public.payments p
        WHERE p.tenant_id = p_tenant_id
          AND (
            p.id = v_exist.payment_id
            OR (
              p.course_registration_id = v_exist.id
              AND (p.metadata->>'public_cash_course_enroll') = 'true'
            )
          )
        ORDER BY CASE WHEN p.id = v_exist.payment_id THEN 0 ELSE 1 END
        LIMIT 1;
        RETURN jsonb_build_object(
          'status', 'already_enrolled',
          'registration_id', v_exist.id,
          'payment_id', v_payment_id
        );
      END IF;
      RETURN jsonb_build_object(
        'status', 'payment_conflict',
        'registration_id', v_exist.id
      );
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

REVOKE ALL ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, jsonb) TO postgres, service_role;

COMMENT ON FUNCTION public.enroll_public_cash_course_with_pending_payment(uuid, uuid, uuid, integer, text, jsonb) IS
  'F1: atomically create confirmed cash_on_site course registration + pending payments row and link payment_id. service_role only. Isolated/local; do not apply to production automatically.';
