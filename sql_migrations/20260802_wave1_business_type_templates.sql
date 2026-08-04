-- Wave-1 industry templates for Simy CH expansion:
-- fitness, tutoring, music_school, dog_training, massage
-- Pattern matches 20260729_add_consulting_business_type.sql

-- ============================================================================
-- 1) business_types
-- ============================================================================

INSERT INTO business_types (code, name, description, is_active)
VALUES
  ('fitness', 'Personal Training', 'Personal Training & Boutique-Fitness (1:1 und kleine Studios)', true),
  ('tutoring', 'Nachhilfe', 'Nachhilfe & Tutoren (Einzelunterricht)', true),
  ('music_school', 'Musikschule', 'Musikschule & Instrumentalunterricht', true),
  ('dog_training', 'Hundeschule', 'Hundeschule & Hundetraining (Einzel + Kurse)', true),
  ('massage', 'Massage / Wellness', 'Massage & Wellness (Selbstzahler)', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ============================================================================
-- 2) presets (flags + terminology + working hours)
-- ============================================================================

INSERT INTO business_type_presets (business_type_code, feature_flags, ui_labels, defaults)
SELECT
  'fitness',
  '{"booking_public_enabled": true, "invoices_enabled": true, "packages_enabled": true, "product_sales_enabled": false}'::jsonb,
  '{
    "client": "Kunde",
    "clientsPlural": "Kunden",
    "clientPossessive": "Kunde",
    "staff": "Trainer",
    "staffPlural": "Trainer",
    "appointment": "Training",
    "appointmentsPlural": "Trainings",
    "bookAction": "Training buchen",
    "categoriesLabel": "Trainingsbereiche",
    "categoryLabel": "Trainingsbereich",
    "businessNoun": "Personal-Training-Studio",
    "label_event_type_header": "Trainingsart"
  }'::jsonb,
  '{
    "working_days_template": {
      "days": [1, 2, 3, 4, 5, 6],
      "start_time": "06:30",
      "end_time": "21:00",
      "schedule": {
        "1": { "start": "06:30", "end": "21:00" },
        "2": { "start": "06:30", "end": "21:00" },
        "3": { "start": "06:30", "end": "21:00" },
        "4": { "start": "06:30", "end": "21:00" },
        "5": { "start": "06:30", "end": "21:00" },
        "6": { "start": "08:00", "end": "14:00" }
      }
    }
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM business_type_presets WHERE business_type_code = 'fitness'
);

INSERT INTO business_type_presets (business_type_code, feature_flags, ui_labels, defaults)
SELECT
  'tutoring',
  '{"booking_public_enabled": true, "invoices_enabled": true, "packages_enabled": true, "product_sales_enabled": false}'::jsonb,
  '{
    "client": "Schüler",
    "clientsPlural": "Schüler",
    "clientPossessive": "Schüler",
    "staff": "Tutor",
    "staffPlural": "Tutoren",
    "appointment": "Nachhilfe",
    "appointmentsPlural": "Nachhilfestunden",
    "bookAction": "Nachhilfe buchen",
    "categoriesLabel": "Fächer",
    "categoryLabel": "Fach",
    "businessNoun": "Nachhilfeschule",
    "label_event_type_header": "Lektionsart"
  }'::jsonb,
  '{
    "working_days_template": {
      "days": [1, 2, 3, 4, 5, 6],
      "start_time": "14:00",
      "end_time": "20:00",
      "schedule": {
        "1": { "start": "14:00", "end": "20:00" },
        "2": { "start": "14:00", "end": "20:00" },
        "3": { "start": "14:00", "end": "20:00" },
        "4": { "start": "14:00", "end": "20:00" },
        "5": { "start": "14:00", "end": "20:00" },
        "6": { "start": "09:00", "end": "13:00" }
      }
    }
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM business_type_presets WHERE business_type_code = 'tutoring'
);

INSERT INTO business_type_presets (business_type_code, feature_flags, ui_labels, defaults)
SELECT
  'music_school',
  '{"booking_public_enabled": true, "invoices_enabled": true, "packages_enabled": true, "product_sales_enabled": false}'::jsonb,
  '{
    "client": "Schüler",
    "clientsPlural": "Schüler",
    "clientPossessive": "Schüler",
    "staff": "Lehrperson",
    "staffPlural": "Lehrpersonen",
    "appointment": "Musikstunde",
    "appointmentsPlural": "Musikstunden",
    "bookAction": "Musikstunde buchen",
    "categoriesLabel": "Instrumente",
    "categoryLabel": "Instrument",
    "businessNoun": "Musikschule",
    "label_event_type_header": "Unterrichtsart"
  }'::jsonb,
  '{
    "working_days_template": {
      "days": [1, 2, 3, 4, 5, 6],
      "start_time": "13:00",
      "end_time": "20:00",
      "schedule": {
        "1": { "start": "13:00", "end": "20:00" },
        "2": { "start": "13:00", "end": "20:00" },
        "3": { "start": "13:00", "end": "20:00" },
        "4": { "start": "13:00", "end": "20:00" },
        "5": { "start": "13:00", "end": "20:00" },
        "6": { "start": "09:00", "end": "14:00" }
      }
    }
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM business_type_presets WHERE business_type_code = 'music_school'
);

