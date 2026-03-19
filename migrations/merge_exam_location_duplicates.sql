-- Migration: Merge tenant-specific exam location duplicates into global entries
-- 
-- Problem: Some exam locations exist both as global (tenant_id = null) and as
-- tenant-specific copies. Staff IDs were accidentally stored in the tenant copy
-- instead of the global entry.
--
-- Fix: For each tenant-specific exam location, find the matching global entry
-- and merge its staff_ids into the global entry, then delete the duplicate.

DO $$
DECLARE
  tenant_loc RECORD;
  global_loc RECORD;
  merged_staff_ids TEXT[];
BEGIN
  -- Loop over all tenant-specific exam locations
  FOR tenant_loc IN
    SELECT *
    FROM locations
    WHERE location_type = 'exam'
      AND tenant_id IS NOT NULL
  LOOP
    -- Find the matching global entry by name + address
    SELECT * INTO global_loc
    FROM locations
    WHERE location_type = 'exam'
      AND tenant_id IS NULL
      AND name = tenant_loc.name
      AND address = tenant_loc.address
    LIMIT 1;

    IF global_loc.id IS NOT NULL THEN
      -- Merge staff_ids: combine both jsonb arrays, remove duplicates
      merged_staff_ids := ARRAY(
        SELECT DISTINCT jsonb_array_elements_text(
          COALESCE(global_loc.staff_ids, '[]'::jsonb) ||
          COALESCE(tenant_loc.staff_ids, '[]'::jsonb)
        )
      );

      -- Update the global entry with merged staff_ids (store back as jsonb)
      UPDATE locations
      SET staff_ids = to_jsonb(merged_staff_ids)
      WHERE id = global_loc.id;

      RAISE NOTICE 'Merged staff_ids from tenant entry "%" into global entry. New staff_ids: %',
        tenant_loc.name, merged_staff_ids;

      -- Delete the now-redundant tenant-specific entry
      DELETE FROM locations WHERE id = tenant_loc.id;

      RAISE NOTICE 'Deleted tenant-specific duplicate: id=%, name="%"',
        tenant_loc.id, tenant_loc.name;
    ELSE
      -- No global entry found → convert tenant-specific entry to global
      UPDATE locations
      SET tenant_id = NULL
      WHERE id = tenant_loc.id;

      RAISE NOTICE 'No global entry found for "%", converted tenant entry to global.', tenant_loc.name;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration complete.';
END $$;
