-- Multi-Tenant System Migration
-- Creates the foundation for multi-tenant functionality

-- 1) Tenants table - Core tenant information
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Basic tenant info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
  domain VARCHAR(255) NULL, -- Custom domain (optional)
  
  -- Contact information
  contact_email VARCHAR(255) NULL,
  contact_phone VARCHAR(50) NULL,
  address TEXT NULL,
  
  -- Business information
  business_type VARCHAR(100) NULL, -- 'driving_school', 'other'
  license_number VARCHAR(100) NULL,
  
  -- Branding
  logo_url TEXT NULL,
  primary_color VARCHAR(7) NULL, -- Hex color
  secondary_color VARCHAR(7) NULL,
  
  -- Settings
  timezone VARCHAR(50) DEFAULT 'Europe/Zurich',
  currency VARCHAR(3) DEFAULT 'CHF',
  language VARCHAR(5) DEFAULT 'de',
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_trial BOOLEAN NOT NULL DEFAULT true,
  trial_ends_at TIMESTAMPTZ NULL,
  
  -- Subscription info
  subscription_plan VARCHAR(50) DEFAULT 'trial', -- 'trial', 'basic', 'premium'
  subscription_status VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
  
  -- Audit
  created_by UUID NULL,
  updated_by UUID NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription ON tenants(subscription_status);

-- 2) Tenant settings table - Tenant-specific configurations
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Setting category and key
  category VARCHAR(100) NOT NULL, -- 'general', 'billing', 'notifications', 'branding'
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NULL,
  setting_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  
  -- Audit
  updated_by UUID NULL,
  
  UNIQUE(tenant_id, category, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_category ON tenant_settings(category);

-- 3) Tenant users table - Maps users to tenants with roles
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Role within this tenant
  role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'owner', 'admin', 'staff', 'user'
  
  -- Permissions (JSON object for granular permissions)
  permissions JSONB NULL,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_at TIMESTAMPTZ NULL,
  accepted_at TIMESTAMPTZ NULL,
  
  -- Audit
  invited_by UUID NULL,
  
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON tenant_users(role);

-- 4) Update triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tenants_updated_at'
  ) THEN
    CREATE TRIGGER trg_tenants_updated_at
      BEFORE UPDATE ON tenants
      FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tenant_settings_updated_at'
  ) THEN
    CREATE TRIGGER trg_tenant_settings_updated_at
      BEFORE UPDATE ON tenant_settings
      FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tenant_users_updated_at'
  ) THEN
    CREATE TRIGGER trg_tenant_users_updated_at
      BEFORE UPDATE ON tenant_users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;

-- 5) Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- 6) RLS Policies
-- Tenants: Users can see tenants they belong to
CREATE POLICY tenants_user_access ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Tenant settings: Users can see settings for their tenants
CREATE POLICY tenant_settings_user_access ON tenant_settings
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Tenant users: Users can see their own tenant memberships
CREATE POLICY tenant_users_self_access ON tenant_users
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- 7) Insert default tenant (for existing single-tenant setup)
INSERT INTO tenants (id, name, slug, business_type, is_trial, trial_ends_at, subscription_plan)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Driving Team',
  'driving-team',
  'driving_school',
  false,
  null,
  'premium'
) ON CONFLICT (slug) DO NOTHING;

-- 8) Migrate existing users to default tenant
INSERT INTO tenant_users (tenant_id, user_id, role, is_active, accepted_at)
SELECT 
  '00000000-0000-0000-0000-000000000000' as tenant_id,
  id as user_id,
  CASE 
    WHEN role = 'admin' THEN 'admin'
    WHEN role = 'staff' THEN 'staff'
    ELSE 'user'
  END as role,
  true as is_active,
  created_at as accepted_at
FROM users
WHERE id NOT IN (SELECT user_id FROM tenant_users)
ON CONFLICT (tenant_id, user_id) DO NOTHING;
