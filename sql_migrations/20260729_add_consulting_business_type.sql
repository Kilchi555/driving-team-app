-- Adds business type `consulting` (e.g. IT consulting) with presets, template
-- categories/event types and default pricing. Template rows use tenant_id IS NULL.

INSERT INTO business_types (code, name, description, is_active)
VALUES ('consulting', 'Consulting', 'Beratung & Consulting (z.B. IT, Strategie, Projekte)', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO business_type_presets (business_type_code, feature_flags, ui_labels, defaults)
SELECT
  'consulting',
  '{"booking_public_enabled": true, "invoices_enabled": true, "packages_enabled": true, "product_sales_enabled": false}'::jsonb,
  '{"term_lesson":"Beratung","term_exam":"Assessment","term_category":"Leistungsbereich","label_event_type_header":"Terminart"}'::jsonb,
  '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM business_type_presets WHERE business_type_code = 'consulting'
);

-- Service areas / topics (optional grouping for appointments)
INSERT INTO categories (code, name, description, color, is_active, business_type, tenant_id)
SELECT * FROM (VALUES
  ('cloud',    'Cloud & Infrastruktur', 'Cloud-Migration, Hosting, Skalierung', '#0EA5E9', true, 'consulting', NULL::uuid),
  ('security', 'IT-Security',           'Security Review, Compliance, Hardening', '#EF4444', true, 'consulting', NULL::uuid),
  ('devops',   'DevOps & Automation',   'CI/CD, IaC, Monitoring, Tooling',      '#8B5CF6', true, 'consulting', NULL::uuid),
  ('strategy', 'IT-Strategie',          'Roadmap, Architektur, Digitalisierung', '#10B981', true, 'consulting', NULL::uuid)
) AS v(code, name, description, color, is_active, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.tenant_id IS NULL AND c.business_type = 'consulting' AND c.code = v.code
);

INSERT INTO event_types (
  code, name, emoji, description, default_duration_minutes, default_color,
  is_active, display_order, allowed_roles, require_payment, public_bookable,
  is_default, business_type, tenant_id
)
SELECT * FROM (VALUES
  ('discovery',  'Erstgespräch', '🤝', 'Kostenloses Kennenlernen & Bedarfsanalyse', 30, '#0EA5E9', true, 0, ARRAY['staff','admin']::text[], false, true,  true,  'consulting', NULL::uuid),
  ('consulting', 'Beratung',     '💼', 'Reguläre Beratungssitzung',                 60, '#6366F1', true, 1, ARRAY['staff','admin']::text[], true,  true,  false, 'consulting', NULL::uuid)
) AS v(code, name, emoji, description, default_duration_minutes, default_color, is_active, display_order, allowed_roles, require_payment, public_bookable, is_default, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM event_types et
  WHERE et.tenant_id IS NULL AND et.business_type = 'consulting' AND et.code = v.code
);

-- Default prices (editable per tenant after signup)
INSERT INTO pricing_rules (
  rule_name, rule_type, category_code, event_type_code, business_type,
  price_per_minute_rappen, base_duration_minutes, admin_fee_rappen,
  admin_fee_applies_from, is_active, valid_from, tenant_id
)
SELECT * FROM (VALUES
  ('Beratung',  'event_price', NULL::text, 'consulting', 'consulting', 300, 60,  0, 999, true, CURRENT_DATE, NULL::uuid)
) AS v(rule_name, rule_type, category_code, event_type_code, business_type, price_per_minute_rappen, base_duration_minutes, admin_fee_rappen, admin_fee_applies_from, is_active, valid_from, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_rules pr
  WHERE pr.tenant_id IS NULL AND pr.business_type = 'consulting' AND pr.event_type_code = v.event_type_code
);
