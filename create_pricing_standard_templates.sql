-- Create Standard Pricing Templates
-- Kopiert alle pricing_rules von einem bestehenden Tenant als Standard-Templates (tenant_id = NULL)

-- 1. Lösche zuerst alle bestehenden Standard-Templates (tenant_id = NULL)
DELETE FROM public.pricing_rules WHERE tenant_id IS NULL;

-- 2. Kopiere alle pricing_rules von einem bestehenden Tenant als Standard-Templates
-- Ersetze '78af580f-1670-4be3-a556-250339c872fa' mit der gewünschten Tenant-ID
INSERT INTO public.pricing_rules (
  rule_name,
  rule_type,
  category_code,
  applies_to,
  price_per_minute_rappen,
  base_duration_minutes,
  admin_fee_rappen,
  admin_fee_applies_from,
  duration_multiplier,
  weekend_multiplier,
  evening_multiplier,
  valid_from,
  valid_until,
  is_active,
  conditions,
  priority,
  tenant_id  -- Set to NULL for standard templates
)
SELECT 
  rule_name,
  rule_type,
  category_code,
  applies_to,
  price_per_minute_rappen,
  base_duration_minutes,
  admin_fee_rappen,
  admin_fee_applies_from,
  duration_multiplier,
  weekend_multiplier,
  evening_multiplier,
  valid_from,
  valid_until,
  is_active,
  conditions,
  priority,
  NULL as tenant_id  -- Standard templates have no tenant_id
FROM public.pricing_rules 
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'  -- Quelle-Tenant ID hier anpassen
  AND is_active = true;

-- 3. Zeige Ergebnis
SELECT 
  COUNT(*) as total_standard_templates,
  COUNT(DISTINCT category_code) as unique_categories,
  STRING_AGG(DISTINCT rule_type, ', ') as rule_types
FROM public.pricing_rules 
WHERE tenant_id IS NULL;

-- 4. Zeige alle erstellten Standard-Templates
SELECT 
  category_code,
  rule_name,
  rule_type,
  price_per_minute_rappen,
  admin_fee_rappen,
  base_duration_minutes
FROM public.pricing_rules 
WHERE tenant_id IS NULL
ORDER BY category_code, rule_type;
