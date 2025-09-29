-- Simple step-by-step addition of tenant_id to evaluation tables
-- This ensures the columns are added correctly

-- 1) Add tenant_id to evaluation_categories
ALTER TABLE evaluation_categories 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 2) Add tenant_id to evaluation_criteria  
ALTER TABLE evaluation_criteria 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 3) Add tenant_id to evaluation_scale
ALTER TABLE evaluation_scale 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 4) Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_tenant_id ON evaluation_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_tenant_id ON evaluation_criteria(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scale_tenant_id ON evaluation_scale(tenant_id);

-- 5) Verify the columns were added
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('evaluation_categories', 'evaluation_criteria', 'evaluation_scale')
AND column_name = 'tenant_id'
ORDER BY table_name;

-- 6) Show current data
SELECT 'evaluation_categories' as table_name, COUNT(*) as total_records, COUNT(tenant_id) as records_with_tenant_id FROM evaluation_categories
UNION ALL
SELECT 'evaluation_criteria' as table_name, COUNT(*) as total_records, COUNT(tenant_id) as records_with_tenant_id FROM evaluation_criteria
UNION ALL
SELECT 'evaluation_scale' as table_name, COUNT(*) as total_records, COUNT(tenant_id) as records_with_tenant_id FROM evaluation_scale;