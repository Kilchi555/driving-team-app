-- Fix RLS Policies for cancellation_policies and cancellation_rules
-- Das Problem: Die ursprünglichen Policies versuchen auf auth.users zuzugreifen, was nicht erlaubt ist

-- 1. Lösche die problematischen Policies
DROP POLICY IF EXISTS "Users can view active cancellation policies" ON cancellation_policies;
DROP POLICY IF EXISTS "Admins can manage cancellation policies" ON cancellation_policies;
DROP POLICY IF EXISTS "Users can view cancellation rules" ON cancellation_rules;
DROP POLICY IF EXISTS "Admins can manage cancellation rules" ON cancellation_rules;

-- 2. Erstelle neue, funktionierende Policies für cancellation_policies
-- Policy für SELECT (alle können aktive Policies sehen)
CREATE POLICY "Allow select active cancellation policies" ON cancellation_policies
  FOR SELECT USING (is_active = true);

-- Policy für INSERT/UPDATE/DELETE (nur Admins)
CREATE POLICY "Allow admin manage cancellation policies" ON cancellation_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 3. Erstelle neue, funktionierende Policies für cancellation_rules
-- Policy für SELECT (alle können Rules von aktiven Policies sehen)
CREATE POLICY "Allow select cancellation rules" ON cancellation_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cancellation_policies 
      WHERE cancellation_policies.id = cancellation_rules.policy_id 
      AND cancellation_policies.is_active = true
    )
  );

-- Policy für INSERT/UPDATE/DELETE (nur Admins)
CREATE POLICY "Allow admin manage cancellation rules" ON cancellation_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 4. Teste die Policies
-- Diese Queries sollten funktionieren:
-- SELECT * FROM cancellation_policies WHERE is_active = true;
-- SELECT * FROM cancellation_rules WHERE policy_id IN (SELECT id FROM cancellation_policies WHERE is_active = true);
