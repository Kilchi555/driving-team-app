-- Debug: Check what pricing rules exist for driving-team tenant

-- 1. Get Driving Team tenant ID
SELECT id, name, slug FROM tenants WHERE slug = 'driving-team';

-- 2. Check all pricing rules for Driving Team
SELECT 
  id,
  rule_type,
  category_code,
  rule_name,
  price_per_minute_rappen,
  base_duration_minutes,
  is_active,
  tenant_id
FROM pricing_rules 
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'driving-team')
ORDER BY rule_type, category_code;

-- 3. Check what rule_types exist
SELECT DISTINCT rule_type FROM pricing_rules;

-- 4. Check if there are ANY 'driving' rules
SELECT COUNT(*) as driving_rules_count FROM pricing_rules WHERE rule_type = 'driving';

-- 5. Check global/standard pricing rules (tenant_id = NULL)
SELECT 
  rule_type,
  COUNT(*) as count,
  STRING_AGG(DISTINCT category_code, ', ') as categories
FROM pricing_rules 
WHERE tenant_id IS NULL
GROUP BY rule_type;

