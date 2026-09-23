-- PR A: additive marketing touch + conversion schema.
--
-- Does not rewrite historical attribution, does not backfill, and does not
-- change users.acquisition_* meaning. Those live columns are written by
-- server/utils/first-touch-acquisition.ts and
-- server/utils/save-acquisition-self-report.ts and are intentionally left
-- untouched:
--   acquisition_source, acquisition_medium, acquisition_campaign,
--   acquisition_term, acquisition_gclid, acquisition_referrer_page,
--   acquisition_at (stamp clock, not touch time),
--   acquisition_self_reported, acquisition_self_reported_note,
--   acquisition_self_reported_at.
-- This migration only adds nullable users.acquisition_touch_id.
--
-- migrations/20260908_binding_booking_conversion_claim.sql is NOT applied
-- and NOT modified here. Whether its unique indexes exist in production
-- is UNKNOWN. This schema does not depend on them.
--
-- Retention (no purge job in PR A):
--   Unattached anonymous touches are eligible to expire after 90 days.
--   A touch credited by marketing_conversions is kept with that conversion
--   (ON DELETE RESTRICT). Customer delete sets marketing_touches.user_id
--   to NULL and does not delete the credited touch.
--   Tenant delete cascades touch and conversion rows.
--
-- UNKNOWN is a conversion signal_state, never a touch attribution_class.

BEGIN;

-- ---------------------------------------------------------------------------
-- marketing_touches (append-only observations)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_touches (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES public.users(id) ON DELETE SET NULL,
  session_id        text NOT NULL,
  idempotency_key   text NOT NULL,
  touch_at          timestamptz NOT NULL,
  captured_at       timestamptz NOT NULL,
  source            text,
  medium            text,
  campaign          text,
  term              text,
  content           text,
  gclid             text,
  gbraid            text,
  wbraid            text,
  fbclid            text,
  fbc               text,
  fbp               text,
  referrer          text,
  landing_page      text,
  attribution_class text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_touches_session_id_format CHECK (
    session_id ~ '^[0-9]+_[0-9a-z]{9}$'
  ),
  CONSTRAINT marketing_touches_attribution_class_check CHECK (
    attribution_class IN (
      'PAID_GOOGLE',
      'PAID_META',
      'CHATGPT',
      'DIRECT_CONFIRMED',
      'ORGANIC_CONFIRMED',
      'OTHER_REFERRER',
      'NO_MARKETING_SIGNAL'
    )
  )
);

COMMENT ON TABLE public.marketing_touches IS
  'Append-only marketing observations. One session may have many rows. '
  'attribution_class never includes UNKNOWN. '
  'Unattached rows may be purged after 90 days by a later job; '
  'rows referenced by marketing_conversions are retained. '
  'Do not UPDATE protected columns; bind user_id at most once.';

COMMENT ON COLUMN public.marketing_touches.touch_at IS
  'Event time of this observation. Not captured_at, not users.acquisition_at, not conversion_at.';
COMMENT ON COLUMN public.marketing_touches.captured_at IS
  'Server receipt time. Distinct from touch_at.';
COMMENT ON COLUMN public.marketing_touches.idempotency_key IS
  'Fingerprint of tenant, session, class, click ids, UTM and landing. Same fingerprint is the same touch.';
COMMENT ON COLUMN public.marketing_touches.session_id IS
  'analytics/marketing session id {epochMillis}_{9 base36}. Not unique.';

CREATE UNIQUE INDEX IF NOT EXISTS marketing_touches_tenant_idempotency_uidx
  ON public.marketing_touches (tenant_id, idempotency_key);

CREATE INDEX IF NOT EXISTS marketing_touches_tenant_user_touch_at_idx
  ON public.marketing_touches (tenant_id, user_id, touch_at)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS marketing_touches_tenant_session_touch_at_idx
  ON public.marketing_touches (tenant_id, session_id, touch_at);

CREATE INDEX IF NOT EXISTS marketing_touches_tenant_touch_at_idx
  ON public.marketing_touches (tenant_id, touch_at);

