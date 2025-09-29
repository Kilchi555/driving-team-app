-- Create staff_working_hours table if not exists
-- Erstellt: 2025-01-27

-- 1. Tabelle erstellen falls nicht vorhanden
CREATE TABLE IF NOT EXISTS staff_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7), -- 1=Montag, 7=Sonntag
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Eindeutige Kombination pro Staff und Wochentag
  UNIQUE(staff_id, day_of_week)
);

-- 2. Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_staff_working_hours_staff_id ON staff_working_hours(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_working_hours_day ON staff_working_hours(day_of_week);
CREATE INDEX IF NOT EXISTS idx_staff_working_hours_active ON staff_working_hours(is_active);

-- 3. RLS aktivieren
ALTER TABLE staff_working_hours ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Policy: Staff können ihre eigenen Arbeitszeiten verwalten
CREATE POLICY "Staff can manage their own working hours" ON staff_working_hours
  FOR ALL USING (auth.uid() = staff_id);

-- Policy: Admins können alle Arbeitszeiten sehen
CREATE POLICY "Admins can view all working hours" ON staff_working_hours
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 5. Trigger für updated_at
CREATE OR REPLACE FUNCTION update_staff_working_hours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_working_hours_updated_at
    BEFORE UPDATE ON staff_working_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_working_hours_updated_at();
