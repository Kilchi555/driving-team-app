-- Add tenant_id columns to existing tables
-- This will enable proper multi-tenant analytics

-- 1) Add tenant_id to users table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
  END IF;
END $$;

-- 2) Add tenant_id to appointments table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);
  END IF;
END $$;

-- 3) Add tenant_id to payments table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
  END IF;
END $$;

-- 4) Add tenant_id to products table (falls vorhanden)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE products ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
    END IF;
  END IF;
END $$;

-- 5) Add tenant_id to discounts table (falls vorhanden)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discounts') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'discounts' AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE discounts ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_discounts_tenant_id ON discounts(tenant_id);
    END IF;
  END IF;
END $$;

-- 6) Update existing data to belong to default tenant
-- First, get the default tenant ID
DO $$ 
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Get the first tenant (or create one if none exists)
  SELECT id INTO default_tenant_id FROM tenants LIMIT 1;
  
  IF default_tenant_id IS NULL THEN
    -- Create a default tenant if none exists
    INSERT INTO tenants (name, slug, subscription_status, subscription_plan, is_active)
    VALUES ('Standard Fahrschule', 'default', 'active', 'basic', true)
    RETURNING id INTO default_tenant_id;
  END IF;
  
  -- Update existing users to belong to default tenant
  UPDATE users 
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;
  
  -- Update existing appointments to belong to default tenant
  UPDATE appointments 
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;
  
  -- Update existing payments to belong to default tenant
  UPDATE payments 
  SET tenant_id = default_tenant_id
  WHERE tenant_id IS NULL;
  
  -- Update existing products to belong to default tenant (falls vorhanden)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    UPDATE products 
    SET tenant_id = default_tenant_id
    WHERE tenant_id IS NULL;
  END IF;
  
  -- Update existing discounts to belong to default tenant (falls vorhanden)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discounts') THEN
    UPDATE discounts 
    SET tenant_id = default_tenant_id
    WHERE tenant_id IS NULL;
  END IF;
  
  RAISE NOTICE 'Updated existing data to belong to tenant: %', default_tenant_id;
END $$;
