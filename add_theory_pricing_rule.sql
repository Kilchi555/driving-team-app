-- Neue Pricing-Regel für Theorielektionen
-- Theorielektionen kosten immer 85.- CHF, unabhängig von der Fahrkategorie

INSERT INTO pricing_rules (
  id,
  rule_type,
  category_code,
  rule_name,
  price_per_minute_rappen,
  admin_fee_rappen,
  admin_fee_applies_from,
  base_duration_minutes,
  is_active,
  valid_from,
  valid_until,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'theory',
  'THEORY',
  'Theorielektion - Standardpreis',
  8500,  -- 85.00 CHF in Rappen
  0,     -- Keine Admin-Fee für Theorielektionen
  999,   -- Admin-Fee gilt nie (999 = nie)
  45,    -- Standard-Dauer 45 Minuten
  true,  -- Regel ist aktiv
  NOW(), -- Gültig ab heute
  NULL,  -- Kein Ablaufdatum
  NOW(),
  NOW()
);

-- Bestätigung der Einfügung
SELECT 
  '✅ Theorielektion Pricing-Regel hinzugefügt:' as status,
  rule_type,
  category_code,
  rule_name,
  (price_per_minute_rappen / 100.0) as price_per_minute_chf,
  (price_per_minute_rappen * base_duration_minutes / 100.0) as total_price_chf,
  is_active
FROM pricing_rules 
WHERE rule_type = 'theory' 
ORDER BY created_at DESC 
LIMIT 1;
