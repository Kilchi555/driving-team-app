-- Canonical course-cancellation DB cascade (idempotent).
-- Ship with this PR; apply on deploy only — not executed against production by the incident branch.
--
-- Atomic tenant-scoped transitions:
--   courses → cancelled
--   active course_registrations → status cancelled (schema has no cancelled_at)
--   unpaid linked payments → payment_status cancelled
--   unpaid linked invoices → status cancelled (history preserved)
--   room_bookings / vehicle_bookings → status cancelled
-- Paid/settled financial rows are skipped (no refunds).

CREATE OR REPLACE FUNCTION public.cancel_course_database_cascade(
  p_tenant_id uuid,
  p_course_id uuid,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_course_status text;
  v_already_cancelled boolean := false;
  v_cancelled_reg_ids uuid[] := ARRAY[]::uuid[];
  v_cancelled_payment_ids uuid[] := ARRAY[]::uuid[];
  v_cancelled_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_skipped_payment_ids uuid[] := ARRAY[]::uuid[];
  v_skipped_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_room_ids uuid[] := ARRAY[]::uuid[];
  v_vehicle_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT status INTO v_course_status
  FROM public.courses
  WHERE id = p_course_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'course_not_found_or_wrong_tenant' USING ERRCODE = 'P0002';
  END IF;

  v_already_cancelled := (v_course_status = 'cancelled');

  IF NOT v_already_cancelled THEN
    UPDATE public.courses
    SET
      status = 'cancelled',
      is_active = false,
      cancelled_at = v_now,
      cancelled_by = p_actor_id,
      status_changed_at = v_now,
      status_changed_by = p_actor_id,
      updated_at = v_now
    WHERE id = p_course_id
      AND tenant_id = p_tenant_id;
  END IF;

  WITH updated AS (
    UPDATE public.course_registrations
    SET status = 'cancelled', updated_at = v_now
    WHERE course_id = p_course_id
      AND tenant_id = p_tenant_id
      AND deleted_at IS NULL
      AND status IS DISTINCT FROM 'cancelled'
    RETURNING id
  )
  SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO v_cancelled_reg_ids FROM updated;

  WITH linked AS (
    SELECT DISTINCT p.id, p.payment_status, p.paid_at, coalesce(p.amount_paid_rappen, 0) AS amount_paid_rappen
    FROM public.payments p
    WHERE p.tenant_id = p_tenant_id
      AND (
        p.course_registration_id IN (
          SELECT id FROM public.course_registrations
          WHERE course_id = p_course_id AND tenant_id = p_tenant_id
        )
        OR p.id IN (
          SELECT payment_id FROM public.course_registrations
          WHERE course_id = p_course_id
            AND tenant_id = p_tenant_id
            AND payment_id IS NOT NULL
        )
      )
  ),
  classified AS (
    SELECT id,
      CASE
        WHEN payment_status IN ('cancelled', 'refunded') THEN 'noop'
        WHEN payment_status IN ('completed', 'paid')
          OR paid_at IS NOT NULL
          OR amount_paid_rappen > 0 THEN 'skip_paid'
        ELSE 'cancel'
      END AS action
    FROM linked
  ),
  cancelled AS (
    UPDATE public.payments p
    SET payment_status = 'cancelled', updated_at = v_now, updated_by = p_actor_id
    FROM classified c
    WHERE p.id = c.id
      AND c.action = 'cancel'
      AND p.tenant_id = p_tenant_id
    RETURNING p.id
  )
  SELECT
    (SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) FROM cancelled),
    (SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) FROM classified WHERE action = 'skip_paid')
  INTO v_cancelled_payment_ids, v_skipped_payment_ids;

  WITH linked_inv AS (
    SELECT DISTINCT i.id, i.status, i.payment_status, i.paid_at, coalesce(i.paid_amount_rappen, 0) AS paid_amount_rappen
    FROM public.invoices i
    WHERE i.tenant_id = p_tenant_id
      AND (
        i.id IN (
          SELECT invoice_id FROM public.course_registrations
          WHERE course_id = p_course_id AND tenant_id = p_tenant_id AND invoice_id IS NOT NULL
        )
        OR i.id IN (
          SELECT cib.invoice_id
          FROM public.course_invoice_bindings cib
          JOIN public.course_registrations cr ON cr.id = cib.registration_id
          WHERE cr.course_id = p_course_id AND cr.tenant_id = p_tenant_id
        )
        OR i.id IN (
          SELECT invoice_id FROM public.payments
          WHERE tenant_id = p_tenant_id
            AND invoice_id IS NOT NULL
            AND course_registration_id IN (
              SELECT id FROM public.course_registrations
              WHERE course_id = p_course_id AND tenant_id = p_tenant_id
            )
        )
      )
  ),
  inv_classified AS (
    SELECT id,
      CASE
        WHEN status = 'cancelled' THEN 'noop'
        WHEN payment_status IN ('paid', 'completed')
          OR paid_at IS NOT NULL
          OR paid_amount_rappen > 0 THEN 'skip_paid'
        ELSE 'cancel'
      END AS action
    FROM linked_inv
  ),
  cancelled_inv AS (
    UPDATE public.invoices i
    SET
      status = 'cancelled',
      updated_at = v_now,
      notes = CASE
        WHEN notes IS NULL OR btrim(notes) = '' THEN
          'Storniert wegen Kursabsage am ' || to_char(v_now AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI')
        ELSE
          notes || E'\nStorniert wegen Kursabsage am ' || to_char(v_now AT TIME ZONE 'Europe/Zurich', 'DD.MM.YYYY HH24:MI')
      END
    FROM inv_classified c
    WHERE i.id = c.id
      AND c.action = 'cancel'
      AND i.tenant_id = p_tenant_id
    RETURNING i.id
  )
  SELECT
    (SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) FROM cancelled_inv),
    (SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) FROM inv_classified WHERE action = 'skip_paid')
  INTO v_cancelled_invoice_ids, v_skipped_invoice_ids;

  WITH updated_rooms AS (
    UPDATE public.room_bookings
    SET status = 'cancelled', updated_at = v_now
    WHERE course_id = p_course_id
      AND tenant_id = p_tenant_id
      AND status IS DISTINCT FROM 'cancelled'
    RETURNING id
  )
  SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO v_room_ids FROM updated_rooms;

  WITH updated_vehicles AS (
    UPDATE public.vehicle_bookings
    SET status = 'cancelled', updated_at = v_now
    WHERE course_id = p_course_id
      AND tenant_id = p_tenant_id
      AND status IS DISTINCT FROM 'cancelled'
    RETURNING id
  )
  SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO v_vehicle_ids FROM updated_vehicles;

  RETURN jsonb_build_object(
    'course_id', p_course_id,
    'tenant_id', p_tenant_id,
    'already_cancelled', v_already_cancelled,
    'registration_ids', to_jsonb(v_cancelled_reg_ids),
    'payment_ids_cancelled', to_jsonb(v_cancelled_payment_ids),
    'payment_ids_skipped_paid', to_jsonb(v_skipped_payment_ids),
    'invoice_ids_cancelled', to_jsonb(v_cancelled_invoice_ids),
    'invoice_ids_skipped_paid', to_jsonb(v_skipped_invoice_ids),
    'room_booking_ids', to_jsonb(v_room_ids),
    'vehicle_booking_ids', to_jsonb(v_vehicle_ids),
    'completed_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_course_database_cascade(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_course_database_cascade(uuid, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.cancel_course_database_cascade(uuid, uuid, uuid) IS
  'Idempotent tenant-scoped course cancellation cascade for registrations, unpaid payments/invoices, and resource bookings. No refunds/emails.';
