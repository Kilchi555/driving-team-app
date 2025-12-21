-- Fix global cancellation policies - ensure they have rules

-- First, delete the problematic tenant-specific 'Standard Stornierungsrichtlinie' if it has no rules
DELETE FROM public.cancellation_policies cp
WHERE cp.tenant_id IS NOT NULL
  AND cp.name = 'Standard Stornierungsrichtlinie'
  AND NOT EXISTS (SELECT 1 FROM public.cancellation_rules WHERE policy_id = cp.id);

-- Step 1: Ensure global policy exists
INSERT INTO public.cancellation_policies (
  tenant_id,
  name,
  description,
  is_active,
  is_default,
  applies_to,
  created_at,
  updated_at
)
VALUES (
  NULL,
  'Global Standard - Kostenlose Stornierung',
  'Globale Standard-Richtlinie: Kostenlose Stornierung bis 24h vorher, danach volle Gebühr',
  true,
  true,
  'appointments',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Step 2: Get the global policy ID and ensure it has the 0% rule (24h+ before)
INSERT INTO public.cancellation_rules (
  policy_id,
  hours_before_appointment,
  charge_percentage,
  comparison_type,
  created_at
)
SELECT 
  cp.id,
  24,
  0,
  'more_than',
  NOW()
FROM public.cancellation_policies cp
WHERE cp.tenant_id IS NULL
  AND cp.name = 'Global Standard - Kostenlose Stornierung'
  AND NOT EXISTS (
    SELECT 1 FROM public.cancellation_rules cr
    WHERE cr.policy_id = cp.id AND cr.hours_before_appointment = 24
  )
ON CONFLICT DO NOTHING;

-- Step 3: Add the 100% rule (less than 24h before)
INSERT INTO public.cancellation_rules (
  policy_id,
  hours_before_appointment,
  charge_percentage,
  comparison_type,
  created_at
)
SELECT 
  cp.id,
  24,
  100,
  'less_than',
  NOW()
FROM public.cancellation_policies cp
WHERE cp.tenant_id IS NULL
  AND cp.name = 'Global Standard - Kostenlose Stornierung'
  AND NOT EXISTS (
    SELECT 1 FROM public.cancellation_rules cr
    WHERE cr.policy_id = cp.id 
      AND cr.charge_percentage = 100
      AND cr.comparison_type = 'less_than'
  )
ON CONFLICT DO NOTHING;

-- Verify the results
SELECT 
  'Global Policy Rules' as info,
  cp.id,
  cp.name,
  COUNT(cr.id) as rule_count,
  STRING_AGG(
    cr.charge_percentage::text || '% (' || cr.comparison_type || ' ' || cr.hours_before_appointment || 'h)',
    ', '
  ) as rules
FROM public.cancellation_policies cp
LEFT JOIN public.cancellation_rules cr ON cp.id = cr.policy_id
WHERE cp.tenant_id IS NULL AND cp.applies_to = 'appointments'
GROUP BY cp.id, cp.name;

