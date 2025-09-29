-- Fix appointments table - Add tenant_id column
-- Erstellt: 2024-12-19
-- Zweck: Fügt tenant_id zur appointments Tabelle hinzu

-- 1. Add tenant_id column to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- 2. Add category_code column to appointments table (for availability checking)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS category_code VARCHAR(10);

-- 3. Update existing appointments with tenant_id from staff
UPDATE appointments 
SET tenant_id = (
  SELECT u.tenant_id 
  FROM users u 
  WHERE u.id = appointments.staff_id
)
WHERE tenant_id IS NULL;

-- 4. Update existing appointments with category_code from staff
UPDATE appointments 
SET category_code = (
  SELECT u.category 
  FROM users u 
  WHERE u.id = appointments.staff_id
)
WHERE category_code IS NULL;

-- 5. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_category_code ON appointments(category_code);

-- 6. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Appointments table updated successfully!';
  RAISE NOTICE '📊 Added tenant_id and category_code columns';
  RAISE NOTICE '🔧 Updated existing appointments with tenant and category data';
END $$;
