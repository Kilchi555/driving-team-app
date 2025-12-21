-- Restore cancellation policies for all tenants
-- This migration ensures every tenant has at least a default cancellation policy
-- It won't override existing policies (only inserts where not exists)

-- Step 1: Create default cancellation policy for each tenant that doesn't have one
INSERT INTO public.cancellation_policies (
  tenant_id,
  name,
  description,
  is_active,
  is_default,
  created_at,
  updated_at
)
SELECT 
  t.id,
  'Standard Stornierungsrichtlinie',
  'Kostenlose Stornierung bis 24h vorher, danach volle Gebühr',
  true,
  true,
  NOW(),
  NOW()
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.cancellation_policies cp
  WHERE cp.tenant_id = t.id
)
ON CONFLICT DO NOTHING;

-- Step 2: Ensure each policy has at least the free cancellation rule (24h before)
INSERT INTO public.cancellation_rules (
  policy_id,
  hours_before_appointment,
  charge_percentage,
  refund_percentage,
  created_at
)
SELECT 
  cp.id,
  24,
  0,
  100,
  NOW()
FROM public.cancellation_policies cp
WHERE NOT EXISTS (
  SELECT 1 FROM public.cancellation_rules cr
  WHERE cr.policy_id = cp.id AND cr.charge_percentage = 0
)
ON CONFLICT DO NOTHING;

-- Step 3: Ensure each policy has the charged cancellation rule (less than 24h)
INSERT INTO public.cancellation_rules (
  policy_id,
  hours_before_appointment,
  charge_percentage,
  refund_percentage,
  created_at
)
SELECT 
  cp.id,
  0,
  100,
  0,
  NOW()
FROM public.cancellation_policies cp
WHERE NOT EXISTS (
  SELECT 1 FROM public.cancellation_rules cr
  WHERE cr.policy_id = cp.id AND cr.hours_before_appointment = 0
)
ON CONFLICT DO NOTHING;

-- Verify: Show all policies and their rules
SELECT 
  cp.id,
  cp.tenant_id,
  cp.name,
  cp.is_active,
  cp.is_default,
  COUNT(cr.id) as rule_count
FROM public.cancellation_policies cp
LEFT JOIN public.cancellation_rules cr ON cp.id = cr.policy_id
GROUP BY cp.id, cp.tenant_id, cp.name, cp.is_active, cp.is_default
ORDER BY cp.created_at DESC;

