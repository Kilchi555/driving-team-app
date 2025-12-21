-- Clean up duplicate/incorrect global cancellation policies

-- Step 1: Identify and delete the problematic policy with extra rules
-- Keep the first one (491431bd...) with correct 2 rules
DELETE FROM public.cancellation_rules 
WHERE policy_id = '90684cf2-6279-4c0b-a9b0-e131feeb33cd';

DELETE FROM public.cancellation_policies 
WHERE id = '90684cf2-6279-4c0b-a9b0-e131feeb33cd';

-- Step 2: Ensure the remaining global policy is marked as default
UPDATE public.cancellation_policies
SET is_default = true
WHERE id = '491431bd-e51f-4e74-a206-85ddbae4e2d2'
  AND tenant_id IS NULL;

-- Step 3: Verify the result
SELECT 
  cp.id,
  cp.name,
  cp.is_default,
  cp.applies_to,
  COUNT(cr.id) as rule_count,
  STRING_AGG(
    cr.charge_percentage::text || '% (' || cr.comparison_type || ' ' || cr.hours_before_appointment || 'h)',
    ', ' ORDER BY cr.charge_percentage DESC
  ) as rules
FROM public.cancellation_policies cp
LEFT JOIN public.cancellation_rules cr ON cp.id = cr.policy_id
WHERE cp.tenant_id IS NULL 
  AND cp.applies_to = 'appointments'
GROUP BY cp.id, cp.name, cp.is_default, cp.applies_to
ORDER BY cp.created_at DESC;

