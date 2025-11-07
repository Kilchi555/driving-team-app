-- Migration: Create cancellation policy templates from existing policies
-- Diese Policies werden als Templates (tenant_id = NULL) gespeichert
-- und können später von anderen Tenants geladen werden
-- Date: 2025-11-04

-- Step 1: Kopiere "Kurs Absage-Regel" Policy als Template
-- Policy ID: 2fdba897-85cc-4efd-8c54-f68c64620bbb

WITH new_policy AS (
  INSERT INTO cancellation_policies (
    id,
    name,
    description,
    is_active,
    is_default,
    applies_to,
    created_at,
    updated_at,
    created_by,
    tenant_id
  )
  SELECT 
    gen_random_uuid(), -- Neue UUID für Template
    name,
    description,
    true, -- Templates sind immer aktiv
    false, -- Templates sind nie default
    applies_to,
    NOW(),
    NOW(),
    NULL, -- created_by = NULL für Templates
    NULL  -- tenant_id = NULL für Templates
  FROM cancellation_policies
  WHERE id = '2fdba897-85cc-4efd-8c54-f68c64620bbb'
  RETURNING id
)
INSERT INTO cancellation_rules (
  id,
  policy_id,
  hours_before_appointment,
  comparison_type,
  exclude_sundays,
  charge_percentage,
  credit_hours_to_instructor,
  description,
  created_at,
  updated_at,
  tenant_id
)
SELECT 
  gen_random_uuid(), -- Neue UUID für Rule
  new_policy.id,    -- Neue Policy-ID
  cr.hours_before_appointment,
  cr.comparison_type,
  cr.exclude_sundays,
  cr.charge_percentage,
  cr.credit_hours_to_instructor,
  cr.description,
  NOW(),
  NOW(),
  NULL  -- tenant_id = NULL für Templates
FROM cancellation_rules cr
CROSS JOIN new_policy
WHERE cr.policy_id = '2fdba897-85cc-4efd-8c54-f68c64620bbb';

-- Step 2: Kopiere "Fahrlektionen Absage-Regel" Policy als Template
-- Policy ID: ad8eaea6-9aa9-4a0a-bb5b-704c88bc6276

WITH new_policy AS (
  INSERT INTO cancellation_policies (
    id,
    name,
    description,
    is_active,
    is_default,
    applies_to,
    created_at,
    updated_at,
    created_by,
    tenant_id
  )
  SELECT 
    gen_random_uuid(), -- Neue UUID für Template
    name,
    description,
    true, -- Templates sind immer aktiv
    false, -- Templates sind nie default
    applies_to,
    NOW(),
    NOW(),
    NULL, -- created_by = NULL für Templates
    NULL  -- tenant_id = NULL für Templates
  FROM cancellation_policies
  WHERE id = 'ad8eaea6-9aa9-4a0a-bb5b-704c88bc6276'
  RETURNING id
)
INSERT INTO cancellation_rules (
  id,
  policy_id,
  hours_before_appointment,
  comparison_type,
  exclude_sundays,
  charge_percentage,
  credit_hours_to_instructor,
  description,
  created_at,
  updated_at,
  tenant_id
)
SELECT 
  gen_random_uuid(), -- Neue UUID für Rule
  new_policy.id,    -- Neue Policy-ID
  cr.hours_before_appointment,
  cr.comparison_type,
  cr.exclude_sundays,
  cr.charge_percentage,
  cr.credit_hours_to_instructor,
  cr.description,
  NOW(),
  NOW(),
  NULL  -- tenant_id = NULL für Templates
FROM cancellation_rules cr
CROSS JOIN new_policy
WHERE cr.policy_id = 'ad8eaea6-9aa9-4a0a-bb5b-704c88bc6276';
