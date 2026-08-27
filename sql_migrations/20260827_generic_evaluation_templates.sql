-- Generic ("Anderes") session documentation templates.
-- Neutral topics for any service business (treatment, coaching, tutoring, …).
-- tenant_id IS NULL → copied on register via applyEvaluationDefaults.

-- ── Categories ──────────────────────────────────────────────────────────────
WITH cats(name, description, color, display_order) AS (
  VALUES
    ('Anliegen',          'Womit die Person kommt und was sie erreichen will',     '#0EA5E9', 1),
    ('Sitzung',           'Was in diesem Termin passiert ist',                     '#6366F1', 2),
    ('Nächste Schritte',  'Empfehlungen, Selbstarbeit und Follow-up',              '#10B981', 3)
)
INSERT INTO public.evaluation_categories (
  id, name, description, color, display_order, is_active, tenant_id, business_type, is_theory
)
SELECT
  gen_random_uuid(),
  c.name,
  c.description,
  c.color,
  c.display_order,
  true,
  NULL,
  'generic',
  false
FROM cats c
WHERE NOT EXISTS (
  SELECT 1 FROM public.evaluation_categories ec
  WHERE ec.tenant_id IS NULL
    AND ec.business_type = 'generic'
    AND ec.name = c.name
);

-- ── Criteria ────────────────────────────────────────────────────────────────
WITH topics(category_name, name, description, display_order) AS (
  VALUES
    ('Anliegen', 'Hauptanliegen',        'Womit kommt die Person?', 1),
    ('Anliegen', 'Ziel der Sitzung',     'Was soll heute erreicht werden?', 2),
    ('Anliegen', 'Erwartungen',          'Was erwartet die Person von der Zusammenarbeit?', 3),

    ('Sitzung', 'Befinden zu Beginn',    'Zustand / Stimmung zu Beginn', 1),
    ('Sitzung', 'Inhalt / Vorgehen',     'Was wurde gemacht oder besprochen?', 2),
    ('Sitzung', 'Reaktion / Verlauf',    'Wie hat die Person reagiert?', 3),
    ('Sitzung', 'Befinden am Ende',      'Zustand / Stimmung zum Abschluss', 4),

    ('Nächste Schritte', 'Empfehlungen',       'Was empfehlen wir weiter?', 1),
    ('Nächste Schritte', 'Selbstarbeit',       'Was macht die Person bis zum nächsten Termin?', 2),
    ('Nächste Schritte', 'Nächster Schritt',   'Follow-up, nächster Termin oder Abschluss', 3),
    ('Nächste Schritte', 'Offene Punkte',      'Was bleibt ungeklärt?', 4)
),
cat_ids AS (
  SELECT id, name
  FROM public.evaluation_categories
  WHERE tenant_id IS NULL AND business_type = 'generic'
)
INSERT INTO public.evaluation_criteria (
  id, category_id, name, description, display_order, is_active, tenant_id, driving_categories
)
SELECT
  gen_random_uuid(),
  c.id,
  t.name,
  t.description,
  t.display_order,
  true,
  NULL,
  NULL
FROM topics t
JOIN cat_ids c ON c.name = t.category_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.evaluation_criteria ec
  WHERE ec.tenant_id IS NULL
    AND ec.category_id = c.id
    AND ec.name = t.name
);

-- ── Scale (1–4 documentation depth, same idea as consulting) ────────────────
WITH scale_rows(rating, label, description, color) AS (
  VALUES
    (1, 'Nicht besprochen', 'Thema kam im Termin nicht vor',              '#9CA3AF'),
    (2, 'Angeschnitten',    'Kurz erwähnt, nicht vertieft',               '#F59E0B'),
    (3, 'Vertieft',         'Ausführlich besprochen oder behandelt',      '#3B82F6'),
    (4, 'Abgeschlossen',    'Geklärt / handlungsfähig dokumentiert',      '#10B981')
)
INSERT INTO public.evaluation_scale (
  id, rating, label, description, color, is_active, tenant_id, business_type
)
SELECT
  gen_random_uuid(),
  s.rating,
  s.label,
  s.description,
  s.color,
  true,
  NULL,
  'generic'
FROM scale_rows s
WHERE NOT EXISTS (
  SELECT 1 FROM public.evaluation_scale es
  WHERE es.tenant_id IS NULL
    AND es.business_type = 'generic'
    AND es.rating = s.rating
);

-- Existing generic tenants that never received a copy (signup was a no-op).
DO $$
DECLARE
  tenant_rec RECORD;
BEGIN
  FOR tenant_rec IN
    SELECT t.id
    FROM public.tenants t
    WHERE t.business_type = 'generic'
      AND NOT EXISTS (
        SELECT 1 FROM public.evaluation_categories ec
        WHERE ec.tenant_id = t.id
      )
  LOOP
    PERFORM public.copy_default_evaluation_data_to_tenant(tenant_rec.id);
  END LOOP;
END $$;
