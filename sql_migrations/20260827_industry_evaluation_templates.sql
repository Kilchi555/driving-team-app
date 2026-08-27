-- Evaluation templates for every selectable vertical that had none yet.
-- tenant_id IS NULL → copied on register via applyEvaluationDefaults.
-- Also turns Termindokumentation on for existing tenants (old non-FS default was off).

-- Shared 1–4 documentation scale (same labels as consulting / generic).
WITH scale_rows(rating, label, description, color) AS (
  VALUES
    (1, 'Nicht besprochen', 'Thema kam im Termin nicht vor',              '#9CA3AF'),
    (2, 'Angeschnitten',    'Kurz erwähnt, nicht vertieft',               '#F59E0B'),
    (3, 'Vertieft',         'Ausführlich besprochen oder behandelt',      '#3B82F6'),
    (4, 'Abgeschlossen',    'Geklärt / handlungsfähig dokumentiert',      '#10B981')
),
types(business_type) AS (
  VALUES ('mental_coach'), ('dog_training'), ('fitness'), ('massage'), ('tutoring'), ('music_school')
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
  t.business_type
FROM scale_rows s
CROSS JOIN types t
WHERE NOT EXISTS (
  SELECT 1 FROM public.evaluation_scale es
  WHERE es.tenant_id IS NULL
    AND es.business_type = t.business_type
    AND es.rating = s.rating
);

-- ── Categories ──────────────────────────────────────────────────────────────
WITH cats(business_type, name, description, color, display_order) AS (
  VALUES
    -- Mental-Coaching
    ('mental_coach', 'Anliegen & Ziel',    'Thema, Zielzustand und Blockaden',                 '#0EA5E9', 1),
    ('mental_coach', 'Session',            'Was in der Sitzung gearbeitet wurde',              '#6366F1', 2),
    ('mental_coach', 'Transfer',           'Alltag, Übung und nächste Session',                '#10B981', 3),
    -- Hundeschule
    ('dog_training', 'Anliegen',           'Thema, Umfeld und Zielverhalten',                  '#0EA5E9', 1),
    ('dog_training', 'Training',           'Übung, Team Hund-Mensch, Fortschritt',             '#6366F1', 2),
    ('dog_training', 'Transfer',           'Hausaufgabe, Alltag, nächste Stunde',              '#10B981', 3),
    -- Personal Training
    ('fitness',      'Ziel & Form',        'Trainingsziel, Tagesform, Einschränkungen',        '#0EA5E9', 1),
    ('fitness',      'Training',           'Übungen, Intensität, Technik',                     '#6366F1', 2),
    ('fitness',      'Weiteres',           'Hausaufgabe, Regeneration, nächste Einheit',       '#10B981', 3),
    -- Massage / Wellness
    ('massage',      'Anamnese',           'Beschwerden, Kontraindikationen, Wunsch',          '#0EA5E9', 1),
    ('massage',      'Behandlung',         'Befund, Techniken, Reaktion',                      '#6366F1', 2),
    ('massage',      'Nachsorge',          'Empfehlungen, Pause, nächster Termin',             '#10B981', 3),
    -- Nachhilfe
    ('tutoring',     'Lernstand',          'Thema, Ziel und Lücken',                           '#0EA5E9', 1),
    ('tutoring',     'Stunde',             'Inhalt, Verständnis, Mitarbeit',                   '#6366F1', 2),
    ('tutoring',     'Weiteres',           'Hausaufgaben, nächstes Thema',                     '#10B981', 3),
    -- Musikschule
    ('music_school', 'Stück & Ziel',       'Repertoire, Technikziel, Motivation',              '#0EA5E9', 1),
    ('music_school', 'Stunde',             'Technik, Musikalität, Übung',                      '#6366F1', 2),
    ('music_school', 'Weiteres',           'Übungspensum, nächstes Stück, Auftritt',           '#10B981', 3)
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
  c.business_type,
  false
FROM cats c
WHERE NOT EXISTS (
  SELECT 1 FROM public.evaluation_categories ec
  WHERE ec.tenant_id IS NULL
    AND ec.business_type = c.business_type
    AND ec.name = c.name
);

-- ── Criteria ────────────────────────────────────────────────────────────────
WITH topics(business_type, category_name, name, description, display_order) AS (
  VALUES
    ('mental_coach', 'Anliegen & Ziel', 'Thema der Session',     'Worum geht es heute?', 1),
    ('mental_coach', 'Anliegen & Ziel', 'Zielzustand',           'Was soll sich verändern?', 2),
    ('mental_coach', 'Anliegen & Ziel', 'Blockaden',             'Was steht im Weg?', 3),
    ('mental_coach', 'Session',         'Ressourcen',            'Stärken und Anker genutzt', 1),
    ('mental_coach', 'Session',         'Intervention',          'Methode / Übung in der Session', 2),
    ('mental_coach', 'Session',         'Erkenntnisse',          'Was ist klarer geworden?', 3),
    ('mental_coach', 'Transfer',        'Alltagsübung',          'Was nimmt die Person mit?', 1),
    ('mental_coach', 'Transfer',        'Nächste Session',       'Fokus bis zum nächsten Mal', 2),
    ('mental_coach', 'Transfer',        'Offene Punkte',         'Was bleibt ungeklärt?', 3),

    ('dog_training', 'Anliegen', 'Thema',              'Was soll sich ändern?', 1),
    ('dog_training', 'Anliegen', 'Umfeld / Auslöser',  'Wann und wo zeigt sich das Verhalten?', 2),
    ('dog_training', 'Anliegen', 'Zielverhalten',      'Was ist das gewünschte Verhalten?', 3),
    ('dog_training', 'Training', 'Übung',              'Was wurde geübt?', 1),
    ('dog_training', 'Training', 'Hund-Mensch-Team',   'Zusammenarbeit und Führung', 2),
    ('dog_training', 'Training', 'Fortschritt',        'Was hat sich verbessert?', 3),
    ('dog_training', 'Transfer', 'Hausaufgabe',        'Übung für zuhause', 1),
    ('dog_training', 'Transfer', 'Alltag',             'Umsetzung ausserhalb der Stunde', 2),
    ('dog_training', 'Transfer', 'Nächste Stunde',     'Fokus beim nächsten Training', 3),

    ('fitness', 'Ziel & Form', 'Trainingsziel',      'Was ist das Ziel der Einheit?', 1),
    ('fitness', 'Ziel & Form', 'Tagesform',          'Energie, Schlaf, Belastung', 2),
    ('fitness', 'Ziel & Form', 'Einschränkungen',    'Schmerz, Verletzung, Vorsicht', 3),
    ('fitness', 'Training',    'Übungen',            'Was wurde trainiert?', 1),
    ('fitness', 'Training',    'Intensität',         'Belastung und Dosierung', 2),
    ('fitness', 'Training',    'Technik',            'Ausführung und Korrekturen', 3),
    ('fitness', 'Weiteres',    'Hausaufgabe',        'Bewegung bis zur nächsten Einheit', 1),
    ('fitness', 'Weiteres',    'Regeneration',       'Pause, Mobilisation, Schlaf', 2),
    ('fitness', 'Weiteres',    'Nächste Einheit',    'Fokus beim nächsten Training', 3),

    ('massage', 'Anamnese',   'Beschwerden',          'Wo und seit wann?', 1),
    ('massage', 'Anamnese',   'Kontraindikationen',   'Was ist heute nicht möglich?', 2),
    ('massage', 'Anamnese',   'Wunsch',               'Was soll die Behandlung bringen?', 3),
    ('massage', 'Behandlung', 'Befund',               'Tastbefund / Beobachtung', 1),
    ('massage', 'Behandlung', 'Techniken',            'Was wurde angewendet?', 2),
    ('massage', 'Behandlung', 'Reaktion',             'Wie hat der Körper reagiert?', 3),
    ('massage', 'Nachsorge',  'Empfehlungen',         'Was tun bis zum nächsten Mal?', 1),
    ('massage', 'Nachsorge',  'Schonung / Pause',     'Was vermeiden?', 2),
    ('massage', 'Nachsorge',  'Nächster Termin',      'Abstand und Fokus', 3),

    ('tutoring', 'Lernstand', 'Thema',            'Welches Fach / welche Lektion?', 1),
    ('tutoring', 'Lernstand', 'Ziel der Stunde',  'Was soll sitzen?', 2),
    ('tutoring', 'Lernstand', 'Lücken',           'Was ist noch unsicher?', 3),
    ('tutoring', 'Stunde',    'Inhalt',           'Was wurde erarbeitet?', 1),
    ('tutoring', 'Stunde',    'Verständnis',      'Hat es Klick gemacht?', 2),
    ('tutoring', 'Stunde',    'Mitarbeit',        'Konzentration und Eigenarbeit', 3),
    ('tutoring', 'Weiteres',  'Hausaufgaben',     'Was üben bis zur nächsten Stunde?', 1),
    ('tutoring', 'Weiteres',  'Nächstes Thema',   'Woran geht es weiter?', 2),
    ('tutoring', 'Weiteres',  'Eltern-Info',      'Was sollen Eltern wissen?', 3),

    ('music_school', 'Stück & Ziel', 'Repertoire',     'Welches Stück / welche Etüde?', 1),
    ('music_school', 'Stück & Ziel', 'Technikziel',    'Haltung, Ton, Rhythmus, …', 2),
    ('music_school', 'Stück & Ziel', 'Motivation',     'Wie geht es dem Schüler damit?', 3),
    ('music_school', 'Stunde',       'Technik',        'Was wurde korrigiert oder gefestigt?', 1),
    ('music_school', 'Stunde',       'Musikalität',    'Ausdruck, Tempo, Dynamik', 2),
    ('music_school', 'Stunde',       'Übung in der Stunde', 'Was hat funktioniert?', 3),
    ('music_school', 'Weiteres',     'Übungspensum',   'Was und wie oft üben?', 1),
    ('music_school', 'Weiteres',     'Nächstes Stück', 'Woran als Nächstes?', 2),
    ('music_school', 'Weiteres',     'Auftritt',       'Vorspiel, Prüfung, Konzert', 3)
),
cat_ids AS (
  SELECT id, name, business_type
  FROM public.evaluation_categories
  WHERE tenant_id IS NULL
    AND business_type IN ('mental_coach', 'dog_training', 'fitness', 'massage', 'tutoring', 'music_school')
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
JOIN cat_ids c ON c.name = t.category_name AND c.business_type = t.business_type
WHERE NOT EXISTS (
  SELECT 1 FROM public.evaluation_criteria ec
  WHERE ec.tenant_id IS NULL
    AND ec.category_id = c.id
    AND ec.name = t.name
);

-- Copy onto existing tenants that still have an empty evaluation set.
DO $$
DECLARE
  tenant_rec RECORD;
BEGIN
  FOR tenant_rec IN
    SELECT t.id
    FROM public.tenants t
    WHERE t.business_type IN (
      'mental_coach', 'dog_training', 'fitness', 'massage', 'tutoring', 'music_school',
      'consulting', 'generic'
    )
      AND NOT EXISTS (
        SELECT 1 FROM public.evaluation_categories ec
        WHERE ec.tenant_id = t.id
      )
  LOOP
    PERFORM public.copy_default_evaluation_data_to_tenant(tenant_rec.id);
  END LOOP;
END $$;

-- Default Termindokumentation on (previous non-FS signup wrote enabled=false).
UPDATE public.tenant_settings
SET
  setting_value = jsonb_set(setting_value::jsonb, '{enabled}', 'true'::jsonb)::text,
  updated_at = now()
WHERE setting_key = 'evaluations_enabled'
  AND category = 'features'
  AND COALESCE(setting_value::jsonb->>'enabled', 'false') = 'false';
