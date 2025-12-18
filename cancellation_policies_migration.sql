-- Migration: Cancellation Policies System
-- Erstellt die Tabellen für das erweiterte Absage-Management

-- 1. Cancellation Policies Tabelle
CREATE TABLE IF NOT EXISTS cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Nur eine Policy kann default sein
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Cancellation Rules Tabelle
CREATE TABLE IF NOT EXISTS cancellation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES cancellation_policies(id) ON DELETE CASCADE,
  hours_before_appointment INTEGER NOT NULL, -- z.B. 72 für 3 Tage, 24 für 1 Tag
  charge_percentage INTEGER NOT NULL CHECK (charge_percentage >= 0 AND charge_percentage <= 100), -- 0, 50, 100
  credit_hours_to_instructor BOOLEAN DEFAULT false, -- Stunden gutschreiben
  description VARCHAR(255), -- z.B. "Innerhalb 3 Tage: 50% verrechnen, Stunden gutschreiben"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Erweitere appointments Tabelle
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancellation_charge_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_credit_hours BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_policy_applied UUID REFERENCES cancellation_policies(id);

-- 4. Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_cancellation_policies_active ON cancellation_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_cancellation_policies_default ON cancellation_policies(is_default);
CREATE INDEX IF NOT EXISTS idx_cancellation_rules_policy_id ON cancellation_rules(policy_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_rules_hours ON cancellation_rules(hours_before_appointment);

-- 5. RLS Policies
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_rules ENABLE ROW LEVEL SECURITY;

-- Policies für cancellation_policies
CREATE POLICY "Users can view active cancellation policies" ON cancellation_policies
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage cancellation policies" ON cancellation_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policies für cancellation_rules
CREATE POLICY "Users can view cancellation rules" ON cancellation_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cancellation_policies 
      WHERE cancellation_policies.id = cancellation_rules.policy_id 
      AND cancellation_policies.is_active = true
    )
  );

CREATE POLICY "Admins can manage cancellation rules" ON cancellation_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 6. REMOVED: Hardcoded standard policies
-- All policies must be configured via the Admin UI or API
-- No default policies are inserted here to ensure complete flexibility

-- 7. Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cancellation_policies_updated_at 
  BEFORE UPDATE ON cancellation_policies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cancellation_rules_updated_at 
  BEFORE UPDATE ON cancellation_rules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
