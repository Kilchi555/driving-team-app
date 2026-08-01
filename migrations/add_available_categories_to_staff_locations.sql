-- Per-staff categories at each location
ALTER TABLE staff_locations
ADD COLUMN IF NOT EXISTS available_categories text[] DEFAULT NULL;

COMMENT ON COLUMN staff_locations.available_categories IS
  'Categories this staff offers at this location. NULL = fall back to intersection(users.category, locations.available_categories)';

-- Backfill: intersection of staff.category and location.available_categories.
-- If location has no categories set, use staff.category as-is.
UPDATE staff_locations sl
SET available_categories = sub.cats
FROM (
  SELECT
    sl2.id,
    CASE
      WHEN l.available_categories IS NULL OR cardinality(l.available_categories) = 0
      THEN COALESCE(u.category::text[], ARRAY[]::text[])
      ELSE COALESCE((
        SELECT array_agg(DISTINCT cat)
        FROM unnest(COALESCE(u.category::text[], ARRAY[]::text[])) AS cat
        WHERE cat = ANY (l.available_categories)
      ), ARRAY[]::text[])
    END AS cats
  FROM staff_locations sl2
  JOIN users u ON u.id = sl2.staff_id
  JOIN locations l ON l.id = sl2.location_id
  WHERE sl2.available_categories IS NULL
) sub
WHERE sl.id = sub.id;

CREATE INDEX IF NOT EXISTS idx_staff_locations_available_categories
ON staff_locations USING gin (available_categories);
