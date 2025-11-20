-- Create "driving" (Fahrlektion) Pricing Rules for all tenants
-- These pricing rules are used when booking driving lessons (Fahrlektionen)

-- For each active tenant, create driving pricing rules based on their category prices
DO $$
DECLARE
    tenant_record RECORD;
    cat_record RECORD;
BEGIN
    -- For each active tenant
    FOR tenant_record IN 
        SELECT id, name, slug FROM tenants WHERE is_active = true
    LOOP
        RAISE NOTICE 'Creating driving pricing rules for tenant: % (ID: %)', tenant_record.name, tenant_record.id;
        
        -- Delete existing "driving" rules for this tenant to avoid duplicates
        DELETE FROM pricing_rules 
        WHERE tenant_id = tenant_record.id
          AND rule_type = 'driving';
        
        -- Create driving rules for each category, using category prices
        FOR cat_record IN 
            SELECT code, name, description, price_per_lesson
            FROM categories
            WHERE tenant_id = tenant_record.id
              AND is_active = true
        LOOP
            -- Calculate price_per_minute_rappen from price_per_lesson (assuming ~60min lessons)
            -- If price_per_lesson is 95 CHF for 60 minutes: 95 * 100 / 60 = 158 Rappen/min
            INSERT INTO pricing_rules (
              id,
              tenant_id,
              rule_type,
              category_code,
              rule_name,
              price_per_minute_rappen,
              admin_fee_rappen,
              admin_fee_applies_from,
              base_duration_minutes,
              is_active,
              valid_from,
              valid_until,
              created_at,
              updated_at
            ) VALUES (
              gen_random_uuid(),
              tenant_record.id,
              'driving',
              cat_record.code,
              'Fahrlektion ' || cat_record.name,
              CAST((cat_record.price_per_lesson * 100 / 60) AS INTEGER), -- Convert CHF to Rappen/minute
              0,
              999,
              60, -- Standard 60-minute lesson
              true,
              NOW(),
              NULL,
              NOW(),
              NOW()
            );
        END LOOP;
    END LOOP;
END $$;

-- Verify the creation
SELECT 
  COALESCE(t.name, 'Standard') as tenant_name,
  pr.category_code,
  pr.rule_name,
  ROUND((pr.price_per_minute_rappen * pr.base_duration_minutes / 100.0)::numeric, 2) as total_price_chf,
  pr.base_duration_minutes as duration_minutes,
  pr.is_active
FROM pricing_rules pr
LEFT JOIN tenants t ON pr.tenant_id = t.id
WHERE pr.rule_type = 'driving'
ORDER BY COALESCE(t.name, 'Standard'), pr.category_code;

