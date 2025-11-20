-- Check categories and their prices for Driving Team tenant

-- 1. Get Driving Team tenant
SELECT id, name, slug FROM tenants WHERE slug = 'driving-team';

-- 2. Check categories with prices
SELECT 
  id,
  code,
  name,
  description,
  price_per_lesson,
  is_active,
  tenant_id
FROM categories
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'driving-team')
ORDER BY code;

-- 3. Check all pricing_rules for Driving Team
SELECT 
  id,
  rule_type,
  category_code,
  rule_name,
  price_per_minute_rappen,
  base_duration_minutes,
  admin_fee_rappen,
  is_active
FROM pricing_rules
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'driving-team')
ORDER BY rule_type, category_code;

-- 4. Show structure of a sample rule
SELECT 
  jsonb_pretty(ROW_TO_JSON(pr.*)::jsonb)
FROM pricing_rules pr
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'driving-team')
LIMIT 1;

