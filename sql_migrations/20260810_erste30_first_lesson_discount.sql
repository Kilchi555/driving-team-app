-- First-lesson promo for Auto Zürich ads (Driving Team)
-- Online: ?code=ERSTE30  | Staff: preset "Erste Fahrstunde –CHF 30"
-- Restricted to Kat. B Automatik + B Schaltung only

INSERT INTO public.discounts (
  tenant_id,
  name,
  code,
  discount_type,
  discount_value,
  applies_to,
  category_filter,
  first_lesson_only,
  auto_apply,
  max_per_user,
  is_active,
  min_amount_rappen
)
SELECT
  '64259d68-195a-4c68-8875-f1b44d962830'::uuid,
  'Erste Fahrstunde –CHF 30',
  'ERSTE30',
  'fixed',
  30.00,
  'appointments',
  'B Automatik,B Schaltung',
  true,
  false,
  1,
  true,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM public.discounts
  WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
    AND code = 'ERSTE30'
    AND deleted_at IS NULL
);

UPDATE public.discounts
SET category_filter = 'B Automatik,B Schaltung',
    updated_at = NOW()
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'
  AND code = 'ERSTE30'
  AND deleted_at IS NULL;
