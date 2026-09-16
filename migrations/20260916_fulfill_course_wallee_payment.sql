-- P0-19 atomic course Wallee fulfillment
-- Create only. Do not apply automatically to production.
-- Isolated/local apply only.
--
-- Depends on: 20260916_course_atomic_capacity.sql
--   (enforce_course_registration_capacity trigger is the seat lock).
-- Does not touch apply_wallee_topup_deposit / increment_balance (#219)
-- or Wallee remaining-amount checkout math (#224).
--
-- FINANCIAL GATE (C2-07):
--   Primary guarantee is the CALLER (Wallee webhook Layer 5.5 and recover-cron)
--   after live Wallee API verify + isWalleeCaptureMatchingRemaining (#224).
--   This RPC does not call Wallee. Defense-in-depth: when the payload includes
--   captured_amount_chf, it MUST match
--     GREATEST(total_amount_rappen - credit_used_rappen, 0) / 100 ± 0.01
--   and remaining must be > 0. Omitting the field does not invent a capture;
--   production callers MUST supply it whenever Wallee returns a finite amount.
--
-- OLD SCHEMA:
--   payments.payment_status and course_registrations are updated in separate
--   PostgREST round-trips (separate transactions). Webhook Layer 7 can COMMIT
--   payment_status=completed before Layer 9 INSERT. Capacity trigger then
--   rejects the seat; payment stays completed. Recovery cron can SET completed
--   and webhook_logs.success=true with no registration.
-- NEW SCHEMA:
--   No table/column changes. Adds public.fulfill_course_wallee_payment(uuid, jsonb)
--   which locks the payment, verifies tenant/course, INSERTs/merges the
--   registration (existing enforce_course_registration_capacity trigger
--   remains the seat lock), then sets payment completed in the SAME transaction.
-- WHY REQUIRED:
--   Completed payment must not survive a failed seat claim.
-- BLAST RADIUS:
--   Wallee webhook FULFILL/COMPLETED/SUCCESSFUL for payments with
--   metadata.course_id, and recover-pending-wallee-payments cron for the same.
--   Appointments, product sales, cash, invoice, admin, credit, authorized
--   (non-completed) paths are unchanged. Capacity trigger is not replaced.
--   Unique(course,email/faberid) and unique(payment_id) stay as defense-in-depth.
--   individual_session_number uniqueness is NOT changed (P1, separate).
-- ROLLBACK: DROP FUNCTION public.fulfill_course_wallee_payment(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.fulfill_course_wallee_payment(
  p_payment_id uuid,
  p_registration jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_pay public.payments%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_course_id uuid;
  v_payload_course uuid;
  v_payload_tenant uuid;
  v_payload_user uuid;
  v_user_id uuid;
  v_user_tenant uuid;
  v_reg_id uuid;
  v_exist public.course_registrations%ROWTYPE;
  v_new_session integer;
  v_email text;
  v_faber text;
  v_faber_norm text;
  v_was_completed boolean;
  v_custom jsonb;
  v_captured_chf numeric;
  v_remaining_rappen integer;
  v_expected_chf numeric;
  v_consumes boolean;
BEGIN
  IF p_payment_id IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_args');
  END IF;

  -- This RPC is granted only to service_role/postgres. The payment-field
  -- trigger allows writes when auth.role() = service_role. Direct SQL
  -- (no JWT) would otherwise NULL payment_id on INSERT.
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  SELECT * INTO v_pay
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'payment_not_found');
  END IF;

  IF v_pay.payment_status IN ('refunded', 'cancelled') THEN
    RETURN jsonb_build_object('status', 'payment_conflict');
  END IF;

  BEGIN
    v_course_id := NULLIF(btrim(COALESCE(v_pay.metadata->>'course_id', '')), '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('status', 'not_course_payment');
  END;

  IF v_course_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_course_payment');
  END IF;

  BEGIN
    v_payload_course := NULLIF(btrim(COALESCE(p_registration->>'course_id', '')), '')::uuid;
    v_payload_tenant := NULLIF(btrim(COALESCE(p_registration->>'tenant_id', '')), '')::uuid;
    v_payload_user := NULLIF(btrim(COALESCE(p_registration->>'user_id', '')), '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('status', 'tenant_mismatch');
  END;

  IF v_payload_course IS DISTINCT FROM v_course_id THEN
    RETURN jsonb_build_object('status', 'tenant_mismatch');
  END IF;

  IF v_payload_tenant IS NOT NULL AND v_payload_tenant IS DISTINCT FROM v_pay.tenant_id THEN
    RETURN jsonb_build_object('status', 'tenant_mismatch');
  END IF;

  -- C2-10: prefer locked payment.user_id; never attach a cross-tenant user.
  v_user_id := v_pay.user_id;
  IF v_user_id IS NULL THEN
    v_user_id := v_payload_user;
  END IF;
  IF v_user_id IS NOT NULL THEN
    SELECT u.tenant_id INTO v_user_tenant
    FROM public.users u
    WHERE u.id = v_user_id;
    IF NOT FOUND OR v_user_tenant IS DISTINCT FROM v_pay.tenant_id THEN
      RETURN jsonb_build_object('status', 'tenant_mismatch');
    END IF;
  END IF;

  -- C2-07 defense-in-depth: supplied capture must match remaining (#224 formula).
  IF p_registration ? 'captured_amount_chf'
     AND jsonb_typeof(p_registration->'captured_amount_chf') IS DISTINCT FROM 'null' THEN
    BEGIN
      v_captured_chf := (p_registration->>'captured_amount_chf')::numeric;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN jsonb_build_object('status', 'amount_mismatch');
    END;
    v_remaining_rappen := GREATEST(
      COALESCE(v_pay.total_amount_rappen, 0) - COALESCE(v_pay.credit_used_rappen, 0),
      0
    );
    v_expected_chf := v_remaining_rappen / 100.0;
    IF v_captured_chf IS NULL
       OR NOT (v_expected_chf > 0 AND abs(v_captured_chf - v_expected_chf) <= 0.01) THEN
      RETURN jsonb_build_object('status', 'amount_mismatch');
    END IF;
  END IF;

  SELECT * INTO v_course
  FROM public.courses
  WHERE id = v_course_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'course_not_found');
  END IF;

  IF v_course.tenant_id IS DISTINCT FROM v_pay.tenant_id THEN
    RETURN jsonb_build_object('status', 'tenant_mismatch');
  END IF;

  v_was_completed := (v_pay.payment_status = 'completed');

  -- C2-05: already_fulfilled only for a seat-consuming registration.
  SELECT * INTO v_exist
  FROM public.course_registrations r
  WHERE r.payment_id = v_pay.id
    AND r.deleted_at IS NULL
    AND r.status IS DISTINCT FROM 'cancelled'
  ORDER BY r.created_at
  LIMIT 1;

  IF FOUND THEN
    v_reg_id := v_exist.id;
    UPDATE public.payments
       SET payment_status = 'completed',
           paid_at = COALESCE(paid_at, now()),
           course_registration_id = v_reg_id,
           user_id = COALESCE(user_id, v_user_id, v_exist.user_id),
           updated_at = now()
     WHERE id = v_pay.id;
    RETURN jsonb_build_object(
      'status', 'already_fulfilled',
      'registration_id', v_reg_id
    );
  END IF;

  -- Same payment_id on a cancelled/deleted row still occupies unique(payment_id).
  -- Reactivate that row; do not treat it as already fulfilled.
  SELECT * INTO v_exist
  FROM public.course_registrations r
  WHERE r.payment_id = v_pay.id
  ORDER BY r.created_at
  LIMIT 1;

  IF FOUND THEN
    IF v_exist.tenant_id IS DISTINCT FROM v_pay.tenant_id
       OR v_exist.course_id IS DISTINCT FROM v_course_id THEN
      RETURN jsonb_build_object('status', 'tenant_mismatch');
    END IF;
    BEGIN
      UPDATE public.course_registrations
         SET deleted_at = NULL,
             status = 'confirmed',
             payment_status = 'paid',
             payment_method = 'wallee',
             user_id = COALESCE(v_user_id, user_id),
             webhook_processed_at = now(),
             updated_at = now()
       WHERE id = v_exist.id
         AND payment_id = v_pay.id
      RETURNING id INTO v_reg_id;
    EXCEPTION
      WHEN SQLSTATE 'P0001' THEN
        IF SQLERRM LIKE '%course_capacity_exceeded%' OR SQLERRM LIKE '%COURSE_FULL%' THEN
          IF v_was_completed
             AND v_pay.appointment_id IS NULL
             AND v_pay.course_registration_id IS NULL THEN
            UPDATE public.payments
               SET payment_status = 'pending',
                   updated_at = now()
             WHERE id = v_pay.id
               AND payment_status = 'completed'
               AND course_registration_id IS NULL
               AND appointment_id IS NULL;
          END IF;
          RETURN jsonb_build_object('status', 'capacity_exceeded');
        END IF;
        RAISE;
    END;
    IF v_reg_id IS NOT NULL THEN
      UPDATE public.payments
         SET payment_status = 'completed',
             paid_at = COALESCE(paid_at, now()),
             course_registration_id = v_reg_id,
             user_id = COALESCE(user_id, v_user_id),
             updated_at = now()
       WHERE id = v_pay.id;
      RETURN jsonb_build_object(
        'status', 'fulfilled',
        'registration_id', v_reg_id
      );
    END IF;
  END IF;

  v_email := NULLIF(btrim(COALESCE(p_registration->>'email', '')), '');
  v_faber := NULLIF(btrim(COALESCE(p_registration->>'sari_faberid', '')), '');
  v_faber_norm := CASE
    WHEN v_faber IS NULL THEN NULL
    ELSE NULLIF(regexp_replace(v_faber, '^0+', ''), '')
  END;
  IF v_faber_norm IS NULL THEN
    v_faber_norm := v_faber;
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
      payment_id,
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
      custom_sessions,
      is_partial_enrollment,
      partial_start_session,
      individual_session_number,
      vehicle_id,
      registration_date,
      registered_at,
      sari_synced,
      webhook_processed_at,
      updated_at
    ) VALUES (
      v_course_id,
      v_pay.tenant_id,
      v_user_id,
      v_pay.id,
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
      'wallee',
      COALESCE(v_pay.total_amount_rappen, 0),
      COALESCE((p_registration->>'discount_applied_rappen')::integer, 0),
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
      false,
      now(),
      now()
    )
    RETURNING id INTO v_reg_id;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO v_exist
      FROM public.course_registrations r
      WHERE r.deleted_at IS NULL
        AND r.course_id = v_course_id
        AND (
          r.payment_id = v_pay.id
          OR (v_faber IS NOT NULL AND r.sari_faberid = v_faber)
          OR (v_faber_norm IS NOT NULL AND r.sari_faberid = v_faber_norm)
          OR (v_email IS NOT NULL AND lower(r.email) = lower(v_email))
        )
      ORDER BY CASE WHEN r.payment_id = v_pay.id THEN 0 ELSE 1 END,
               r.created_at
      LIMIT 1;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'session_conflict');
      END IF;

      -- C2-06: never attach this payment onto a registration that already
      -- belongs to a different financial identity.
      IF v_exist.payment_id IS NOT NULL
         AND v_exist.payment_id IS DISTINCT FROM v_pay.id THEN
        RETURN jsonb_build_object(
          'status', 'payment_conflict',
          'registration_id', v_exist.id
        );
      END IF;

      IF v_exist.tenant_id IS DISTINCT FROM v_pay.tenant_id THEN
        RETURN jsonb_build_object('status', 'tenant_mismatch');
      END IF;

      v_consumes := (v_exist.deleted_at IS NULL AND v_exist.status IS DISTINCT FROM 'cancelled');

      IF v_exist.payment_id = v_pay.id AND v_consumes THEN
        v_reg_id := v_exist.id;
        UPDATE public.payments
           SET payment_status = 'completed',
               paid_at = COALESCE(paid_at, now()),
               course_registration_id = v_reg_id,
               user_id = COALESCE(user_id, v_user_id, v_exist.user_id),
               updated_at = now()
         WHERE id = v_pay.id;
        RETURN jsonb_build_object(
          'status', 'already_fulfilled',
          'registration_id', v_reg_id
        );
      END IF;

      -- Null payment_id merge is only for an active same-course row whose
      -- user identity is compatible (SARI import / unpaid roster).
      IF v_exist.payment_id IS NULL THEN
        IF NOT v_consumes THEN
          RETURN jsonb_build_object('status', 'payment_conflict', 'registration_id', v_exist.id);
        END IF;
        IF v_exist.user_id IS NOT NULL
           AND v_user_id IS NOT NULL
           AND v_exist.user_id IS DISTINCT FROM v_user_id THEN
          RETURN jsonb_build_object('status', 'tenant_mismatch', 'registration_id', v_exist.id);
        END IF;
      END IF;

      BEGIN
        UPDATE public.course_registrations
           SET user_id = COALESCE(v_user_id, user_id),
               payment_id = v_pay.id,
               first_name = COALESCE(NULLIF(p_registration->>'first_name', ''), NULLIF(p_registration->>'firstname', ''), first_name),
               last_name = COALESCE(NULLIF(p_registration->>'last_name', ''), NULLIF(p_registration->>'lastname', ''), last_name),
               email = COALESCE(v_email, email),
               phone = COALESCE(NULLIF(p_registration->>'phone', ''), phone),
               street = COALESCE(NULLIF(p_registration->>'street', ''), street),
               street_nr = COALESCE(NULLIF(p_registration->>'street_nr', ''), street_nr),
               zip = COALESCE(NULLIF(p_registration->>'zip', ''), zip),
               city = COALESCE(NULLIF(p_registration->>'city', ''), city),
               birthdate = COALESCE(NULLIF(p_registration->>'birthdate', '')::date, birthdate),
               license_number = COALESCE(NULLIF(p_registration->>'license_number', ''), license_number),
               status = 'confirmed',
               payment_status = 'paid',
               payment_method = 'wallee',
               amount_paid_rappen = COALESCE(v_pay.total_amount_rappen, amount_paid_rappen, 0),
               discount_applied_rappen = COALESCE((p_registration->>'discount_applied_rappen')::integer, discount_applied_rappen),
               custom_sessions = COALESCE(v_custom, custom_sessions),
               is_partial_enrollment = COALESCE((p_registration->>'is_partial_enrollment')::boolean, is_partial_enrollment),
               individual_session_number = COALESCE(v_exist.individual_session_number, v_new_session),
               vehicle_id = COALESCE(NULLIF(p_registration->>'vehicle_id', '')::uuid, vehicle_id),
               webhook_processed_at = now(),
               updated_at = now(),
               notes = CASE
                 WHEN notes IS NOT NULL AND notes LIKE '%Auto-imported from SARI%'
                   THEN notes || ' | Linked Wallee payment ' || v_pay.id::text || ' on ' || now()::text
                 ELSE notes
               END
         WHERE id = v_exist.id
           AND (payment_id IS NULL OR payment_id = v_pay.id)
         RETURNING id INTO v_reg_id;
      EXCEPTION
        WHEN SQLSTATE 'P0001' THEN
          IF SQLERRM LIKE '%course_capacity_exceeded%' OR SQLERRM LIKE '%COURSE_FULL%' THEN
            IF v_was_completed
               AND v_pay.appointment_id IS NULL
               AND v_pay.course_registration_id IS NULL THEN
              UPDATE public.payments
                 SET payment_status = 'pending',
                     updated_at = now()
               WHERE id = v_pay.id
                 AND payment_status = 'completed'
                 AND course_registration_id IS NULL
                 AND appointment_id IS NULL;
            END IF;
            RETURN jsonb_build_object('status', 'capacity_exceeded');
          END IF;
          RAISE;
      END;

      IF v_reg_id IS NULL THEN
        RETURN jsonb_build_object('status', 'payment_conflict');
      END IF;
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM LIKE '%course_capacity_exceeded%' OR SQLERRM LIKE '%COURSE_FULL%' THEN
        IF v_was_completed
           AND v_pay.appointment_id IS NULL
           AND v_pay.course_registration_id IS NULL THEN
          UPDATE public.payments
             SET payment_status = 'pending',
                 updated_at = now()
           WHERE id = v_pay.id
             AND payment_status = 'completed'
             AND course_registration_id IS NULL
             AND appointment_id IS NULL;
        END IF;
        RETURN jsonb_build_object('status', 'capacity_exceeded');
      END IF;
      RAISE;
  END;

  UPDATE public.payments
     SET payment_status = 'completed',
         paid_at = COALESCE(paid_at, now()),
         course_registration_id = v_reg_id,
         user_id = COALESCE(user_id, v_user_id),
         updated_at = now()
   WHERE id = v_pay.id;

  RETURN jsonb_build_object(
    'status', 'fulfilled',
    'registration_id', v_reg_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_course_wallee_payment(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fulfill_course_wallee_payment(uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_course_wallee_payment(uuid, jsonb) TO postgres, service_role;

COMMENT ON FUNCTION public.fulfill_course_wallee_payment(uuid, jsonb) IS
  'P0-19: atomically claim a Wallee course payment + registration + seat. Completed payment cannot commit without a registration. Capture matching remaining is caller-guaranteed (#224); captured_amount_chf is re-checked when supplied. Isolated/local; do not apply to production automatically.';
