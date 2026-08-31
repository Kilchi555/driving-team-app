-- Seed driving-school educational text templates (no images).
-- Source: Fahrschule Driving Team learning content, text + section categories only.
--
-- 1) Fill matching global templates (tenant_id IS NULL) so new driving_school
--    registrations copy the texts via applyEvaluationDefaults.
-- 2) Fill existing driving_school tenant criteria that have no content yet.
-- 3) Insert the few Driving-Team-only topics (Lenktechnik, Spurhaltung, …)
--    onto global templates and existing driving_school tenants.
-- Driving Team's own rows (with images) are left untouched.

WITH src AS (
  SELECT
    dtc.name AS category_name,
    dt.name AS criterion_name,
    dt.description,
    dt.display_order,
    dt.driving_categories,
    dt.always_visible,
    dt.is_active,
    jsonb_build_object(
      '_default',
      jsonb_strip_nulls(jsonb_build_object(
        'title', NULLIF(
          COALESCE(dt.educational_content->'_default'->>'title', dt.educational_content->>'title'),
          ''
        ),
        'sections', COALESCE((
          SELECT jsonb_agg(
            jsonb_strip_nulls(jsonb_build_object(
              'title', NULLIF(s->>'title', ''),
              'text', NULLIF(s->>'text', ''),
              'categories', CASE
                WHEN jsonb_typeof(s->'categories') = 'array' THEN s->'categories'
                ELSE NULL
              END
            ))
          )
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(dt.educational_content->'_default'->'sections') = 'array'
                THEN dt.educational_content->'_default'->'sections'
              WHEN jsonb_typeof(dt.educational_content->'sections') = 'array'
                THEN dt.educational_content->'sections'
              ELSE '[]'::jsonb
            END
          ) s
          WHERE COALESCE(s->>'text', '') <> ''
             OR COALESCE(s->>'title', '') <> ''
        ), '[]'::jsonb)
      ))
    ) AS text_content
  FROM public.evaluation_criteria dt
  JOIN public.evaluation_categories dtc ON dtc.id = dt.category_id
  JOIN public.tenants src_t ON src_t.id = dt.tenant_id AND src_t.slug = 'driving-team'
  WHERE dt.educational_content IS NOT NULL
),
updated AS (
  UPDATE public.evaluation_criteria ec
  SET
    educational_content = src.text_content,
    updated_at = now()
  FROM public.evaluation_categories cat
  JOIN src ON src.category_name = cat.name
  WHERE ec.category_id = cat.id
    AND ec.name = src.criterion_name
    AND ec.educational_content IS NULL
    AND (
      (ec.tenant_id IS NULL AND (cat.business_type = 'driving_school' OR cat.business_type IS NULL))
      OR EXISTS (
        SELECT 1
        FROM public.tenants t
        WHERE t.id = ec.tenant_id
          AND t.business_type = 'driving_school'
      )
    )
  RETURNING ec.id
),
inserted AS (
  INSERT INTO public.evaluation_criteria (
    category_id,
    name,
    description,
    display_order,
    is_active,
    driving_categories,
    tenant_id,
    educational_content,
    always_visible
  )
  SELECT
    cat.id,
    src.criterion_name,
    src.description,
    src.display_order,
    src.is_active,
    src.driving_categories,
    cat.tenant_id,
    src.text_content,
    src.always_visible
  FROM src
  JOIN public.evaluation_categories cat ON cat.name = src.category_name
  WHERE (
    (cat.tenant_id IS NULL AND (cat.business_type = 'driving_school' OR cat.business_type IS NULL))
    OR EXISTS (
      SELECT 1
      FROM public.tenants t
      WHERE t.id = cat.tenant_id
        AND t.business_type = 'driving_school'
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.evaluation_criteria existing
    WHERE existing.category_id = cat.id
      AND existing.name = src.criterion_name
  )
  RETURNING id
)
SELECT
  (SELECT count(*) FROM updated) AS updated_rows,
  (SELECT count(*) FROM inserted) AS inserted_rows;
