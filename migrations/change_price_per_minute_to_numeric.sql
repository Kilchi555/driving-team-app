-- Migration: Change price_per_minute_rappen from INTEGER to NUMERIC(10,4)
--
-- Reason: INTEGER cannot represent fractional Rappen/minute values.
-- Example: CHF 95.00 / 45 min = 211.1111... Rappen/min.
-- Stored as 211 (integer) → 45 × 211 = 9495 → CHF 94.95 (wrong).
-- Stored as 211.1111 (numeric) → 45 × 211.1111 = 9499.9995 → rounds to 9500 → CHF 95.00 ✓

ALTER TABLE pricing_rules
  ALTER COLUMN price_per_minute_rappen TYPE NUMERIC(10,4)
    USING price_per_minute_rappen::NUMERIC(10,4);

COMMENT ON COLUMN pricing_rules.price_per_minute_rappen IS
  'Price per minute in Rappen as a decimal. Example: CHF 95 / 45 min = 211.1111 Rappen/min.
   Final price = ROUND(price_per_minute_rappen * duration_minutes / 5) * 5 (5-Rappen rounding).';
