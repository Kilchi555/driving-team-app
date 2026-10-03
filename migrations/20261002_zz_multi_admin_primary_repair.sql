-- MULTI-ADMIN PRIMARY REPAIR + CONSTRAINTS
--
-- Production apply: NO until the read-only diagnostics have been reviewed.
-- This migration is not executed by application code.
-- Do not create Auth users. Do not repair admin_level.
--
-- =============================================================================
-- READ-ONLY DIAGNOSTICS
-- Run these SELECTs before applying the transaction below. Do not invent counts.
-- They are comments so applying this file does not mutate during diagnosis.
-- =============================================================================
--
-- 1. Active primaries per tenant
-- SELECT tenant_id, count(*) AS active_primaries
-- FROM public.users
-- WHERE is_primary_admin = true
--   AND is_active = true
--   AND deleted_at IS NULL
-- GROUP BY tenant_id
-- ORDER BY active_primaries DESC, tenant_id;
--
-- 2. Primary flag on a non-admin
-- SELECT id, tenant_id, role, is_primary_admin, is_active, deleted_at, auth_user_id
-- FROM public.users
-- WHERE is_primary_admin = true
--   AND role IS DISTINCT FROM 'admin';
--
-- 3. Primary without a login
-- SELECT id, tenant_id, role, is_primary_admin, auth_user_id
-- FROM public.users
-- WHERE is_primary_admin = true
--   AND auth_user_id IS NULL;
--
-- 4. Tenants without a login-capable admin
-- SELECT t.id AS tenant_id
-- FROM public.tenants t
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.users u
--   WHERE u.tenant_id = t.id
--     AND u.role = 'admin'
--     AND u.is_active = true
--     AND u.deleted_at IS NULL
--     AND u.auth_user_id IS NOT NULL
-- );
--
-- 5. Login-less admins
-- SELECT id, tenant_id, role, is_active, deleted_at, auth_user_id, is_primary_admin
-- FROM public.users
-- WHERE role = 'admin'
--   AND auth_user_id IS NULL;
--
-- 6. Stored role values
-- SELECT role, count(*) AS rows
-- FROM public.users
-- GROUP BY role
-- ORDER BY rows DESC, role;
--
-- 7. Session revocation function
-- SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname = 'sa_revoke_auth_sessions';
--
-- =============================================================================
-- REPAIR + CHECK + UNIQUE INDEX (one transaction)
-- =============================================================================

BEGIN;

-- 1. Primary flag on a non-admin
UPDATE public.users
SET is_primary_admin = false
WHERE is_primary_admin = true
  AND role IS DISTINCT FROM 'admin';

-- 2. Primary without a login
UPDATE public.users
SET is_primary_admin = false
WHERE is_primary_admin = true
  AND auth_user_id IS NULL;

-- 3. Primary who is inactive or deleted
UPDATE public.users
SET is_primary_admin = false
WHERE is_primary_admin = true
  AND (is_active IS NOT TRUE OR deleted_at IS NOT NULL);

-- 4. Several remaining valid primaries: keep the oldest
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY tenant_id
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.users
  WHERE is_primary_admin = true
    AND role = 'admin'
    AND is_active = true
    AND deleted_at IS NULL
    AND auth_user_id IS NOT NULL
)
UPDATE public.users AS u
SET is_primary_admin = false
FROM ranked AS r
WHERE u.id = r.id
  AND r.rn > 1;

-- 5. No remaining primary: promote the oldest login-capable active admin.
--    Tenants with none stay at zero primaries. No Auth user is created.
WITH missing AS (
  SELECT t.id AS tenant_id
  FROM public.tenants t
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.tenant_id = t.id
      AND u.is_primary_admin = true
      AND u.role = 'admin'
      AND u.is_active = true
      AND u.deleted_at IS NULL
  )
),
candidate AS (
  SELECT DISTINCT ON (u.tenant_id) u.id
  FROM public.users u
  JOIN missing m ON m.tenant_id = u.tenant_id
  WHERE u.role = 'admin'
    AND u.is_active = true
    AND u.deleted_at IS NULL
    AND u.auth_user_id IS NOT NULL
  ORDER BY u.tenant_id, u.created_at ASC NULLS LAST, u.id ASC
)
UPDATE public.users AS u
SET is_primary_admin = true
FROM candidate AS c
WHERE u.id = c.id;

DO $repair_check$
DECLARE
  bad integer;
BEGIN
  SELECT count(*) INTO bad
  FROM (
    SELECT tenant_id
    FROM public.users
    WHERE is_primary_admin = true
      AND is_active = true
      AND deleted_at IS NULL
    GROUP BY tenant_id
    HAVING count(*) > 1
  ) AS multi;

  IF bad > 0 THEN
    RAISE EXCEPTION 'primary repair left % tenant(s) with multiple active primaries', bad;
  END IF;

  SELECT count(*) INTO bad
  FROM public.users
  WHERE is_primary_admin = true
    AND role IS DISTINCT FROM 'admin';

  IF bad > 0 THEN
    RAISE EXCEPTION 'primary repair left % primary row(s) on a non-admin', bad;
  END IF;

  SELECT count(*) INTO bad
  FROM public.users
  WHERE is_primary_admin = true
    AND (
      auth_user_id IS NULL
      OR is_active IS NOT TRUE
      OR deleted_at IS NOT NULL
    );

  IF bad > 0 THEN
    RAISE EXCEPTION 'primary repair left % primary row(s) without an active login', bad;
  END IF;
END
$repair_check$;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_primary_admin_requires_admin_role;

ALTER TABLE public.users
  ADD CONSTRAINT users_primary_admin_requires_admin_role
  CHECK (is_primary_admin = false OR role = 'admin');

CREATE UNIQUE INDEX IF NOT EXISTS users_one_active_primary_per_tenant
  ON public.users (tenant_id)
  WHERE is_primary_admin = true
    AND is_active = true
    AND deleted_at IS NULL;

COMMIT;
