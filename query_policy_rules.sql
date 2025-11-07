-- Query to get policies and their rules
SELECT 
  cp.id as policy_id,
  cp.name as policy_name,
  cp.description as policy_description,
  cp.applies_to,
  cr.id as rule_id,
  cr.hours_before_appointment,
  cr.comparison_type,
  cr.exclude_sundays,
  cr.charge_percentage,
  cr.credit_hours_to_instructor,
  cr.description as rule_description
FROM cancellation_policies cp
LEFT JOIN cancellation_rules cr ON cr.policy_id = cp.id
WHERE cp.id IN (
  '2fdba897-85cc-4efd-8c54-f68c64620bbb',
  'ad8eaea6-9aa9-4a0a-bb5b-704c88bc6276'
)
ORDER BY cp.id, cr.hours_before_appointment DESC;