INSERT INTO business_type_presets (business_type_code, feature_flags, ui_labels, defaults)
SELECT
  'dog_training',
  '{"booking_public_enabled": true, "invoices_enabled": true, "packages_enabled": true, "product_sales_enabled": false}'::jsonb,
  '{
    "client": "Hundehalter",
    "clientsPlural": "Hundehalter",
    "clientPossessive": "Hundehalter",
    "staff": "Hundetrainer",
    "staffPlural": "Hundetrainer",
    "appointment": "Training",
    "appointmentsPlural": "Trainings",
    "bookAction": "Training buchen",
    "categoriesLabel": "Trainingsbereiche",
    "categoryLabel": "Trainingsbereich",
    "businessNoun": "Hundeschule",
    "label_event_type_header": "Trainingsart"
  }'::jsonb,
  '{
    "working_days_template": {
      "days": [1, 2, 3, 4, 5, 6],
      "start_time": "08:00",
      "end_time": "18:00",
      "schedule": {
        "1": { "start": "08:00", "end": "18:00" },
        "2": { "start": "08:00", "end": "18:00" },
        "3": { "start": "08:00", "end": "18:00" },
        "4": { "start": "08:00", "end": "18:00" },
        "5": { "start": "08:00", "end": "18:00" },
        "6": { "start": "08:00", "end": "16:00" }
      }
    }
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM business_type_presets WHERE business_type_code = 'dog_training'
);

INSERT INTO business_type_presets (business_type_code, feature_flags, ui_labels, defaults)
SELECT
  'massage',
  '{"booking_public_enabled": true, "invoices_enabled": true, "packages_enabled": true, "product_sales_enabled": false}'::jsonb,
  '{
    "client": "Kunde",
    "clientsPlural": "Kunden",
    "clientPossessive": "Kunde",
    "staff": "Therapeut",
    "staffPlural": "Therapeuten",
    "appointment": "Behandlung",
    "appointmentsPlural": "Behandlungen",
    "bookAction": "Behandlung buchen",
    "categoriesLabel": "Behandlungsarten",
    "categoryLabel": "Behandlungsart",
    "businessNoun": "Praxis",
    "label_event_type_header": "Behandlungsart"
  }'::jsonb,
  '{
    "working_days_template": {
      "days": [1, 2, 3, 4, 5, 6],
      "start_time": "08:00",
      "end_time": "19:00",
      "schedule": {
        "1": { "start": "08:00", "end": "19:00" },
        "2": { "start": "08:00", "end": "19:00" },
        "3": { "start": "08:00", "end": "19:00" },
        "4": { "start": "08:00", "end": "19:00" },
        "5": { "start": "08:00", "end": "19:00" },
        "6": { "start": "09:00", "end": "14:00" }
      }
    }
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM business_type_presets WHERE business_type_code = 'massage'
);

-- ============================================================================
-- 3) categories (tenant_id IS NULL templates)
-- ============================================================================

INSERT INTO categories (code, name, description, color, is_active, business_type, tenant_id)
SELECT * FROM (VALUES
  ('strength',  'Kraft',      'Krafttraining & Muskelaufbau',           '#EF4444', true, 'fitness', NULL::uuid),
  ('endurance', 'Ausdauer',   'Cardio & Ausdauer',                      '#0EA5E9', true, 'fitness', NULL::uuid),
  ('mobility',  'Mobility',   'Mobilität, Mobility, Rehabilitation',    '#10B981', true, 'fitness', NULL::uuid),
  ('weightloss','Abnehmen',   'Gewichtsmanagement & Body Composition',  '#F59E0B', true, 'fitness', NULL::uuid)
) AS v(code, name, description, color, is_active, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.tenant_id IS NULL AND c.business_type = 'fitness' AND c.code = v.code
);

INSERT INTO categories (code, name, description, color, is_active, business_type, tenant_id)
SELECT * FROM (VALUES
  ('math',    'Mathematik',   'Mathematik & Physik Grundlagen', '#6366F1', true, 'tutoring', NULL::uuid),
  ('german',  'Deutsch',      'Deutsch Sprache & Literatur',    '#EF4444', true, 'tutoring', NULL::uuid),
  ('english', 'Englisch',     'Englisch',                       '#0EA5E9', true, 'tutoring', NULL::uuid),
  ('french',  'Französisch',  'Französisch',                    '#10B981', true, 'tutoring', NULL::uuid)
) AS v(code, name, description, color, is_active, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.tenant_id IS NULL AND c.business_type = 'tutoring' AND c.code = v.code
);

