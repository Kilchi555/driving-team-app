-- Migration: Recalculate price_per_minute_rappen to correct decimal values
--
-- The old INTEGER column stored truncated per-minute rates, causing rounding errors.
-- Example: CHF 95.00 / 45 min → stored as 211 (truncated from 211.1111...)
--          → 45 × 211 = 9495 Rappen = CHF 94.95 (WRONG)
--
-- Fix: Round each rule's total price to the nearest CHF, then recalculate the
--      per-minute rate as a decimal so it produces the correct CHF total again.
--
-- Example: ROUND(211 × 45 / 100) × 100 / 45 = ROUND(94.95) × 100 / 45 = 9500 / 45 = 211.1111
--          → 45 × 211.1111 = 9499.9995 → rounds to 9500 → CHF 95.00 ✓
--          → 90 × 211.1111 = 18999.999 → rounds to 19000 → CHF 190.00 ✓
--
-- Only updates rules where the total is NOT already an exact multiple of 100 Rappen.

UPDATE pricing_rules
SET price_per_minute_rappen =
  (ROUND(price_per_minute_rappen * base_duration_minutes / 100.0) * 100.0)
  / base_duration_minutes
WHERE rule_type = 'base_price'
  AND (price_per_minute_rappen * base_duration_minutes) % 100 != 0;

-- Verify results
SELECT
  category_code,
  price_per_minute_rappen,
  base_duration_minutes,
  ROUND(price_per_minute_rappen * base_duration_minutes) AS total_rappen,
  ROUND(price_per_minute_rappen * base_duration_minutes / 100.0, 2) AS total_chf
FROM pricing_rules
WHERE rule_type = 'base_price'
ORDER BY category_code, base_duration_minutes;
