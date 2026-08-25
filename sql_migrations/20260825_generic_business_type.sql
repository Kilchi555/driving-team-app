-- Selectable catch-all: business type `generic` shown as "Anderes".
-- Neutral terminology (Kunde, Termin, Mitarbeiter) already exists in
-- composables/useTerminology.ts TERMS.generic; this makes it pickable.

INSERT INTO business_types (code, name, description, is_active)
VALUES (
  'generic',
  'Anderes',
  'Andere Branche — neutrale Begriffe (Kunde, Termin, Mitarbeiter)',
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO business_type_presets (business_type_code, feature_flags, ui_labels, defaults)
SELECT
  'generic',
  '{"booking_public_enabled": true, "invoices_enabled": true, "packages_enabled": true, "product_sales_enabled": false}'::jsonb,
  '{
    "client": "Kunde",
    "clientsPlural": "Kunden",
    "clientPossessive": "Kunde",
    "staff": "Mitarbeiter",
    "staffPlural": "Mitarbeiter",
    "appointment": "Termin",
    "appointmentsPlural": "Termine",
    "bookAction": "Termin buchen",
    "categoriesLabel": "Kategorien",
    "categoryLabel": "Kategorie",
    "businessNoun": "Unternehmen",
    "progressLabel": "Verlauf",
    "label_event_type_header": "Terminart"
  }'::jsonb,
  '{
    "working_days_template": {
      "days": [1, 2, 3, 4, 5],
      "start_time": "09:00",
      "end_time": "17:00",
      "schedule": {
        "1": { "start": "09:00", "end": "17:00" },
        "2": { "start": "09:00", "end": "17:00" },
        "3": { "start": "09:00", "end": "17:00" },
        "4": { "start": "09:00", "end": "17:00" },
        "5": { "start": "09:00", "end": "17:00" }
      }
    }
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM business_type_presets WHERE business_type_code = 'generic'
);

INSERT INTO categories (code, name, description, color, is_active, business_type, tenant_id)
SELECT * FROM (VALUES
  ('allgemein', 'Allgemein', 'Allgemeine Leistungen', '#6366F1', true, 'generic', NULL::uuid)
) AS v(code, name, description, color, is_active, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.tenant_id IS NULL AND c.business_type = 'generic' AND c.code = v.code
);

INSERT INTO event_types (
  code, name, emoji, description, default_duration_minutes, default_color,
  is_active, display_order, allowed_roles, require_payment, public_bookable,
  is_default, business_type, tenant_id
)
SELECT * FROM (VALUES
  ('intake',  'Erstgespräch', '🤝', 'Kostenloses Kennenlernen & Bedarfsanalyse', 30, '#0EA5E9', true, 0, ARRAY['staff','admin']::text[], false, true,  true,  'generic', NULL::uuid),
  ('session', 'Termin',       '📅', 'Regulärer Termin',                         60, '#6366F1', true, 1, ARRAY['staff','admin']::text[], true,  true,  false, 'generic', NULL::uuid)
) AS v(code, name, emoji, description, default_duration_minutes, default_color, is_active, display_order, allowed_roles, require_payment, public_bookable, is_default, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM event_types et
  WHERE et.tenant_id IS NULL AND et.business_type = 'generic' AND et.code = v.code
);

-- Placeholder CHF 100 / 60 min → 167 Rp/min (editable after signup)
INSERT INTO pricing_rules (
  rule_name, rule_type, category_code, event_type_code, business_type,
  price_per_minute_rappen, base_duration_minutes, admin_fee_rappen,
  admin_fee_applies_from, is_active, valid_from, tenant_id
)
SELECT * FROM (VALUES
  ('Termin', 'event_price', NULL::text, 'session', 'generic', 167, 60, 0, 999, true, CURRENT_DATE, NULL::uuid)
) AS v(rule_name, rule_type, category_code, event_type_code, business_type, price_per_minute_rappen, base_duration_minutes, admin_fee_rappen, admin_fee_applies_from, is_active, valid_from, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_rules pr
  WHERE pr.tenant_id IS NULL AND pr.business_type = 'generic' AND pr.event_type_code = v.event_type_code
);
