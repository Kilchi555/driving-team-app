-- Server-confirmed current SARI membership.
-- One row is one numeric SARI courseid confirmed for one registration.
-- This file does not backfill and does not change existing business rows.
-- Apply before any application code that writes this table.

-- Parent unique keys required by the composite foreign keys.
-- id is already the primary key, so (id, tenant_id) is unique without rewriting rows.
-- Skip when a unique constraint already covers those columns in that order.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'course_registrations'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname::text ORDER BY u.ord)
        FROM unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord)
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = u.attnum
      ) = ARRAY['id', 'tenant_id']::text[]
  ) THEN
    ALTER TABLE public.course_registrations
      ADD CONSTRAINT course_registrations_id_tenant_id_key
      UNIQUE (id, tenant_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'course_sessions'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname::text ORDER BY u.ord)
        FROM unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord)
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = u.attnum
      ) = ARRAY['id', 'tenant_id']::text[]
  ) THEN
    ALTER TABLE public.course_sessions
      ADD CONSTRAINT course_sessions_id_tenant_id_key
      UNIQUE (id, tenant_id);
  END IF;
END $$;

CREATE TABLE public.registration_sari_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  registration_id uuid NOT NULL,
  sari_session_id bigint NOT NULL,
  course_session_id uuid NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registration_sari_memberships_pkey PRIMARY KEY (id),
  CONSTRAINT registration_sari_memberships_sari_session_id_check
    CHECK (sari_session_id > 0),
  CONSTRAINT registration_sari_memberships_reg_sari_uid
    UNIQUE (registration_id, sari_session_id),
  CONSTRAINT registration_sari_memberships_registration_tenant_fkey
    FOREIGN KEY (registration_id, tenant_id)
    REFERENCES public.course_registrations (id, tenant_id)
    ON DELETE RESTRICT,
  CONSTRAINT registration_sari_memberships_course_session_tenant_fkey
    FOREIGN KEY (course_session_id, tenant_id)
    REFERENCES public.course_sessions (id, tenant_id)
    ON DELETE SET NULL (course_session_id)
);

COMMENT ON TABLE public.registration_sari_memberships IS
  'Source of truth for server-confirmed current SARI membership. One row is one numeric SARI courseid confirmed for one registration. No row means no currently confirmed membership.';

COMMENT ON COLUMN public.registration_sari_memberships.sari_session_id IS
  'Numeric SARI courseid confirmed by the server. Not a GROUP_* value and not courses.sari_course_id.';

COMMENT ON COLUMN public.registration_sari_memberships.course_session_id IS
  'Provenance only: the local course_sessions row that authorized this id. Unenroll uses sari_session_id after this column is cleared.';

ALTER TABLE public.registration_sari_memberships ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.registration_sari_memberships FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.registration_sari_memberships TO service_role;
