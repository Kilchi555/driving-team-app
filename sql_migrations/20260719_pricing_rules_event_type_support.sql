-- Additive extension of pricing_rules to support business types whose pricing
-- is keyed by event_type (e.g. mental_coach 'session'/'package') instead of
-- driving_school's category + fixed rule_type enum (base_price/theory/
-- consultation/admin_fee).
--
-- IMPORTANT: This is purely additive. No existing row is touched, no existing
-- rule_type value is removed or reinterpreted. All current driving_school
-- lookups (category_code + rule_type IN ('base_price','theory','consultation',
-- 'admin_fee')) keep working exactly as before.
--
-- New concepts:
--   - event_type_code: when set, this rule applies to a specific event_type
--     (e.g. 'session', 'package') rather than being resolved purely via the
--     legacy rule_type enum. Paired with rule_type = 'event_price'.
--   - business_type: only meaningful on template rows (tenant_id IS NULL).
--     Lets us filter template pricing_rules by business type when seeding a
--     new tenant, mirroring the existing `business_type` column already
--     present on `categories` and `event_types`.
--   - category_code stays NULLABLE-compatible with "applies to all
--     categories" semantics for event_price rules (a coach's session price
--     usually doesn't vary per topic/category).

ALTER TABLE pricing_rules
  ADD COLUMN IF NOT EXISTS event_type_code text,
  ADD COLUMN IF NOT EXISTS business_type text;

COMMENT ON COLUMN pricing_rules.event_type_code IS
  'Optional event_type code this rule prices (e.g. session, package). Used with rule_type = ''event_price'' for business types not shaped like driving_school. NULL for legacy category+rule_type rows.';

COMMENT ON COLUMN pricing_rules.business_type IS
  'Business type this template row belongs to. Only set on tenant_id IS NULL template rows, used when seeding a new tenant with defaults for its business type.';

CREATE INDEX IF NOT EXISTS idx_pricing_rules_event_type_code
  ON pricing_rules (tenant_id, event_type_code)
  WHERE event_type_code IS NOT NULL;

-- Tag existing driving_school templates so business-type-filtered template
-- copies work consistently for every business type going forward.
UPDATE pricing_rules
SET business_type = 'driving_school'
WHERE tenant_id IS NULL AND business_type IS NULL;
