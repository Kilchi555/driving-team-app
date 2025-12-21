-- Create global cancellation policies with fallback for all tenants
-- Global policies (tenant_id = NULL) are the defaults for all tenants
-- Tenants can create their own policies (tenant_id = <tenant_id>) to override

-- Step 1: Delete any remaining tenant-specific policies that are outdated
-- (Keep this simple - only delete if truly needed by tenants)

-- Step 2: Create global default cancellation policies (tenant_id = NULL)
-- These are protected from deletion and used as fallback for all tenants
INSERT INTO public.cancellation_policies (
  tenant_id,
  name,
  description,
  is_active,
  is_default,
  created_at,
  updated_at
)
VALUES (
  NULL,  -- Global policy, not tenant-specific
  'Global Standard - Kostenlose Stornierung',
  'Globale Standard-Richtlinie: Kostenlose Stornierung bis 24h vorher, danach volle Gebühr',
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Step 3: Add rules to the global policy
-- Get the global policy ID and add rules if they don't exist
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
WHERE cp.tenant_id IS NULL
AND cp.is_default = true
AND NOT EXISTS (
  SELECT 1 FROM public.cancellation_rules cr
  WHERE cr.policy_id = cp.id AND cr.charge_percentage = 0
)
ON CONFLICT DO NOTHING;

-- Add the charged rule (less than 24h before)
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
WHERE cp.tenant_id IS NULL
AND cp.is_default = true
AND NOT EXISTS (
  SELECT 1 FROM public.cancellation_rules cr
  WHERE cr.policy_id = cp.id AND cr.hours_before_appointment = 0
)
ON CONFLICT DO NOTHING;

-- Step 4: Create RLS policy to prevent deletion of global policies
-- (This should be done in a separate RLS migration)

-- Verify: Show all policies (global and tenant-specific)
SELECT 
  cp.id,
  cp.tenant_id,
  CASE 
    WHEN cp.tenant_id IS NULL THEN 'GLOBAL'
    ELSE t.name 
  END as scope,
  cp.name,
  cp.is_active,
  cp.is_default,
  COUNT(cr.id) as rule_count,
  STRING_AGG(cr.charge_percentage::text || '% (' || cr.hours_before_appointment || 'h)', ', ') as rules
FROM public.cancellation_policies cp
LEFT JOIN public.cancellation_rules cr ON cp.id = cr.policy_id
LEFT JOIN public.tenants t ON cp.tenant_id = t.id
GROUP BY cp.id, cp.tenant_id, scope, cp.name, cp.is_active, cp.is_default
ORDER BY cp.tenant_id NULLS FIRST, cp.created_at DESC;

