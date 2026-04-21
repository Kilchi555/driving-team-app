-- Add business_type to template rows in categories and event_types
-- This enables industry-specific template filtering during tenant registration
-- Templates = rows with tenant_id IS NULL

-- 1. Add business_type column to categories (if not exists)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT NULL;

-- 2. Add business_type column to event_types (if not exists)
ALTER TABLE event_types ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT NULL;

-- 3. Tag all existing template categories as driving_school
UPDATE categories
SET business_type = 'driving_school'
WHERE tenant_id IS NULL
  AND business_type IS NULL;

-- 4. Tag all existing template event_types as driving_school
UPDATE event_types
SET business_type = 'driving_school'
WHERE tenant_id IS NULL
  AND business_type IS NULL;

-- 5. Create indexes for fast template lookups
CREATE INDEX IF NOT EXISTS idx_categories_template_business_type
  ON categories(business_type) WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_event_types_template_business_type
  ON event_types(business_type) WHERE tenant_id IS NULL;

-- Verify
SELECT 'categories' AS tbl, business_type, COUNT(*) FROM categories WHERE tenant_id IS NULL GROUP BY business_type
UNION ALL
SELECT 'event_types' AS tbl, business_type, COUNT(*) FROM event_types WHERE tenant_id IS NULL GROUP BY business_type;
