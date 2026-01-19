-- Create categories table for driving lesson categories (A, B, C, etc.)

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  lesson_duration_minutes INTEGER DEFAULT 45,
  price_per_lesson INTEGER DEFAULT 9500, -- In Rappen (100 Rappen = 1 CHF)
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(code);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "categories_select_authenticated" ON categories
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "categories_select_anon" ON categories
  FOR SELECT
  TO anon
  USING (true); -- Allow anonymous access for public pages

CREATE POLICY "categories_admin_all" ON categories
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default categories for active driving schools
INSERT INTO categories (tenant_id, code, name, description, lesson_duration_minutes, price_per_lesson, display_order)
SELECT 
  id,
  'A1',
  'Kategorie A1',
  'Leichte Motorräder bis 11 kW',
  45,
  9500,
  1
FROM tenants
WHERE is_active = true AND business_type = 'driving_school'
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO categories (tenant_id, code, name, description, lesson_duration_minutes, price_per_lesson, display_order)
SELECT 
  id,
  'A35kW',
  'Kategorie A (35 kW)',
  'Motorräder bis 35 kW',
  45,
  9500,
  2
FROM tenants
WHERE is_active = true AND business_type = 'driving_school'
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO categories (tenant_id, code, name, description, lesson_duration_minutes, price_per_lesson, display_order)
SELECT 
  id,
  'A',
  'Kategorie A',
  'Motorräder ohne Beschränkung',
  45,
  9500,
  3
FROM tenants
WHERE is_active = true AND business_type = 'driving_school'
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO categories (tenant_id, code, name, description, lesson_duration_minutes, price_per_lesson, display_order)
SELECT 
  id,
  'B',
  'Kategorie B',
  'Personenwagen bis 3500 kg',
  45,
  9500,
  4
FROM tenants
WHERE is_active = true AND business_type = 'driving_school'
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO categories (tenant_id, code, name, description, lesson_duration_minutes, price_per_lesson, display_order)
SELECT 
  id,
  'C',
  'Kategorie C',
  'Lastwagen über 3500 kg',
  60,
  12000,
  5
FROM tenants
WHERE is_active = true AND business_type = 'driving_school'
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO categories (tenant_id, code, name, description, lesson_duration_minutes, price_per_lesson, display_order)
SELECT 
  id,
  'D',
  'Kategorie D',
  'Busse über 8 Personen',
  60,
  12000,
  6
FROM tenants
WHERE is_active = true AND business_type = 'driving_school'
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Verify creation
SELECT 
  t.name,
  c.code,
  c.name,
  c.lesson_duration_minutes,
  ROUND((c.price_per_lesson / 100.0)::numeric, 2) as price_chf,
  c.is_active
FROM categories c
LEFT JOIN tenants t ON c.tenant_id = t.id
ORDER BY t.name, c.display_order;

