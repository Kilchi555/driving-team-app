-- PHASE 2: Enable RLS on additional critical tables
-- These are the most sensitive tables that need protection before going live

-- 1. Enable RLS on invoices table (Financial data)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update_policy" ON public.invoices;

CREATE POLICY "invoices_select_policy" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "invoices_insert_policy" ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "invoices_update_policy" ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

-- 2. Enable RLS on sms_logs table (Communication tracking)
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_logs_select_policy" ON public.sms_logs;

CREATE POLICY "sms_logs_select_policy" ON public.sms_logs
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

-- 3. Enable RLS on student_credits table (Account balance data)
ALTER TABLE public.student_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_credits_select_policy" ON public.student_credits;
DROP POLICY IF EXISTS "student_credits_insert_policy" ON public.student_credits;
DROP POLICY IF EXISTS "student_credits_update_policy" ON public.student_credits;

CREATE POLICY "student_credits_select_policy" ON public.student_credits
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "student_credits_insert_policy" ON public.student_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "student_credits_update_policy" ON public.student_credits
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

-- 4. Enable RLS on notes table (Customer notes/private data)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select_policy" ON public.notes;
DROP POLICY IF EXISTS "notes_insert_policy" ON public.notes;
DROP POLICY IF EXISTS "notes_update_policy" ON public.notes;

CREATE POLICY "notes_select_policy" ON public.notes
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "notes_insert_policy" ON public.notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "notes_update_policy" ON public.notes
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

-- 5. Enable RLS on locations table (Tenant locations)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locations_select_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_insert_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_update_policy" ON public.locations;

CREATE POLICY "locations_select_policy" ON public.locations
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "locations_insert_policy" ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "locations_update_policy" ON public.locations
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

-- 6. Enable RLS on products table (Pricing/products)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "products_insert_policy" ON public.products;
DROP POLICY IF EXISTS "products_update_policy" ON public.products;

CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "products_insert_policy" ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "products_update_policy" ON public.products
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

-- 7. Enable RLS on pricing_rules table (Pricing configuration)
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_rules_select_policy" ON public.pricing_rules;
DROP POLICY IF EXISTS "pricing_rules_insert_policy" ON public.pricing_rules;
DROP POLICY IF EXISTS "pricing_rules_update_policy" ON public.pricing_rules;

CREATE POLICY "pricing_rules_select_policy" ON public.pricing_rules
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "pricing_rules_insert_policy" ON public.pricing_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "pricing_rules_update_policy" ON public.pricing_rules
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

-- 8. Enable RLS on reminder_settings table (Tenant config)
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder_settings_select_policy" ON public.reminder_settings;
DROP POLICY IF EXISTS "reminder_settings_insert_policy" ON public.reminder_settings;
DROP POLICY IF EXISTS "reminder_settings_update_policy" ON public.reminder_settings;

CREATE POLICY "reminder_settings_select_policy" ON public.reminder_settings
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "reminder_settings_insert_policy" ON public.reminder_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "reminder_settings_update_policy" ON public.reminder_settings
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

-- 9. Enable RLS on payment_items table (Payment details)
ALTER TABLE public.payment_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_items_select_policy" ON public.payment_items;
DROP POLICY IF EXISTS "payment_items_insert_policy" ON public.payment_items;
DROP POLICY IF EXISTS "payment_items_update_policy" ON public.payment_items;

CREATE POLICY "payment_items_select_policy" ON public.payment_items
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "payment_items_insert_policy" ON public.payment_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "payment_items_update_policy" ON public.payment_items
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

-- 10. Enable RLS on payment_logs table (Payment tracking)
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_logs_select_policy" ON public.payment_logs;
DROP POLICY IF EXISTS "payment_logs_insert_policy" ON public.payment_logs;

CREATE POLICY "payment_logs_select_policy" ON public.payment_logs
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "payment_logs_insert_policy" ON public.payment_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

-- 11. Enable RLS on evaluation_categories table (Tenant config)
ALTER TABLE public.evaluation_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evaluation_categories_select_policy" ON public.evaluation_categories;
DROP POLICY IF EXISTS "evaluation_categories_insert_policy" ON public.evaluation_categories;
DROP POLICY IF EXISTS "evaluation_categories_update_policy" ON public.evaluation_categories;

CREATE POLICY "evaluation_categories_select_policy" ON public.evaluation_categories
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "evaluation_categories_insert_policy" ON public.evaluation_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "evaluation_categories_update_policy" ON public.evaluation_categories
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

-- 12. Enable RLS on cancellation_policies table (Tenant config)
ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cancellation_policies_select_policy" ON public.cancellation_policies;
DROP POLICY IF EXISTS "cancellation_policies_insert_policy" ON public.cancellation_policies;
DROP POLICY IF EXISTS "cancellation_policies_update_policy" ON public.cancellation_policies;

CREATE POLICY "cancellation_policies_select_policy" ON public.cancellation_policies
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "cancellation_policies_insert_policy" ON public.cancellation_policies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "cancellation_policies_update_policy" ON public.cancellation_policies
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

-- 13. Enable RLS on cancellation_reasons table (Tenant config)
ALTER TABLE public.cancellation_reasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cancellation_reasons_select_policy" ON public.cancellation_reasons;
DROP POLICY IF EXISTS "cancellation_reasons_insert_policy" ON public.cancellation_reasons;
DROP POLICY IF EXISTS "cancellation_reasons_update_policy" ON public.cancellation_reasons;

CREATE POLICY "cancellation_reasons_select_policy" ON public.cancellation_reasons
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "cancellation_reasons_insert_policy" ON public.cancellation_reasons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "cancellation_reasons_update_policy" ON public.cancellation_reasons
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

-- 14. Enable RLS on cancellation_rules table (Tenant config)
ALTER TABLE public.cancellation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cancellation_rules_select_policy" ON public.cancellation_rules;
DROP POLICY IF EXISTS "cancellation_rules_insert_policy" ON public.cancellation_rules;
DROP POLICY IF EXISTS "cancellation_rules_update_policy" ON public.cancellation_rules;

CREATE POLICY "cancellation_rules_select_policy" ON public.cancellation_rules
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "cancellation_rules_insert_policy" ON public.cancellation_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "cancellation_rules_update_policy" ON public.cancellation_rules
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
      AND is_active = true
    )
  );

-- 15. Enable RLS on exam_results table (Student evaluation data)
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exam_results_select_policy" ON public.exam_results;
DROP POLICY IF EXISTS "exam_results_insert_policy" ON public.exam_results;
DROP POLICY IF EXISTS "exam_results_update_policy" ON public.exam_results;

CREATE POLICY "exam_results_select_policy" ON public.exam_results
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "exam_results_insert_policy" ON public.exam_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

CREATE POLICY "exam_results_update_policy" ON public.exam_results
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff', 'tenant_admin')
      AND is_active = true
    )
  );

-- Verify all tables now have RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN (
  'invoices', 'sms_logs', 'student_credits', 'notes', 'locations',
  'products', 'pricing_rules', 'reminder_settings', 'payment_items',
  'payment_logs', 'evaluation_categories', 'cancellation_policies',
  'cancellation_reasons', 'cancellation_rules', 'exam_results'
)
ORDER BY tablename;