INSERT INTO categories (code, name, description, color, is_active, business_type, tenant_id)
SELECT * FROM (VALUES
  ('piano',   'Klavier',    'Klavier & Keyboard',     '#6366F1', true, 'music_school', NULL::uuid),
  ('guitar',  'Gitarre',    'Gitarre & Bass',         '#EF4444', true, 'music_school', NULL::uuid),
  ('voice',   'Gesang',     'Gesangsunterricht',      '#EC4899', true, 'music_school', NULL::uuid),
  ('drums',   'Schlagzeug', 'Schlagzeug & Percussion','#F59E0B', true, 'music_school', NULL::uuid)
) AS v(code, name, description, color, is_active, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.tenant_id IS NULL AND c.business_type = 'music_school' AND c.code = v.code
);

INSERT INTO categories (code, name, description, color, is_active, business_type, tenant_id)
SELECT * FROM (VALUES
  ('puppy',      'Welpen',         'Welpenkurs & Sozialisierung',     '#F59E0B', true, 'dog_training', NULL::uuid),
  ('obedience',  'Grundgehorsam',  'Grundgehorsam & Alltag',          '#0EA5E9', true, 'dog_training', NULL::uuid),
  ('everyday',   'Alltag',         'Leinenführigkeit, Rückruf, Stadt','#10B981', true, 'dog_training', NULL::uuid),
  ('sport',      'Hundesport',     'Sport & Beschäftigung',           '#EF4444', true, 'dog_training', NULL::uuid)
) AS v(code, name, description, color, is_active, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.tenant_id IS NULL AND c.business_type = 'dog_training' AND c.code = v.code
);

INSERT INTO categories (code, name, description, color, is_active, business_type, tenant_id)
SELECT * FROM (VALUES
  ('classic',   'Klassisch',  'Klassische Massage',           '#0EA5E9', true, 'massage', NULL::uuid),
  ('sport',     'Sport',      'Sportmassage & Recovery',      '#EF4444', true, 'massage', NULL::uuid),
  ('shiatsu',   'Shiatsu',    'Shiatsu & energetische Arbeit','#8B5CF6', true, 'massage', NULL::uuid),
  ('hot_stone', 'Hot Stone',  'Hot-Stone-Behandlung',         '#F59E0B', true, 'massage', NULL::uuid)
) AS v(code, name, description, color, is_active, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.tenant_id IS NULL AND c.business_type = 'massage' AND c.code = v.code
);

-- ============================================================================
-- 4) event_types
-- ============================================================================

INSERT INTO event_types (
  code, name, emoji, description, default_duration_minutes, default_color,
  is_active, display_order, allowed_roles, require_payment, public_bookable,
  is_default, business_type, tenant_id
)
SELECT * FROM (VALUES
  ('trial',   'Probe-Training', '🤝', 'Kostenloses Kennenlernen & Bedarfsanalyse', 30, '#0EA5E9', true, 0, ARRAY['staff','admin']::text[], false, true,  true,  'fitness', NULL::uuid),
  ('session', 'Training',       '💪', 'Personal-Training-Einheit',                 60, '#EF4444', true, 1, ARRAY['staff','admin']::text[], true,  true,  false, 'fitness', NULL::uuid)
) AS v(code, name, emoji, description, default_duration_minutes, default_color, is_active, display_order, allowed_roles, require_payment, public_bookable, is_default, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM event_types et
  WHERE et.tenant_id IS NULL AND et.business_type = 'fitness' AND et.code = v.code
);

INSERT INTO event_types (
  code, name, emoji, description, default_duration_minutes, default_color,
  is_active, display_order, allowed_roles, require_payment, public_bookable,
  is_default, business_type, tenant_id
)
SELECT * FROM (VALUES
  ('trial',  'Probestunde', '🤝', 'Kostenlose Probestunde', 45, '#0EA5E9', true, 0, ARRAY['staff','admin']::text[], false, true,  true,  'tutoring', NULL::uuid),
  ('lesson', 'Nachhilfe',   '📚', 'Reguläre Nachhilfestunde', 45, '#6366F1', true, 1, ARRAY['staff','admin']::text[], true,  true,  false, 'tutoring', NULL::uuid)
) AS v(code, name, emoji, description, default_duration_minutes, default_color, is_active, display_order, allowed_roles, require_payment, public_bookable, is_default, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM event_types et
  WHERE et.tenant_id IS NULL AND et.business_type = 'tutoring' AND et.code = v.code
);