-- Service role may UPDATE only to bind user_id. The trigger blocks every
-- other column, including writes that bypass RLS.
CREATE OR REPLACE FUNCTION public.marketing_touches_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.session_id IS DISTINCT FROM OLD.session_id
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.touch_at IS DISTINCT FROM OLD.touch_at
     OR NEW.captured_at IS DISTINCT FROM OLD.captured_at
     OR NEW.source IS DISTINCT FROM OLD.source
     OR NEW.medium IS DISTINCT FROM OLD.medium
     OR NEW.campaign IS DISTINCT FROM OLD.campaign
     OR NEW.term IS DISTINCT FROM OLD.term
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.gclid IS DISTINCT FROM OLD.gclid
     OR NEW.gbraid IS DISTINCT FROM OLD.gbraid
     OR NEW.wbraid IS DISTINCT FROM OLD.wbraid
     OR NEW.fbclid IS DISTINCT FROM OLD.fbclid
     OR NEW.fbc IS DISTINCT FROM OLD.fbc
     OR NEW.fbp IS DISTINCT FROM OLD.fbp
     OR NEW.referrer IS DISTINCT FROM OLD.referrer
     OR NEW.landing_page IS DISTINCT FROM OLD.landing_page
     OR NEW.attribution_class IS DISTINCT FROM OLD.attribution_class
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'marketing_touches_immutable'
      USING ERRCODE = '23514';
  END IF;

  -- NULL → one user is the bind. A different user is rejected.
  -- user → NULL is the ON DELETE SET NULL path when the user row is removed.
  IF OLD.user_id IS NOT NULL
     AND NEW.user_id IS NOT NULL
     AND NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'marketing_touches_user_id_bound'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_touches_reject_mutation ON public.marketing_touches;
CREATE TRIGGER marketing_touches_reject_mutation
  BEFORE UPDATE ON public.marketing_touches
  FOR EACH ROW
  EXECUTE FUNCTION public.marketing_touches_reject_mutation();

ALTER TABLE public.marketing_touches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_touches FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_touches_anon_deny ON public.marketing_touches;
CREATE POLICY marketing_touches_anon_deny
  ON public.marketing_touches
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS marketing_touches_staff_select ON public.marketing_touches;
CREATE POLICY marketing_touches_staff_select
  ON public.marketing_touches
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS marketing_touches_authenticated_no_insert ON public.marketing_touches;
CREATE POLICY marketing_touches_authenticated_no_insert
  ON public.marketing_touches
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS marketing_touches_authenticated_no_update ON public.marketing_touches;
CREATE POLICY marketing_touches_authenticated_no_update
  ON public.marketing_touches
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS marketing_touches_authenticated_no_delete ON public.marketing_touches;
CREATE POLICY marketing_touches_authenticated_no_delete
  ON public.marketing_touches
  FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS marketing_touches_service_role_all ON public.marketing_touches;
CREATE POLICY marketing_touches_service_role_all
  ON public.marketing_touches
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- marketing_conversions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_conversions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  touch_id          uuid REFERENCES public.marketing_touches(id) ON DELETE RESTRICT,
  signal_state      text NOT NULL,
  conversion_at     timestamptz NOT NULL,
  conversion_type   text NOT NULL,
  user_id           uuid REFERENCES public.users(id) ON DELETE SET NULL,
  appointment_id    uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  registration_id   uuid REFERENCES public.course_registrations(id) ON DELETE SET NULL,
  proposal_id       uuid REFERENCES public.booking_proposals(id) ON DELETE SET NULL,
  match_method      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_conversions_signal_state_check CHECK (
    signal_state IN ('credited', 'no_marketing_signal', 'unknown')
  ),
  CONSTRAINT marketing_conversions_touch_required_when_credited CHECK (
    (signal_state = 'credited' AND touch_id IS NOT NULL)
    OR (signal_state IN ('no_marketing_signal', 'unknown') AND touch_id IS NULL)
  ),
  CONSTRAINT marketing_conversions_type_check CHECK (
    conversion_type IN ('booking', 'course', 'inquiry', 'follow_up')
  ),
  CONSTRAINT marketing_conversions_match_method_check CHECK (
    match_method IS NULL OR match_method IN ('user_id', 'email', 'phone')
  )
);

COMMENT ON TABLE public.marketing_conversions IS
  'Conversion credit. touch_id is set only when signal_state = credited. '
  'no_marketing_signal means a session was seen and had no identifiable touch. '
  'unknown means no session was bound. conversion_at is not touch_at and not paid_at. '
  'Deleting the credited touch is refused.';

