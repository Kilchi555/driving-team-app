-- Assertions for the additive attribution schema. Fails the session on any miss.
-- Expects the fixture and migrations/20260923_marketing_touches_conversions.sql
-- to have been applied to this database.

\set ON_ERROR_STOP on

DO $$
DECLARE
  tenant_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  tenant_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  staff_a uuid := '11111111-1111-1111-1111-111111111111';
  staff_b uuid := '22222222-2222-2222-2222-222222222222';
  customer uuid := '33333333-3333-3333-3333-333333333333';
  other_customer uuid := '44444444-4444-4444-4444-444444444444';
  appt uuid := '55555555-5555-5555-5555-555555555555';
  appt2 uuid := '55555555-5555-5555-5555-555555555556';
  reg uuid := '66666666-6666-6666-6666-666666666666';
  reg2 uuid := '66666666-6666-6666-6666-666666666667';
  pay1 uuid := '77777777-7777-7777-7777-777777777771';
  pay2 uuid := '77777777-7777-7777-7777-777777777772';
  touch_google uuid;
  touch_meta uuid;
  touch_direct uuid;
  touch_signal uuid;
  conv uuid;
  seen int;
  paid timestamptz := '2026-09-21 15:16:54+00';
BEGIN
  INSERT INTO public.tenants (id) VALUES (tenant_a), (tenant_b);
  INSERT INTO public.users (id, tenant_id, auth_user_id, role, is_active)
  VALUES
    (staff_a, tenant_a, staff_a, 'staff', true),
    (staff_b, tenant_b, staff_b, 'staff', true),
    (customer, tenant_a, NULL, 'client', true),
    (other_customer, tenant_a, NULL, 'client', true);
  INSERT INTO public.appointments (id) VALUES (appt), (appt2);
  INSERT INTO public.course_registrations (id) VALUES (reg), (reg2);

  -- 1. Same fingerprint cannot create a second touch.
  INSERT INTO public.marketing_touches (
    tenant_id, session_id, idempotency_key, touch_at, captured_at, attribution_class, gclid
  ) VALUES (
    tenant_a, '1786359489006_c279w4lft', 'fp-google',
    '2026-08-10 10:58:09+00', '2026-08-10 10:58:10+00', 'PAID_GOOGLE', 'click-aug'
  );
  BEGIN
    INSERT INTO public.marketing_touches (
      tenant_id, session_id, idempotency_key, touch_at, captured_at, attribution_class, gclid
    ) VALUES (
      tenant_a, '1786359489006_c279w4lft', 'fp-google',
      '2026-08-10 10:58:09+00', '2026-08-10 10:58:10+00', 'PAID_GOOGLE', 'click-aug'
    );
    RAISE EXCEPTION 'duplicate fingerprint was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- 2-4. Different click ids on one session are independent rows.
  INSERT INTO public.marketing_touches (
    tenant_id, session_id, idempotency_key, touch_at, captured_at,
    attribution_class, gclid, source, medium
  ) VALUES (
    tenant_a, '1786359489006_c279w4lft', 'fp-google-row',
    '2026-08-10 10:58:09+00', '2026-08-10 10:58:11+00',
    'PAID_GOOGLE', 'click-google', 'google', 'cpc'
  ) RETURNING id INTO touch_google;

  INSERT INTO public.marketing_touches (
    tenant_id, session_id, idempotency_key, touch_at, captured_at,
    attribution_class, fbclid, source, medium
  ) VALUES (
    tenant_a, '1786359489006_c279w4lft', 'fp-meta',
    '2026-08-12 09:00:00+00', '2026-08-12 09:00:01+00',
    'PAID_META', 'click-meta', 'facebook', 'paid_social'
  ) RETURNING id INTO touch_meta;

  INSERT INTO public.marketing_touches (
    tenant_id, session_id, idempotency_key, touch_at, captured_at,
    attribution_class, source, medium
  ) VALUES (
    tenant_a, '1786359489006_c279w4lft', 'fp-direct',
    '2026-08-15 09:00:00+00', '2026-08-15 09:00:01+00',
    'DIRECT_CONFIRMED', 'direct', 'none'
  ) RETURNING id INTO touch_direct;

  SELECT count(*) INTO seen
  FROM public.marketing_touches
  WHERE session_id = '1786359489006_c279w4lft';
  IF seen <> 4 THEN
    RAISE EXCEPTION 'expected 4 touches on one session, got %', seen;
  END IF;

  -- 5. NO_MARKETING_SIGNAL is valid. 6. UNKNOWN is not a touch class.
  INSERT INTO public.marketing_touches (
    tenant_id, session_id, idempotency_key, touch_at, captured_at, attribution_class
  ) VALUES (
    tenant_a, '1789983305787_yho7yno1z', 'fp-nosignal',
    '2026-09-21 09:37:16+00', '2026-09-21 09:37:17+00', 'NO_MARKETING_SIGNAL'
  ) RETURNING id INTO touch_signal;

  BEGIN
    INSERT INTO public.marketing_touches (
      tenant_id, session_id, idempotency_key, touch_at, captured_at, attribution_class
    ) VALUES (
      tenant_a, '1789983305787_yho7yno1z', 'fp-unknown',
      '2026-09-21 09:37:16+00', '2026-09-21 09:37:18+00', 'UNKNOWN'
    );
    RAISE EXCEPTION 'UNKNOWN was stored as a touch class';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- 20. The four clocks are different columns.
  IF (SELECT touch_at = captured_at FROM public.marketing_touches WHERE id = touch_google) THEN
    RAISE EXCEPTION 'touch_at and captured_at collapsed';
  END IF;

  -- 7-9. Immutability holds for the table owner and for service_role.
  BEGIN
    UPDATE public.marketing_touches SET gclid = 'rewritten' WHERE id = touch_google;
    RAISE EXCEPTION 'protected gclid update was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  UPDATE public.marketing_touches SET user_id = customer WHERE id = touch_google;
  IF (SELECT user_id FROM public.marketing_touches WHERE id = touch_google) IS DISTINCT FROM customer THEN
    RAISE EXCEPTION 'user bind did not persist';
  END IF;

  BEGIN
    UPDATE public.marketing_touches SET user_id = other_customer WHERE id = touch_google;
    RAISE EXCEPTION 'user rebind was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- 13-15. signal_state controls touch_id.
  BEGIN
    INSERT INTO public.marketing_conversions (
      tenant_id, signal_state, conversion_at, conversion_type, user_id
    ) VALUES (
      tenant_a, 'credited', '2026-09-21 17:16:54+00', 'booking', customer
    );
    RAISE EXCEPTION 'credited conversion without touch_id was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  INSERT INTO public.marketing_conversions (
    tenant_id, touch_id, signal_state, conversion_at, conversion_type,
    user_id, appointment_id, match_method
  ) VALUES (
    tenant_a, touch_google, 'credited', '2026-09-21 17:16:54+00', 'booking',
    customer, appt, 'email'
  ) RETURNING id INTO conv;

  INSERT INTO public.marketing_conversions (
    tenant_id, signal_state, conversion_at, conversion_type, registration_id
  ) VALUES (
    tenant_a, 'no_marketing_signal', '2026-09-22 08:30:24+00', 'course', reg
  );

  INSERT INTO public.marketing_conversions (
    tenant_id, signal_state, conversion_at, conversion_type
  ) VALUES (
    tenant_b, 'unknown', '2026-09-21 08:20:58+00', 'follow_up'
  );

  BEGIN
    INSERT INTO public.marketing_conversions (
      tenant_id, touch_id, signal_state, conversion_at, conversion_type
    ) VALUES (
      tenant_a, touch_signal, 'unknown', '2026-09-21 08:20:58+00', 'booking'
    );
    RAISE EXCEPTION 'unknown conversion kept a touch_id';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- 16-18. One conversion per appointment and registration. Payments share.
  BEGIN
    INSERT INTO public.marketing_conversions (
      tenant_id, touch_id, signal_state, conversion_at, conversion_type, appointment_id
    ) VALUES (
      tenant_a, touch_direct, 'credited', '2026-09-22 10:00:00+00', 'booking', appt
    );
    RAISE EXCEPTION 'second conversion reused appointment_id';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  UPDATE public.appointments SET conversion_id = conv WHERE id = appt;
  BEGIN
    UPDATE public.appointments SET conversion_id = conv WHERE id = appt2;
    RAISE EXCEPTION 'two appointments shared conversion_id';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  INSERT INTO public.payments (id, paid_at, conversion_id) VALUES
    (pay1, paid, conv),
    (pay2, paid + interval '1 hour', conv);
  IF (SELECT count(DISTINCT conversion_id) FROM public.payments) <> 1 THEN
    RAISE EXCEPTION 'payments did not share one conversion';
  END IF;
  IF (SELECT paid_at FROM public.payments WHERE id = pay1) = (SELECT conversion_at FROM public.marketing_conversions WHERE id = conv) THEN
    RAISE EXCEPTION 'paid_at collapsed into conversion_at';
  END IF;
  IF (SELECT conversion_at FROM public.marketing_conversions WHERE id = conv)
     = (SELECT touch_at FROM public.marketing_touches WHERE id = touch_google) THEN
    RAISE EXCEPTION 'conversion_at collapsed into touch_at';
  END IF;

  -- Registration uniqueness.
  BEGIN
    INSERT INTO public.marketing_conversions (
      tenant_id, signal_state, conversion_at, conversion_type, registration_id
    ) VALUES (
      tenant_a, 'unknown', '2026-09-22 11:00:00+00', 'course', reg
    );
    RAISE EXCEPTION 'second conversion reused registration_id';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- Payments gained no channel columns. Existing acquisition columns were not recreated.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments'
      AND column_name IN ('gclid', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign')
  ) THEN
    RAISE EXCEPTION 'payment channel column was added';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'acquisition_at'
  ) THEN
    RAISE EXCEPTION 'migration recreated acquisition_at';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'acquisition_touch_id'
  ) THEN
    RAISE EXCEPTION 'acquisition_touch_id missing';
  END IF;

  -- 19. Deleting the user nulls the touch binding and keeps the credited touch.
  DELETE FROM public.users WHERE id = customer;
  IF NOT EXISTS (SELECT 1 FROM public.marketing_touches WHERE id = touch_google) THEN
    RAISE EXCEPTION 'credited touch was deleted with the user';
  END IF;
  IF (SELECT user_id FROM public.marketing_touches WHERE id = touch_google) IS NOT NULL THEN
    RAISE EXCEPTION 'touch.user_id was not nulled';
  END IF;
  IF (SELECT touch_id FROM public.marketing_conversions WHERE id = conv) IS DISTINCT FROM touch_google THEN
    RAISE EXCEPTION 'conversion lost its touch';
  END IF;
  BEGIN
    DELETE FROM public.marketing_touches WHERE id = touch_google;
    RAISE EXCEPTION 'credited touch delete was accepted';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