INSERT INTO event_types (
  code, name, emoji, description, default_duration_minutes, default_color,
  is_active, display_order, allowed_roles, require_payment, public_bookable,
  is_default, business_type, tenant_id
)
SELECT * FROM (VALUES
  ('trial',  'Probestunde',  '🤝', 'Kostenlose Probestunde', 30, '#0EA5E9', true, 0, ARRAY['staff','admin']::text[], false, true,  true,  'music_school', NULL::uuid),
  ('lesson', 'Musikstunde',  '🎹', 'Regulärer Instrumentalunterricht', 45, '#8B5CF6', true, 1, ARRAY['staff','admin']::text[], true,  true,  false, 'music_school', NULL::uuid)
) AS v(code, name, emoji, description, default_duration_minutes, default_color, is_active, display_order, allowed_roles, require_payment, public_bookable, is_default, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM event_types et
  WHERE et.tenant_id IS NULL AND et.business_type = 'music_school' AND et.code = v.code
);

INSERT INTO event_types (
  code, name, emoji, description, default_duration_minutes, default_color,
  is_active, display_order, allowed_roles, require_payment, public_bookable,
  is_default, business_type, tenant_id
)
SELECT * FROM (VALUES
  ('intake',  'Erstberatung',   '🤝', 'Kostenlose Erstberatung Hundehalter', 30, '#0EA5E9', true, 0, ARRAY['staff','admin']::text[], false, true,  true,  'dog_training', NULL::uuid),
  ('session', 'Einzeltraining', '🐕', 'Einzeltraining Hund & Halter',        60, '#F59E0B', true, 1, ARRAY['staff','admin']::text[], true,  true,  false, 'dog_training', NULL::uuid)
) AS v(code, name, emoji, description, default_duration_minutes, default_color, is_active, display_order, allowed_roles, require_payment, public_bookable, is_default, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM event_types et
  WHERE et.tenant_id IS NULL AND et.business_type = 'dog_training' AND et.code = v.code
);

INSERT INTO event_types (
  code, name, emoji, description, default_duration_minutes, default_color,
  is_active, display_order, allowed_roles, require_payment, public_bookable,
  is_default, business_type, tenant_id
)
SELECT * FROM (VALUES
  ('intake',  'Ersttermin',  '🤝', 'Kostenloses Kennenlernen & Anamnese', 20, '#0EA5E9', true, 0, ARRAY['staff','admin']::text[], false, true,  true,  'massage', NULL::uuid),
  ('session', 'Behandlung',  '🌿', 'Reguläre Massagebehandlung',          60, '#10B981', true, 1, ARRAY['staff','admin']::text[], true,  true,  false, 'massage', NULL::uuid)
) AS v(code, name, emoji, description, default_duration_minutes, default_color, is_active, display_order, allowed_roles, require_payment, public_bookable, is_default, business_type, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM event_types et
  WHERE et.tenant_id IS NULL AND et.business_type = 'massage' AND et.code = v.code
);

-- ============================================================================
-- 5) pricing_rules (per event_type, CHF defaults)
-- fitness: CHF 120 / 60' → 200 Rp/min
-- tutoring: CHF 60 / 45' → 133 Rp/min
-- music: CHF 70 / 45' → 156 Rp/min
-- dog: CHF 90 / 60' → 150 Rp/min
-- massage: CHF 130 / 60' → 217 Rp/min
-- ============================================================================

INSERT INTO pricing_rules (
  rule_name, rule_type, category_code, event_type_code, business_type,
  price_per_minute_rappen, base_duration_minutes, admin_fee_rappen,
  admin_fee_applies_from, is_active, valid_from, tenant_id
)
SELECT * FROM (VALUES
  ('Training',        'event_price', NULL::text, 'session', 'fitness',      200, 60, 0, 999, true, CURRENT_DATE, NULL::uuid),
  ('Nachhilfe',       'event_price', NULL::text, 'lesson',  'tutoring',     133, 45, 0, 999, true, CURRENT_DATE, NULL::uuid),
  ('Musikstunde',     'event_price', NULL::text, 'lesson',  'music_school', 156, 45, 0, 999, true, CURRENT_DATE, NULL::uuid),
  ('Einzeltraining',  'event_price', NULL::text, 'session', 'dog_training', 150, 60, 0, 999, true, CURRENT_DATE, NULL::uuid),
  ('Behandlung',      'event_price', NULL::text, 'session', 'massage',      217, 60, 0, 999, true, CURRENT_DATE, NULL::uuid)
) AS v(rule_name, rule_type, category_code, event_type_code, business_type, price_per_minute_rappen, base_duration_minutes, admin_fee_rappen, admin_fee_applies_from, is_active, valid_from, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_rules pr
  WHERE pr.tenant_id IS NULL
    AND pr.business_type = v.business_type
    AND pr.event_type_code = v.event_type_code
);