COMMENT ON COLUMN public.marketing_conversions.conversion_at IS
  'Time of the conversion event (appointment confirm, course confirm, or proposal submit). Not the click time and not payment.paid_at.';
COMMENT ON COLUMN public.marketing_conversions.signal_state IS
  'credited | no_marketing_signal | unknown. unknown is not a marketing_touches.attribution_class.';

CREATE UNIQUE INDEX IF NOT EXISTS marketing_conversions_appointment_id_uidx
  ON public.marketing_conversions (appointment_id)
  WHERE appointment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS marketing_conversions_registration_id_uidx
  ON public.marketing_conversions (registration_id)
  WHERE registration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS marketing_conversions_touch_id_idx
  ON public.marketing_conversions (touch_id);

CREATE INDEX IF NOT EXISTS marketing_conversions_user_conversion_at_idx
  ON public.marketing_conversions (user_id, conversion_at);

ALTER TABLE public.marketing_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_conversions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_conversions_anon_deny ON public.marketing_conversions;
CREATE POLICY marketing_conversions_anon_deny
  ON public.marketing_conversions
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS marketing_conversions_staff_select ON public.marketing_conversions;
CREATE POLICY marketing_conversions_staff_select
  ON public.marketing_conversions
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('admin', 'staff', 'tenant_admin', 'super_admin')
        AND u.is_active = true
        AND u.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS marketing_conversions_authenticated_no_insert ON public.marketing_conversions;
CREATE POLICY marketing_conversions_authenticated_no_insert
  ON public.marketing_conversions
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS marketing_conversions_authenticated_no_update ON public.marketing_conversions;
CREATE POLICY marketing_conversions_authenticated_no_update
  ON public.marketing_conversions
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS marketing_conversions_authenticated_no_delete ON public.marketing_conversions;
CREATE POLICY marketing_conversions_authenticated_no_delete
  ON public.marketing_conversions
  FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS marketing_conversions_service_role_all ON public.marketing_conversions;
CREATE POLICY marketing_conversions_service_role_all
  ON public.marketing_conversions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Nullable links. No channel columns on payments.
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS conversion_id uuid;

ALTER TABLE public.course_registrations
  ADD COLUMN IF NOT EXISTS conversion_id uuid;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS conversion_id uuid;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS acquisition_touch_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_conversion_id_fkey'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_conversion_id_fkey
      FOREIGN KEY (conversion_id) REFERENCES public.marketing_conversions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_registrations_conversion_id_fkey'
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_conversion_id_fkey
      FOREIGN KEY (conversion_id) REFERENCES public.marketing_conversions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_conversion_id_fkey'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_conversion_id_fkey
      FOREIGN KEY (conversion_id) REFERENCES public.marketing_conversions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_acquisition_touch_id_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_acquisition_touch_id_fkey
      FOREIGN KEY (acquisition_touch_id) REFERENCES public.marketing_touches(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_conversion_id_uidx
  ON public.appointments (conversion_id)
  WHERE conversion_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS course_registrations_conversion_id_uidx
  ON public.course_registrations (conversion_id)
  WHERE conversion_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_conversion_id_idx
  ON public.payments (conversion_id)
  WHERE conversion_id IS NOT NULL;

COMMENT ON COLUMN public.appointments.conversion_id IS
  'Optional link to marketing_conversions. Does not replace legacy gclid/UTM columns.';
COMMENT ON COLUMN public.course_registrations.conversion_id IS
  'Optional link to marketing_conversions for this registration.';
COMMENT ON COLUMN public.payments.conversion_id IS
  'Optional link to marketing_conversions. Several payments may share one conversion. Not a channel.';
COMMENT ON COLUMN public.users.acquisition_touch_id IS
  'Nullable pointer to the first identifiable marketing_touches row. Does not change acquisition_at.';

-- Grants. RLS still denies anon and authenticated writes.
REVOKE ALL ON public.marketing_touches FROM PUBLIC, anon;
REVOKE ALL ON public.marketing_conversions FROM PUBLIC, anon;
GRANT SELECT ON public.marketing_touches TO authenticated;
GRANT SELECT ON public.marketing_conversions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_touches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_conversions TO service_role;

COMMIT;
