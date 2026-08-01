-- Consulting evaluation templates (session documentation topics + 1–4 scale).
-- tenant_id IS NULL → copied on register via applyEvaluationDefaults / RPC.

ALTER TABLE public.evaluation_scale
  ADD COLUMN IF NOT EXISTS business_type text;

UPDATE public.evaluation_scale
SET business_type = 'driving_school'
WHERE tenant_id IS NULL
  AND (business_type IS NULL OR btrim(business_type) = '');

-- ── Categories ──────────────────────────────────────────────────────────────
WITH cats(name, description, color, display_order) AS (
  VALUES
    ('Bedarf & Ziel',           'Zielklärung und Scope der Beratung',              '#0EA5E9', 1),
    ('Analyse & Empfehlung',    'Erkenntnisse und erarbeitete Empfehlungen',       '#6366F1', 2),
    ('Umsetzung & Next Steps',  'Massnahmen, Verantwortlichkeiten, Follow-ups',    '#10B981', 3),
    ('Zusammenarbeit',          'Sessionqualität und Zusammenarbeit mit dem Kunden','#F59E0B', 4)
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
  'consulting',
  false
FROM cats c
WHERE NOT EXISTS (
  SELECT 1 FROM public.evaluation_categories ec
  WHERE ec.tenant_id IS NULL
    AND ec.business_type = 'consulting'
    AND ec.name = c.name
);

-- ── Criteria ────────────────────────────────────────────────────────────────
WITH topics(category_name, name, description, display_order) AS (
  VALUES
    -- Bedarf & Ziel
    ('Bedarf & Ziel', 'Zielklärung', 'Was will der Kunde erreichen?', 1),
    ('Bedarf & Ziel', 'Scope / Abgrenzung', 'Was gehört dazu – und was nicht?', 2),
    ('Bedarf & Ziel', 'Stakeholder & Entscheider', 'Wer ist involviert und entscheidungsfähig?', 3),
    ('Bedarf & Ziel', 'Prioritäten', 'Was ist jetzt am wichtigsten?', 4),
    -- Analyse & Empfehlung
    ('Analyse & Empfehlung', 'Ist-Zustand', 'Ausgangslage und Kontext erfasst', 1),
    ('Analyse & Empfehlung', 'Risiken / Blocker', 'Hindernisse und Risiken benannt', 2),
    ('Analyse & Empfehlung', 'Optionen bewertet', 'Alternativen verglichen', 3),
    ('Analyse & Empfehlung', 'Empfehlung festgehalten', 'Klare Empfehlung dokumentiert', 4),
    -- Umsetzung & Next Steps
    ('Umsetzung & Next Steps', 'Konkrete Massnahmen', 'Handlungsfähige nächste Schritte', 1),
    ('Umsetzung & Next Steps', 'Verantwortlichkeiten', 'Wer macht was?', 2),
    ('Umsetzung & Next Steps', 'Termine / Meilensteine', 'Zeitliche Einordnung', 3),
    ('Umsetzung & Next Steps', 'Offene Fragen', 'Was bleibt ungeklärt?', 4),
    -- Zusammenarbeit
    ('Zusammenarbeit', 'Klarheit der Kommunikation', 'Waren Ziele und Inhalte klar?', 1),
    ('Zusammenarbeit', 'Engagement des Kunden', 'Mitarbeit und Input in der Session', 2),
    ('Zusammenarbeit', 'Entscheidungsfähigkeit', 'Konnten Entscheide getroffen werden?', 3),
    ('Zusammenarbeit', 'Follow-up nötig', 'Braucht es eine weitere Session / Nacharbeit?', 4)
),
cat_ids AS (
  SELECT id, name
  FROM public.evaluation_categories
  WHERE tenant_id IS NULL AND business_type = 'consulting'
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

-- ── Scale (1–4 documentation depth) ─────────────────────────────────────────
WITH scale_rows(rating, label, description, color) AS (
  VALUES
    (1, 'Nicht besprochen',   'Thema kam in der Session nicht vor',           '#9CA3AF'),
    (2, 'Angeschnitten',      'Kurz erwähnt, nicht vertieft',                 '#F59E0B'),
    (3, 'Vertieft',           'Ausführlich besprochen',                       '#3B82F6'),
    (4, 'Abgeschlossen',      'Geklärt / handlungsfähig dokumentiert',        '#10B981')
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
  'consulting'
FROM scale_rows s
WHERE NOT EXISTS (
  SELECT 1 FROM public.evaluation_scale es
  WHERE es.tenant_id IS NULL
    AND es.business_type = 'consulting'
    AND es.rating = s.rating
);

-- Keep RPC scale copy business-type aware (same rules as categories)
CREATE OR REPLACE FUNCTION copy_default_evaluation_data_to_tenant(target_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
  category_record RECORD;
  criteria_record RECORD;
  scale_record RECORD;
  new_category_id UUID;
  tenant_bt text;
  copied_cats int := 0;
BEGIN
  SELECT COALESCE(NULLIF(btrim(business_type), ''), 'driving_school')
    INTO tenant_bt
  FROM public.tenants
  WHERE id = target_tenant_id;

  IF tenant_bt IS NULL THEN
    RAISE EXCEPTION 'Tenant % not found', target_tenant_id;
  END IF;

  FOR category_record IN
    SELECT * FROM public.evaluation_categories
    WHERE tenant_id IS NULL
      AND (
        (tenant_bt = 'driving_school' AND (business_type = 'driving_school' OR business_type IS NULL))
        OR (tenant_bt <> 'driving_school' AND business_type = tenant_bt)
      )
  LOOP
    INSERT INTO public.evaluation_categories (
      name, description, color, display_order, is_active, tenant_id, business_type, is_theory
    ) VALUES (
      category_record.name,
      category_record.description,
      category_record.color,
      category_record.display_order,
      category_record.is_active,
      target_tenant_id,
      COALESCE(category_record.business_type, tenant_bt),
      COALESCE(category_record.is_theory, false)
    ) RETURNING id INTO new_category_id;

    copied_cats := copied_cats + 1;

    FOR criteria_record IN
      SELECT * FROM public.evaluation_criteria
      WHERE category_id = category_record.id
        AND tenant_id IS NULL
    LOOP
      INSERT INTO public.evaluation_criteria (
        category_id, name, description, display_order, is_active, tenant_id, driving_categories
      ) VALUES (
        new_category_id,
        criteria_record.name,
        criteria_record.description,
        criteria_record.display_order,
        criteria_record.is_active,
        target_tenant_id,
        criteria_record.driving_categories
      );
    END LOOP;
  END LOOP;

  IF copied_cats > 0 THEN
    FOR scale_record IN
      SELECT * FROM public.evaluation_scale
      WHERE tenant_id IS NULL
        AND (
          (tenant_bt = 'driving_school' AND (business_type = 'driving_school' OR business_type IS NULL))
          OR (tenant_bt <> 'driving_school' AND business_type = tenant_bt)
        )
    LOOP
      INSERT INTO public.evaluation_scale (
        rating, label, description, color, is_active, tenant_id, business_type
      ) VALUES (
        scale_record.rating,
        scale_record.label,
        scale_record.description,
        scale_record.color,
        scale_record.is_active,
        target_tenant_id,
        COALESCE(scale_record.business_type, tenant_bt)
      );
    END LOOP;
  END IF;

  RAISE NOTICE 'Evaluation templates copied to tenant % (business_type=%, categories=%)',
    target_tenant_id, tenant_bt, copied_cats;
END;
$$ LANGUAGE plpgsql;