END $$;

-- 10-12. RLS. Runs as the named roles, outside the owner session of the DO block.
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

SET ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.marketing_touches;
    RAISE EXCEPTION 'anon read was permitted';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    INSERT INTO public.marketing_touches (
      tenant_id, session_id, idempotency_key, touch_at, captured_at, attribution_class
    ) VALUES (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '1789983305787_yho7yno1z', 'fp-anon',
      now(), now(), 'NO_MARKETING_SIGNAL'
    );
    RAISE EXCEPTION 'anon insert was permitted';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
RESET ROLE;

SET ROLE authenticated;
DO $$
DECLARE
  seen int;
BEGIN
  SELECT count(*) INTO seen FROM public.marketing_touches;
  IF seen <> 5 THEN
    RAISE EXCEPTION 'staff A should see 5 tenant A touches, saw %', seen;
  END IF;
  SELECT count(*) INTO seen
  FROM public.marketing_touches
  WHERE tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  IF seen <> 0 THEN
    RAISE EXCEPTION 'staff A saw tenant B touches';
  END IF;
  BEGIN
    INSERT INTO public.marketing_touches (
      tenant_id, session_id, idempotency_key, touch_at, captured_at, attribution_class
    ) VALUES (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '1789983305787_yho7yno1z', 'fp-auth',
      now(), now(), 'NO_MARKETING_SIGNAL'
    );
    RAISE EXCEPTION 'authenticated insert was permitted';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
RESET ROLE;

SET ROLE service_role;
DO $$
BEGIN
  BEGIN
    UPDATE public.marketing_touches
    SET touch_at = now()
    WHERE idempotency_key = 'fp-meta';
    RAISE EXCEPTION 'service_role changed touch_at';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
SET ROLE authenticated;
DO $$
DECLARE
  seen int;
BEGIN
  SELECT count(*) INTO seen FROM public.marketing_touches;
  IF seen <> 0 THEN
    RAISE EXCEPTION 'staff B should see no tenant A touches, saw %', seen;
  END IF;
END $$;
RESET ROLE;
