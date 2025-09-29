-- Vereinfachte Multi-Tenant Struktur
-- tenants Tabelle + direkte Zuordnung in users Tabelle

-- 1) Tenants Tabelle (Fahrschulen/Organisationen)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Tenant identification
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Plan information
  plan VARCHAR(50) DEFAULT 'basic', -- 'basic', 'premium', 'enterprise'
  trial_ends_at TIMESTAMPTZ NULL,
  
  -- Contact information
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Audit
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 2) Add tenant_id to users table (falls noch nicht vorhanden)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Add tenant_id to appointments table (falls noch nicht vorhanden)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);

-- 5) Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 6) RLS Policies
DO $$ BEGIN
  -- Tenants: Alle authentifizierten Benutzer können sehen
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tenants_access'
  ) THEN
    CREATE POLICY tenants_access ON tenants
      FOR ALL
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 7) Insert default tenant (falls noch nicht vorhanden)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE slug = 'default') THEN
    INSERT INTO tenants (name, slug, status, is_active, plan, settings)
    VALUES (
      'Standard Fahrschule',
      'default',
      'active',
      true,
      'basic',
      '{"reminder_settings": {}, "pricing_settings": {}}'
    );
  END IF;
END $$;

-- 8) Update existing users to belong to default tenant
UPDATE users 
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;

-- 9) Update existing appointments to belong to default tenant
UPDATE appointments 
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;
