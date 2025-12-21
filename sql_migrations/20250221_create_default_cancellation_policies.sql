-- Create default cancellation policy for all tenants
-- This ensures customers can cancel appointments properly

-- Insert default cancellation policy for each tenant that doesn't have one
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
  WHERE cp.tenant_id = t.id AND cp.is_active = true
)
ON CONFLICT DO NOTHING;

-- Insert cancellation rules for policies that don't have rules
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

-- Insert charged cancellation rule (less than 24h)
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

