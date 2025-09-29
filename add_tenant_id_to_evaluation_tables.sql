-- Add tenant_id to evaluation tables for tenant-specific customization
-- This allows each tenant to have their own evaluation criteria while providing defaults

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

-- 5) Update existing records to have NULL tenant_id (global defaults)
-- These will serve as default templates for new tenants
UPDATE evaluation_categories SET tenant_id = NULL WHERE tenant_id IS NULL;
UPDATE evaluation_criteria SET tenant_id = NULL WHERE tenant_id IS NULL;
UPDATE evaluation_scale SET tenant_id = NULL WHERE tenant_id IS NULL;

-- 6) Create function to copy default evaluation data to new tenant
CREATE OR REPLACE FUNCTION copy_default_evaluation_data_to_tenant(target_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
  category_record RECORD;
  criteria_record RECORD;
  scale_record RECORD;
  new_category_id UUID;
  new_criteria_id UUID;
  new_scale_id UUID;
BEGIN
  -- Copy evaluation_categories (global defaults)
  FOR category_record IN 
    SELECT * FROM evaluation_categories WHERE tenant_id IS NULL
  LOOP
    INSERT INTO evaluation_categories (
      name, description, color, display_order, driving_categories, is_active, tenant_id
    ) VALUES (
      category_record.name,
      category_record.description,
      category_record.color,
      category_record.display_order,
      category_record.driving_categories,
      category_record.is_active,
      target_tenant_id
    ) RETURNING id INTO new_category_id;
    
    -- Copy evaluation_criteria for this category
    FOR criteria_record IN 
      SELECT * FROM evaluation_criteria 
      WHERE category_id = category_record.id AND tenant_id IS NULL
    LOOP
      INSERT INTO evaluation_criteria (
        category_id, name, description, display_order, is_required, is_active, tenant_id
      ) VALUES (
        new_category_id,
        criteria_record.name,
        criteria_record.description,
        criteria_record.display_order,
        criteria_record.is_required,
        criteria_record.is_active,
        target_tenant_id
      );
    END LOOP;
  END LOOP;
  
  -- Copy evaluation_scale (global defaults)
  FOR scale_record IN 
    SELECT * FROM evaluation_scale WHERE tenant_id IS NULL
  LOOP
    INSERT INTO evaluation_scale (
      rating, label, description, color, is_active, tenant_id
    ) VALUES (
      scale_record.rating,
      scale_record.label,
      scale_record.description,
      scale_record.color,
      scale_record.is_active,
      target_tenant_id
    );
  END LOOP;
  
  RAISE NOTICE 'Default evaluation data copied to tenant: %', target_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- 7) Create function to get evaluation data for tenant (with fallback to defaults)
CREATE OR REPLACE FUNCTION get_evaluation_data_for_tenant(tenant_uuid UUID)
RETURNS TABLE (
  table_name TEXT,
  data JSONB
) AS $$
BEGIN
  -- Get tenant-specific categories, fallback to global defaults
  RETURN QUERY
  SELECT 
    'categories'::TEXT as table_name,
    COALESCE(
      (SELECT jsonb_agg(row_to_json(cat)) FROM evaluation_categories WHERE tenant_id = tenant_uuid),
      (SELECT jsonb_agg(row_to_json(cat)) FROM evaluation_categories WHERE tenant_id IS NULL)
    ) as data;
    
  -- Get tenant-specific criteria, fallback to global defaults  
  RETURN QUERY
  SELECT 
    'criteria'::TEXT as table_name,
    COALESCE(
      (SELECT jsonb_agg(row_to_json(crit)) FROM evaluation_criteria WHERE tenant_id = tenant_uuid),
      (SELECT jsonb_agg(row_to_json(crit)) FROM evaluation_criteria WHERE tenant_id IS NULL)
    ) as data;
    
  -- Get tenant-specific scale, fallback to global defaults
  RETURN QUERY
  SELECT 
    'scale'::TEXT as table_name,
    COALESCE(
      (SELECT jsonb_agg(row_to_json(scale)) FROM evaluation_scale WHERE tenant_id = tenant_uuid),
      (SELECT jsonb_agg(row_to_json(scale)) FROM evaluation_scale WHERE tenant_id IS NULL)
    ) as data;
END;
$$ LANGUAGE plpgsql;

-- 8) Update RLS policies to allow access based on tenant
-- Drop existing policies
DO $$ 
DECLARE
  rec RECORD;
BEGIN
  -- Drop policies for evaluation_categories
  FOR rec IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'evaluation_categories'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || rec.policyname || ' ON evaluation_categories';
  END LOOP;
  
  -- Drop policies for evaluation_criteria
  FOR rec IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'evaluation_criteria'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || rec.policyname || ' ON evaluation_criteria';
  END LOOP;
  
  -- Drop policies for evaluation_scale
  FOR rec IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'evaluation_scale'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || rec.policyname || ' ON evaluation_scale';
  END LOOP;
END $$;

-- Create new tenant-aware policies
CREATE POLICY evaluation_categories_tenant_access ON evaluation_categories
  FOR ALL
  TO authenticated
  USING (
    tenant_id IS NULL OR 
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY evaluation_criteria_tenant_access ON evaluation_criteria
  FOR ALL
  TO authenticated
  USING (
    tenant_id IS NULL OR 
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY evaluation_scale_tenant_access ON evaluation_scale
  FOR ALL
  TO authenticated
  USING (
    tenant_id IS NULL OR 
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- 9) Test the setup
SELECT 'Setup completed successfully' as status;
