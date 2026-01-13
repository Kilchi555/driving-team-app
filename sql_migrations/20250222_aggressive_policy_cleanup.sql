-- AGGRESSIVE cleanup: Delete ALL appointment policies and start fresh

-- Step 1: Delete ALL rules for appointment policies
DELETE FROM public.cancellation_rules 
WHERE policy_id IN (
  SELECT id FROM public.cancellation_policies 
  WHERE applies_to = 'appointments'
);

-- Step 2: Delete ALL appointment policies (both global and tenant-specific)
DELETE FROM public.cancellation_policies 
WHERE applies_to = 'appointments';

-- Step 3: Create a single, correct global policy for appointments
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
  'Global Standard Policy',
  'Global default cancellation policy: Free cancellation up to 24h before, full charge within 24h',
  true,
  true,
  'appointments',
  NOW(),
  NOW()
);

-- Step 4: Add the first rule: 0% charge if >= 24h before (more_than)
INSERT INTO public.cancellation_rules (
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
  AND cp.is_default = true;

-- Step 5: Add the second rule: 100% charge if < 24h before (less_than)
INSERT INTO public.cancellation_rules (
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
  AND cp.is_default = true;

-- Step 6: Verify the final result
SELECT 
  'Final Result' as status,
  COUNT(DISTINCT cp.id) as policy_count,
  COUNT(DISTINCT cr.id) as rule_count,
  cp.name as policy_name,
  cp.is_default
FROM public.cancellation_policies cp
LEFT JOIN public.cancellation_rules cr ON cp.id = cr.policy_id
WHERE cp.applies_to = 'appointments'
GROUP BY cp.id, cp.name, cp.is_default;

-- Step 7: Show the actual rules
SELECT 
  'Rules for Global Policy' as info,
  cr.hours_before_appointment,
  cr.charge_percentage,
  cr.comparison_type
FROM public.cancellation_rules cr
JOIN public.cancellation_policies cp ON cr.policy_id = cp.id
WHERE cp.tenant_id IS NULL 
  AND cp.applies_to = 'appointments'
ORDER BY cr.charge_percentage DESC, cr.hours_before_appointment DESC;

