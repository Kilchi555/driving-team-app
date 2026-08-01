-- Tag legacy global evaluation templates as driving_school, and make RPCs
-- respect the tenant's business_type so consulting/coaching signups never
-- receive Fahrschul-Curriculum (Vorschulung, Blicktechnik, …).

ALTER TABLE public.evaluation_categories
  ADD COLUMN IF NOT EXISTS business_type text;

UPDATE public.evaluation_categories
SET business_type = 'driving_school'
WHERE tenant_id IS NULL
  AND (business_type IS NULL OR btrim(business_type) = '');

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
      SELECT * FROM public.evaluation_scale WHERE tenant_id IS NULL
    LOOP
      INSERT INTO public.evaluation_scale (
        rating, label, description, color, is_active, tenant_id
      ) VALUES (
        scale_record.rating,
        scale_record.label,
        scale_record.description,
        scale_record.color,
        scale_record.is_active,
        target_tenant_id
      );
    END LOOP;
  END IF;

  RAISE NOTICE 'Evaluation templates copied to tenant % (business_type=%, categories=%)',
    target_tenant_id, tenant_bt, copied_cats;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_evaluation_data_for_tenant(tenant_uuid UUID)
RETURNS TABLE (
  table_name TEXT,
  data JSONB
) AS $$
DECLARE
  tenant_bt text;
BEGIN
  SELECT COALESCE(NULLIF(btrim(business_type), ''), 'driving_school')
    INTO tenant_bt
  FROM public.tenants
  WHERE id = tenant_uuid;

  tenant_bt := COALESCE(tenant_bt, 'driving_school');

  RETURN QUERY
  SELECT
    'categories'::TEXT as table_name,
    COALESCE(
      (SELECT jsonb_agg(row_to_json(cat)) FROM public.evaluation_categories WHERE tenant_id = tenant_uuid),
      CASE
        WHEN tenant_bt = 'driving_school' THEN (
          SELECT jsonb_agg(row_to_json(cat)) FROM public.evaluation_categories
          WHERE tenant_id IS NULL
            AND (business_type = 'driving_school' OR business_type IS NULL)
        )
        ELSE (
          SELECT jsonb_agg(row_to_json(cat)) FROM public.evaluation_categories
          WHERE tenant_id IS NULL AND business_type = tenant_bt
        )
      END
    ) as data;

  RETURN QUERY
  SELECT
    'criteria'::TEXT as table_name,
    COALESCE(
      (SELECT jsonb_agg(row_to_json(crit)) FROM public.evaluation_criteria WHERE tenant_id = tenant_uuid),
      CASE
        WHEN tenant_bt = 'driving_school' THEN (
          SELECT jsonb_agg(row_to_json(crit)) FROM public.evaluation_criteria c
          JOIN public.evaluation_categories ec ON ec.id = c.category_id
          WHERE c.tenant_id IS NULL
            AND (ec.business_type = 'driving_school' OR ec.business_type IS NULL)
        )
        ELSE (
          SELECT jsonb_agg(row_to_json(crit)) FROM public.evaluation_criteria c
          JOIN public.evaluation_categories ec ON ec.id = c.category_id
          WHERE c.tenant_id IS NULL AND ec.business_type = tenant_bt
        )
      END
    ) as data;

  RETURN QUERY
  SELECT
    'scale'::TEXT as table_name,
    COALESCE(
      (SELECT jsonb_agg(row_to_json(scale)) FROM public.evaluation_scale WHERE tenant_id = tenant_uuid),
      CASE
        WHEN tenant_bt = 'driving_school' THEN (
          SELECT jsonb_agg(row_to_json(scale)) FROM public.evaluation_scale WHERE tenant_id IS NULL
        )
        ELSE NULL
      END
    ) as data;
END;
$$ LANGUAGE plpgsql;
