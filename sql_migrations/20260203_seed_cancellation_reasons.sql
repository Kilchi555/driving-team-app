-- Insert default cancellation reasons for all tenants
-- Run this after creating the cancellation_reasons table

-- For each tenant, add default cancellation reasons
DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
BEGIN
  -- For each tenant
  FOR v_tenant_id IN 
    SELECT DISTINCT tenant_id FROM public.users WHERE role IN ('admin', 'super_admin') LIMIT 1
  LOOP
    -- Get an admin user for created_by
    SELECT id INTO v_user_id FROM public.users 
    WHERE tenant_id = v_tenant_id AND role IN ('admin', 'super_admin') LIMIT 1;
    
    -- Insert default student cancellation reasons
    INSERT INTO public.cancellation_reasons (tenant_id, code, name_de, description_de, cancellation_type, charge_percentage, requires_medical_certificate, sort_order, is_active, created_by)
    VALUES 
      (v_tenant_id, 'student_illness', 'Krankheit', 'Schüler ist krank', 'student', 0, TRUE, 10, TRUE, v_user_id),
      (v_tenant_id, 'student_personal', 'Persönliche Gründe', 'Persönliche oder familiäre Gründe', 'student', 50, FALSE, 20, TRUE, v_user_id),
      (v_tenant_id, 'student_traffic', 'Verkehrsbehinderung', 'Stau oder Verkehrsprobleme', 'student', 25, FALSE, 30, TRUE, v_user_id),
      (v_tenant_id, 'student_other', 'Sonstiges', 'Andere Gründe', 'student', 75, FALSE, 40, TRUE, v_user_id),
      
      -- Insert default staff cancellation reasons
      (v_tenant_id, 'staff_illness', 'Krankheit Fahrlehrer', 'Fahrlehrer ist krank', 'staff', 0, TRUE, 50, TRUE, v_user_id),
      (v_tenant_id, 'staff_emergency', 'Notfall Fahrlehrer', 'Unvorhergesehener Notfall', 'staff', 0, FALSE, 60, TRUE, v_user_id),
      (v_tenant_id, 'staff_vehicle', 'Fahrzeugproblem', 'Fahrzeug ist nicht verfügbar', 'staff', 0, FALSE, 70, TRUE, v_user_id),
      (v_tenant_id, 'staff_other', 'Sonstiges (Fahrlehrer)', 'Andere Gründe', 'staff', 25, FALSE, 80, TRUE, v_user_id)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
  END LOOP;
END $$;

-- Log the result
SELECT COUNT(*) as inserted_reasons FROM public.cancellation_reasons;
