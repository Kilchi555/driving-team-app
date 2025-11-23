-- Create pendencies table for task management
-- Allows staff and admins to create and track general tasks/pendencies
-- Admin can create pendencies for specific staff members

CREATE TABLE IF NOT EXISTS pendencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pendent' CHECK (status IN ('pendent', 'überfällig', 'in_bearbeitung', 'abgeschlossen', 'gelöscht')),
  priority VARCHAR(50) NOT NULL DEFAULT 'mittel' CHECK (priority IN ('niedrig', 'mittel', 'hoch', 'kritisch')),
  category VARCHAR(100),
  
  -- Assignment and tracking
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- If NULL, it's for the creator
  
  -- Dates
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID,
  
  -- Recurrence
  recurrence_type VARCHAR(50) DEFAULT 'keine' CHECK (recurrence_type IN ('keine', 'täglich', 'wöchentlich', 'monatlich', 'jährlich')),
  recurrence_end_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pendencies_tenant_id ON pendencies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pendencies_created_by ON pendencies(created_by);
CREATE INDEX IF NOT EXISTS idx_pendencies_assigned_to ON pendencies(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pendencies_status ON pendencies(status);
CREATE INDEX IF NOT EXISTS idx_pendencies_due_date ON pendencies(due_date);
CREATE INDEX IF NOT EXISTS idx_pendencies_deleted_at ON pendencies(deleted_at);

-- Enable RLS
ALTER TABLE pendencies ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view pendencies they created or are assigned to
CREATE POLICY pendencies_view ON pendencies
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants 
      WHERE id IN (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
      )
    )
    AND (
      -- Created by this user
      created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      -- OR assigned to this user
      OR assigned_to = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      -- OR user is admin/staff of the tenant
      OR (SELECT role FROM users WHERE auth_user_id = auth.uid()) IN ('admin', 'staff')
    )
    AND deleted_at IS NULL
  );

-- RLS Policy: Users can create pendencies for their tenant
CREATE POLICY pendencies_create ON pendencies
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants 
      WHERE id IN (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
      )
    )
    AND created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- RLS Policy: Users can update pendencies they created or are assigned to
CREATE POLICY pendencies_update ON pendencies
  FOR UPDATE TO authenticated
  USING (
    (created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid())
     OR assigned_to = (SELECT id FROM users WHERE auth_user_id = auth.uid())
     OR (SELECT role FROM users WHERE auth_user_id = auth.uid()) = 'admin')
    AND deleted_at IS NULL
  );

-- RLS Policy: Users can soft delete pendencies they created
CREATE POLICY pendencies_delete ON pendencies
  FOR UPDATE TO authenticated
  USING (created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_pendencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pendencies_updated_at
BEFORE UPDATE ON pendencies
FOR EACH ROW
EXECUTE FUNCTION update_pendencies_updated_at();

