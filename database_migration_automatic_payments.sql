-- Migration: Add automatic payment fields to appointments and create payment methods table
-- Date: 2025-01-XX
-- Description: Enable automatic payment collection with customer consent

-- 1. Add confirmation_token to appointments table (for appointment confirmation link)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS confirmation_token UUID DEFAULT gen_random_uuid();

-- Create index for confirmation token
CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_token ON appointments(confirmation_token) WHERE confirmation_token IS NOT NULL;

-- 2. Create customer_payment_methods table for saved payment methods (MUST be created before payments references it)
-- ✅ WICHTIG: Speichert nur Wallee-Token, KEINE sensiblen Zahlungsdaten (PCI-DSS compliant)
-- Die tatsächlichen Zahlungsdaten werden von Wallee gespeichert
CREATE TABLE IF NOT EXISTS customer_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  wallee_token VARCHAR(255) NOT NULL, -- Wallee payment method token (von Wallee Tokenization)
  wallee_customer_id VARCHAR(255) NOT NULL, -- Wallee customer ID für Tokenisierung
  display_name VARCHAR(255) NOT NULL, -- e.g., "Visa •••• 4242" (von Wallee zurückgegeben)
  payment_method_type VARCHAR(50), -- 'CARD', 'TWINT', etc. (optional, von Wallee)
  is_default BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE, -- Ablaufdatum (falls verfügbar von Wallee)
  metadata JSONB, -- Zusätzliche Wallee-spezifische Daten (keine sensiblen Infos!)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_wallee_token UNIQUE (user_id, wallee_token)
);

-- 2.1. Add missing columns if table already exists (for partial migrations)
DO $$
BEGIN
  -- Check if table exists but columns are missing
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_payment_methods') THEN
    -- Add wallee_token if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'wallee_token') THEN
      ALTER TABLE customer_payment_methods ADD COLUMN wallee_token VARCHAR(255);
    END IF;
    
    -- Add wallee_customer_id if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'wallee_customer_id') THEN
      ALTER TABLE customer_payment_methods ADD COLUMN wallee_customer_id VARCHAR(255);
    END IF;
    
    -- Add display_name if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'display_name') THEN
      ALTER TABLE customer_payment_methods ADD COLUMN display_name VARCHAR(255);
    END IF;
    
    -- Add payment_method_type if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'payment_method_type') THEN
      ALTER TABLE customer_payment_methods ADD COLUMN payment_method_type VARCHAR(50);
    END IF;
    
    -- Add is_default if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'is_default') THEN
      ALTER TABLE customer_payment_methods ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;
    
    -- Add expires_at if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'expires_at') THEN
      ALTER TABLE customer_payment_methods ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add metadata if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'metadata') THEN
      ALTER TABLE customer_payment_methods ADD COLUMN metadata JSONB;
    END IF;
    
    -- Add is_active if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'is_active') THEN
      ALTER TABLE customer_payment_methods ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add created_at if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'created_at') THEN
      ALTER TABLE customer_payment_methods ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'updated_at') THEN
      ALTER TABLE customer_payment_methods ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Set NOT NULL constraints if columns exist but are nullable
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'wallee_token' AND is_nullable = 'YES') THEN
      ALTER TABLE customer_payment_methods ALTER COLUMN wallee_token SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'wallee_customer_id' AND is_nullable = 'YES') THEN
      ALTER TABLE customer_payment_methods ALTER COLUMN wallee_customer_id SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'display_name' AND is_nullable = 'YES') THEN
      ALTER TABLE customer_payment_methods ALTER COLUMN display_name SET NOT NULL;
    END IF;
  END IF;
END $$;

-- 3. Create index for efficient queries on customer_payment_methods (only if columns exist)
DO $$
BEGIN
  -- Index on user_id
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_user_id ON customer_payment_methods(user_id);
  END IF;
  
  -- Index on tenant_id
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_tenant_id ON customer_payment_methods(tenant_id);
  END IF;
  
  -- Index on wallee_customer_id (only if column exists)
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'wallee_customer_id') THEN
    CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_wallee_customer ON customer_payment_methods(wallee_customer_id);
  END IF;
  
  -- Index on is_default (only if columns exist)
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'user_id')
     AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customer_payment_methods' AND column_name = 'is_default') THEN
    CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_default ON customer_payment_methods(user_id, is_default) WHERE is_default = true;
  END IF;
END $$;

-- 4. Add automatic payment fields to payments table (after customer_payment_methods exists)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS automatic_payment_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS automatic_payment_consent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES customer_payment_methods(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS automatic_payment_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS automatic_payment_processed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for efficient queries on payments
CREATE INDEX IF NOT EXISTS idx_payments_scheduled_payment ON payments(scheduled_payment_date) WHERE scheduled_payment_date IS NOT NULL AND automatic_payment_processed = false;
CREATE INDEX IF NOT EXISTS idx_payments_payment_method_id ON payments(payment_method_id) WHERE payment_method_id IS NOT NULL;

-- 5. Enable RLS for customer_payment_methods
ALTER TABLE customer_payment_methods ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for customer_payment_methods
-- Drop existing policies if they exist (wrapped in DO block to handle errors gracefully)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own payment methods" ON customer_payment_methods;
  DROP POLICY IF EXISTS "Users can insert own payment methods" ON customer_payment_methods;
  DROP POLICY IF EXISTS "Users can update own payment methods" ON customer_payment_methods;
  DROP POLICY IF EXISTS "Users can delete own payment methods" ON customer_payment_methods;
  DROP POLICY IF EXISTS "Staff can view tenant payment methods" ON customer_payment_methods;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Users can view and manage their own payment methods
DO $$
BEGIN
  CREATE POLICY "Users can view own payment methods" ON customer_payment_methods
    FOR SELECT USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = customer_payment_methods.user_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can insert own payment methods" ON customer_payment_methods
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = customer_payment_methods.user_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can update own payment methods" ON customer_payment_methods
    FOR UPDATE USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = customer_payment_methods.user_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can delete own payment methods" ON customer_payment_methods
    FOR DELETE USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = customer_payment_methods.user_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Staff and admins can view payment methods for their tenants
DO $$
BEGIN
  CREATE POLICY "Staff can view tenant payment methods" ON customer_payment_methods
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_user_id = auth.uid()
        AND u.tenant_id = customer_payment_methods.tenant_id
        AND u.role IN ('staff', 'admin')
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 7. Add comments for documentation
COMMENT ON COLUMN appointments.confirmation_token IS 'Unique token for appointment confirmation link';
COMMENT ON COLUMN payments.automatic_payment_consent IS 'Customer has consented to automatic payment collection';
COMMENT ON COLUMN payments.automatic_payment_consent_at IS 'Timestamp when customer gave consent';
COMMENT ON COLUMN payments.scheduled_payment_date IS 'Date/time when automatic payment should be processed';
COMMENT ON COLUMN payments.payment_method_id IS 'Reference to customer_payment_methods.id (Wallee token)';
COMMENT ON COLUMN payments.automatic_payment_processed IS 'Whether automatic payment has been processed';
COMMENT ON COLUMN payments.automatic_payment_processed_at IS 'Timestamp when automatic payment was processed';

