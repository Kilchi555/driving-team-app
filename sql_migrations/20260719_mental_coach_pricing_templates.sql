-- Template pricing rules (tenant_id IS NULL) for mental_coach, using the new
-- event_type_code column added in 20260719_pricing_rules_event_type_support.sql.
-- category_code is left NULL: a coach's session/package price typically does
-- not vary per topic (stress/focus), so these rules apply tenant-wide.
--
-- Prices are sensible defaults, editable per tenant afterwards (same as
-- driving_school defaults are editable in Preisverwaltung).
--   session: CHF 120 / 60 min -> 200 Rappen/Min
--   package: CHF 450 flat, modeled as 60 "base" minutes -> 750 Rappen/Min
-- 'intake' has require_payment = false on the event_type template, so no
-- pricing rule is needed for it.

INSERT INTO pricing_rules (
  rule_name, rule_type, category_code, event_type_code, business_type,
  price_per_minute_rappen, base_duration_minutes, admin_fee_rappen,
  admin_fee_applies_from, is_active, valid_from, tenant_id
)
VALUES
  ('Sitzung', 'event_price', NULL, 'session', 'mental_coach', 200, 60, 0, 999, true, CURRENT_DATE, NULL),
  ('Paket',   'event_price', NULL, 'package', 'mental_coach', 750, 60, 0, 999, true, CURRENT_DATE, NULL)
ON CONFLICT DO NOTHING;
