-- Migration: add_salary_type_and_monthly_hours
-- Adds salary type (hourly/monthly), weekly contracted hours, and staff_monthly_hours tracking table

-- Add salary type and weekly contracted hours to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS salary_type text DEFAULT 'hourly' CHECK (salary_type IN ('hourly', 'monthly')),
  ADD COLUMN IF NOT EXISTS weekly_contracted_hours numeric(5,2);

-- Create staff_monthly_hours table for long-term monthly tracking
CREATE TABLE IF NOT EXISTS staff_monthly_hours (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  target_hours numeric(8,2) DEFAULT 0 NOT NULL,
  actual_hours numeric(8,2) DEFAULT 0 NOT NULL,
  vacation_hours numeric(8,2) DEFAULT 0 NOT NULL,
  overtime_hours numeric(8,2) GENERATED ALWAYS AS (actual_hours + vacation_hours - target_hours) STORED,
  cumulative_overtime numeric(8,2) DEFAULT 0 NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (tenant_id, staff_id, year, month)
);

-- RLS for staff_monthly_hours
ALTER TABLE staff_monthly_hours ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'staff_monthly_hours'
      AND policyname = 'staff_monthly_hours_tenant_isolation'
  ) THEN
    CREATE POLICY "staff_monthly_hours_tenant_isolation" ON staff_monthly_hours
      USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
      ));
  END IF;
END
$$;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_staff_monthly_hours_staff_year_month
  ON staff_monthly_hours (staff_id, year, month);

CREATE INDEX IF NOT EXISTS idx_staff_monthly_hours_tenant_year
  ON staff_monthly_hours (tenant_id, year);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_staff_monthly_hours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_monthly_hours_updated_at
  BEFORE UPDATE ON staff_monthly_hours
  FOR EACH ROW EXECUTE FUNCTION update_staff_monthly_hours_updated_at();

-- Add vacation event type to templates (tenant_id = NULL means it's a system template)
INSERT INTO event_types (code, name, emoji, description, default_duration_minutes, default_color, is_active, display_order, allowed_roles, requires_team_invite, auto_generate_title, tenant_id, require_payment, public_bookable)
SELECT 'vacation', 'Ferien', '🏖️', 'Ferien / Urlaub des Mitarbeiters', 480, '#10b981', true, 99, ARRAY['staff', 'admin'], false, true, NULL, false, false
WHERE NOT EXISTS (SELECT 1 FROM event_types WHERE code = 'vacation' AND tenant_id IS NULL);
