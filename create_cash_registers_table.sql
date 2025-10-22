-- Create missing cash_registers table that the staff trigger needs
-- This table is referenced by the trigger_create_staff_cash function

-- Create cash_registers table
CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant_id ON cash_registers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_active ON cash_registers(is_active);

-- Enable RLS for multi-tenant security
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access cash registers from their tenant
CREATE POLICY cash_registers_tenant_access ON cash_registers
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  );

-- Grant permissions
GRANT ALL ON cash_registers TO authenticated;

-- Verify the table was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cash_registers'
    ) THEN
        RAISE NOTICE '✅ cash_registers table created successfully';
        RAISE NOTICE '';
        RAISE NOTICE 'Table structure:';
        RAISE NOTICE '- id: UUID PRIMARY KEY';
        RAISE NOTICE '- tenant_id: UUID REFERENCES tenants(id)';
        RAISE NOTICE '- name: VARCHAR(255) NOT NULL';
        RAISE NOTICE '- description: TEXT';
        RAISE NOTICE '- is_active: BOOLEAN DEFAULT true';
        RAISE NOTICE '- created_at: TIMESTAMP WITH TIME ZONE';
        RAISE NOTICE '- updated_at: TIMESTAMP WITH TIME ZONE';
    ELSE
        RAISE NOTICE '❌ cash_registers table creation failed!';
    END IF;
END $$;
















