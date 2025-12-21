-- Comprehensive cleanup and fix for global cancellation policies

-- Step 1: Delete ALL global policies and their rules (fresh start)
DELETE FROM public.cancellation_rules 
WHERE policy_id IN (
  SELECT id FROM public.cancellation_policies 
  WHERE tenant_id IS NULL AND applies_to = 'appointments'
);

DELETE FROM public.cancellation_policies 
WHERE tenant_id IS NULL AND applies_to = 'appointments';

-- Step 2: Create a single, correct global policy
INSERT INTO public.cancellation_policies (
  id,
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
  gen_random_uuid(),
  NULL,
  'Global Standard Policy',
  'Global default cancellation policy: Free cancellation up to 24h before, full charge within 24h',
  true,
  true,
  'appointments',
  NOW(),
  NOW()
);

-- Step 3: Add rules to the global policy
-- Get the policy ID we just created and add the correct rules
INSERT INTO public.cancellation_rules (
  id,
  policy_id,
  hours_before_appointment,
  charge_percentage,
  comparison_type,
  credit_hours_to_instructor,
  tenant_id,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  cp.id,
  24,
  0,
  'more_than',
  false,
  NULL,
  NOW(),
  NOW()
FROM public.cancellation_policies cp
WHERE cp.tenant_id IS NULL 
  AND cp.applies_to = 'appointments'
  AND cp.is_default = true
LIMIT 1;

-- Step 4: Add the 100% charge rule for cancellations within 24h
INSERT INTO public.cancellation_rules (
  id,
  policy_id,
  hours_before_appointment,
  charge_percentage,
  comparison_type,
  credit_hours_to_instructor,
  tenant_id,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  cp.id,
  24,
  100,
  'less_than',
  false,
  NULL,
  NOW(),
  NOW()
FROM public.cancellation_policies cp
WHERE cp.tenant_id IS NULL 
  AND cp.applies_to = 'appointments'
  AND cp.is_default = true
LIMIT 1;

-- Step 5: Verify the result
SELECT 
  'Result' as status,
  cp.id,
  cp.name,
  cp.is_default,
  COUNT(cr.id) as rule_count,
  STRING_AGG(
    cr.charge_percentage::text || '% (if ' || 
    CASE 
      WHEN cr.comparison_type = 'more_than' THEN '>=' 
      ELSE '<='
    END || ' ' || cr.hours_before_appointment || 'h)',
    ', ' ORDER BY cr.charge_percentage DESC
  ) as rules
FROM public.cancellation_policies cp
LEFT JOIN public.cancellation_rules cr ON cp.id = cr.policy_id
WHERE cp.tenant_id IS NULL 
  AND cp.applies_to = 'appointments'
GROUP BY cp.id, cp.name, cp.is_default
ORDER BY cp.created_at DESC;

-- Step 6: Show all policies and rule counts
SELECT 
  'All Policies Summary' as info,
  COUNT(DISTINCT cp.id) as total_policies,
  COUNT(DISTINCT cr.id) as total_rules
FROM public.cancellation_policies cp
LEFT JOIN public.cancellation_rules cr ON cp.id = cr.policy_id
WHERE cp.applies_to = 'appointments';

