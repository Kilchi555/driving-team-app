-- seed.sql
-- Seed file für Supabase Preview Branch Testing
-- Diese Datei wird automatisch beim Branch-Erstellen ausgeführt
-- und füllt die Preview DB mit Testdaten

-- ============ TEST USER ERSTELLEN ============

-- 1. Auth User in auth.users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'test-v2-pricing@example.com',
  crypt('test123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 2. Public User Record (brauchen wir für Tenants)
-- Zuerst: Hole eine existierende Tenant ID
WITH tenant_id AS (
  SELECT id FROM tenants LIMIT 1
)
INSERT INTO public.users (
  auth_user_id,
  id,
  email,
  first_name,
  last_name,
  role,
  tenant_id,
  is_active,
  created_at,
  updated_at
) 
SELECT
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
  'test-v2-pricing@example.com',
  'Test',
  'V2Pricing',
  'client',
  tenant_id.id,
  true,
  now(),
  now()
FROM tenant_id
ON CONFLICT (id) DO NOTHING;

-- ============ STUDENT CREDIT ERSTELLEN ============

-- Credit Guthaben für Test User
WITH user_id AS (
  SELECT id, tenant_id FROM public.users WHERE email = 'test-v2-pricing@example.com'
)
INSERT INTO public.student_credits (
  id,
  user_id,
  tenant_id,
  balance_rappen,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  user_id.id,
  user_id.tenant_id,
  10000, -- 100 CHF für Testing
  now(),
  now()
FROM user_id
ON CONFLICT (user_id) DO NOTHING;

-- ============ TEST VOUCHER ERSTELLEN ============

-- Voucher für Discounts-Testing
WITH tenant_id AS (
  SELECT id FROM tenants LIMIT 1
)
INSERT INTO public.voucher_codes (
  id,
  tenant_id,
  code,
  type,
  discount_type,
  discount_value,
  max_discount_rappen,
  is_active,
  valid_from,
  valid_until,
  created_at
)
SELECT
  gen_random_uuid(),
  tenant_id.id,
  'TESTSUMMER2026',
  'discount',
  'percentage',
  10, -- 10% Rabatt
  5000, -- Max 50 CHF
  true,
  now(),
  (now() + interval '30 days'),
  now()
FROM tenant_id
ON CONFLICT (code) DO NOTHING;

-- ============ INFO ============

-- Test User Credentials:
-- Email: test-v2-pricing@example.com
-- Password: test123
-- Guthaben: 100 CHF (10000 Rappen)
--
-- Voucher zum Testen:
-- Code: TESTSUMMER2026
-- Type: 10% Rabatt (max 50 CHF)
--
-- Diese Testdaten werden gelöscht wenn der Branch gelöscht wird!

