-- staff_locations tenant integrity.
-- A row may exist only when the staff user and the location share staff_locations.tenant_id.
-- Parent uniqueness on (id, tenant_id) is required so the composite foreign keys have a target.
-- Existing single-column foreign keys stay as they are.
-- No data rewrite. Apply only when current rows already agree on tenant_id.
-- Read-only check on 2026-10-02: 59 rows, 0 staff mismatches, 0 location mismatches.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS users_id_tenant_id_key
  ON public.users (id, tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS locations_id_tenant_id_key
  ON public.locations (id, tenant_id);

DO $staff_locations_tenant_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_locations_staff_tenant_fkey'
  ) THEN
    ALTER TABLE public.staff_locations
      ADD CONSTRAINT staff_locations_staff_tenant_fkey
      FOREIGN KEY (staff_id, tenant_id)
      REFERENCES public.users (id, tenant_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_locations_location_tenant_fkey'
  ) THEN
    ALTER TABLE public.staff_locations
      ADD CONSTRAINT staff_locations_location_tenant_fkey
      FOREIGN KEY (location_id, tenant_id)
      REFERENCES public.locations (id, tenant_id)
      ON DELETE CASCADE;
  END IF;
END
$staff_locations_tenant_fk$;

COMMIT;
