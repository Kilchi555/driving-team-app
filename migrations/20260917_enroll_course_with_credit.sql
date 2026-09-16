-- C5 / C4-01: atomic credit course enrollment.
-- Create only. Do not apply automatically to production.
-- Isolated/local apply only.
--
-- Depends on: 20260916_course_atomic_capacity.sql
--   (enforce_course_registration_capacity remains the seat lock).
-- Calls existing primitives inside ONE PostgreSQL transaction:
--   deduct_student_credit, consume_gift_card_for_payment,
--   increment_discount_usage, increment_voucher_code_redemption.
-- Does NOT CREATE OR REPLACE those functions (#219 wallet RPCs stay as-is).
-- Does NOT touch apply_wallee_topup_deposit or Wallee remaining-amount math (#224).
--
-- OLD PATH:
--   PostgREST INSERT paid/confirmed seat, then deduct_student_credit, then
--   giftcard, then best-effort increment_balance + cancel on failure.
--   Crash after INSERT leaves a paid seat with no wallet mutation.
--   Giftcard refund failure leaves deducted wallet + cancelled seat; retry
--   can deduct again.
-- NEW PATH:
--   public.enroll_course_with_credit(...) does seat + wallet + giftcard +
--   discount counter + credit_transactions in one function (one TX).
--   Any error rolls back every DB mutation. No compensation path.
-- BLAST RADIUS:
--   Credit bypass in server/api/courses/enroll-wallee.post.ts only.
--   Wallee / cash / invoice / admin / SARI transfer unchanged.
-- ROLLBACK: DROP FUNCTION public.enroll_course_with_credit(uuid, uuid, uuid, integer, jsonb);

CREATE OR REPLACE FUNCTION public.enroll_course_with_credit(
  p_user_id uuid,
  p_tenant_id uuid,
  p_course_id uuid,
  p_amount_rappen integer,
  p_registration jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_course public.courses%ROWTYPE;
  v_user_tenant uuid;
  v_payload_course uuid;
  v_payload_tenant uuid;
  v_payload_user uuid;
  v_email text;
  v_faber text;
  v_exist public.course_registrations%ROWTYPE;
  v_reg_id uuid;
  v_custom jsonb;
  v_new_session integer;
  v_balance_after integer;
  v_pending integer;
  v_discount_code text;
  v_discount_source text;
  v_discount_id uuid;
  v_voucher_code_id uuid;
  v_gift_ok boolean;
  v_disc_ok boolean;
  v_notes text;
BEGIN
  IF p_user_id IS NULL OR p_tenant_id IS NULL OR p_course_id IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_args');
  END IF;

  IF p_amount_rappen IS NULL OR p_amount_rappen <= 0 OR p_amount_rappen > 100000000 THEN
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
  v_discount_code := NULLIF(btrim(COALESCE(p_registration->>'discount_code', '')), '');
  v_discount_source := NULLIF(btrim(COALESCE(p_registration->>'discount_source', '')), '');
  v_notes := COALESCE(NULLIF(p_registration->>'ledger_notes', ''), 'Guthaben für Kurs verwendet');

  -- Active credit enrollment for this identity: idempotent, no second deduction.
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
             WHEN r.user_id = p_user_id AND r.payment_method = 'credit' THEN 0
             ELSE 1
           END,
           r.created_at
  LIMIT 1;

  IF FOUND THEN
    IF v_exist.payment_method = 'credit'
       AND v_exist.user_id = p_user_id
       AND v_exist.payment_status = 'paid' THEN
      RETURN jsonb_build_object(
        'status', 'already_enrolled',
        'registration_id', v_exist.id
      );
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
      discount_applied_rappen,
      discount_code,
      custom_sessions,
      is_partial_enrollment,
      partial_start_session,
      individual_session_number,
      vehicle_id,
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
      'paid',
      'credit',
      p_amount_rappen,
      COALESCE((p_registration->>'discount_applied_rappen')::integer, 0),
      v_discount_code,
      v_custom,
      COALESCE((p_registration->>'is_partial_enrollment')::boolean, false),
      CASE
        WHEN NULLIF(p_registration->>'partial_start_session', '') IS NULL THEN NULL
        ELSE (p_registration->>'partial_start_session')::integer
      END,
      v_new_session,
      NULLIF(p_registration->>'vehicle_id', '')::uuid,
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

    SELECT sc.balance_rappen, sc.pending_withdrawal_rappen
      INTO v_balance_after, v_pending
    FROM public.deduct_student_credit(p_user_id, p_tenant_id, p_amount_rappen) AS sc;

    IF v_discount_code IS NOT NULL AND v_discount_source = 'gift_card' THEN
      v_gift_ok := public.consume_gift_card_for_payment(
        p_tenant_id,
        v_discount_code,
        NULL,
        p_user_id
      );
      IF v_gift_ok IS NOT TRUE THEN
        RAISE EXCEPTION 'giftcard_unavailable'
          USING ERRCODE = 'P0001';
      END IF;
    ELSIF v_discount_code IS NOT NULL THEN
      SELECT d.id INTO v_discount_id
      FROM public.discounts d
      WHERE d.tenant_id = p_tenant_id
        AND upper(d.code) = upper(v_discount_code)
      LIMIT 1;
      IF v_discount_id IS NOT NULL THEN
        v_disc_ok := public.increment_discount_usage(v_discount_id);
        IF v_disc_ok IS NOT TRUE THEN
          RAISE EXCEPTION 'discount_unavailable'
            USING ERRCODE = 'P0001';
        END IF;
      ELSE
        SELECT vc.id INTO v_voucher_code_id
        FROM public.voucher_codes vc
        WHERE vc.tenant_id = p_tenant_id
          AND upper(vc.code) = upper(v_discount_code)
        LIMIT 1;
        IF v_voucher_code_id IS NULL THEN
          RAISE EXCEPTION 'discount_unavailable'
            USING ERRCODE = 'P0001';
        END IF;
        v_disc_ok := public.increment_voucher_code_redemption(v_voucher_code_id);
        IF v_disc_ok IS NOT TRUE THEN
          RAISE EXCEPTION 'discount_unavailable'
            USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;

    INSERT INTO public.credit_transactions (
      user_id,
      tenant_id,
      transaction_type,
      amount_rappen,
      balance_before_rappen,
      balance_after_rappen,
      payment_method,
      reference_type,
      reference_id,
      notes,
      status,
      created_at
    ) VALUES (
      p_user_id,
      p_tenant_id,
      'payment',
      -p_amount_rappen,
      v_balance_after + p_amount_rappen,
      v_balance_after,
      'credit',
      'course',
      v_reg_id,
      v_notes,
      'completed',
      now()
    );

    RETURN jsonb_build_object(
      'status', 'enrolled',
      'registration_id', v_reg_id,
      'balance_rappen', v_balance_after
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
                 WHEN r.user_id = p_user_id AND r.payment_method = 'credit' THEN 0
                 ELSE 1
               END,
               r.created_at
      LIMIT 1;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'session_conflict');
      END IF;
      IF v_exist.payment_method = 'credit'
         AND v_exist.user_id = p_user_id
         AND v_exist.payment_status = 'paid'
         AND v_exist.status IS DISTINCT FROM 'cancelled' THEN
        RETURN jsonb_build_object(
          'status', 'already_enrolled',
          'registration_id', v_exist.id
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
      IF SQLERRM LIKE '%insufficient_available_credit%' THEN
        RETURN jsonb_build_object('status', 'insufficient_credit');
      END IF;
      IF SQLERRM LIKE '%invalid_amount%' THEN
        RETURN jsonb_build_object('status', 'invalid_args');
      END IF;
      IF SQLERRM LIKE '%giftcard_unavailable%' THEN
        RETURN jsonb_build_object('status', 'giftcard_unavailable');
      END IF;
      IF SQLERRM LIKE '%discount_unavailable%' THEN
        RETURN jsonb_build_object('status', 'discount_unavailable');
      END IF;
      RAISE;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.enroll_course_with_credit(uuid, uuid, uuid, integer, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enroll_course_with_credit(uuid, uuid, uuid, integer, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_course_with_credit(uuid, uuid, uuid, integer, jsonb) TO postgres, service_role;

COMMENT ON FUNCTION public.enroll_course_with_credit(uuid, uuid, uuid, integer, jsonb) IS
  'C5/C4-01: atomically claim a credit course seat + deduct wallet + consume giftcard/discount + ledger. Capacity trigger is not replaced. Isolated/local; do not apply to production automatically.';
