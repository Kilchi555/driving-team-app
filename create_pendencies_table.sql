-- Create pendencies table for admin task management
CREATE TABLE IF NOT EXISTS pendencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pendent' CHECK (status IN ('pendent', 'überfällig', 'in_bearbeitung', 'abgeschlossen', 'gelöscht')),
  priority VARCHAR(50) NOT NULL DEFAULT 'mittel' CHECK (priority IN ('niedrig', 'mittel', 'hoch', 'kritisch')),
  category VARCHAR(100) DEFAULT 'sonstiges' CHECK (category IN ('system', 'zahlung', 'marketing', 'personal', 'sonstiges', 'buchung')),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recurrence_type VARCHAR(50) DEFAULT 'keine' CHECK (recurrence_type IN ('keine', 'täglich', 'wöchentlich', 'monatlich', 'jährlich')),
  recurrence_end_date TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  tags JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  
  -- Indexes
  CONSTRAINT valid_date CHECK (due_date > created_at)
);

-- Create indexes for performance
CREATE INDEX idx_pendencies_tenant_id ON pendencies(tenant_id);
CREATE INDEX idx_pendencies_status ON pendencies(status);
CREATE INDEX idx_pendencies_assigned_to ON pendencies(assigned_to);
CREATE INDEX idx_pendencies_due_date ON pendencies(due_date);
CREATE INDEX idx_pendencies_tenant_status ON pendencies(tenant_id, status);
CREATE INDEX idx_pendencies_tenant_due_date ON pendencies(tenant_id, due_date);

-- Enable RLS
ALTER TABLE pendencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Pendencies: Admins can view all tenant pendencies" 
  ON pendencies FOR SELECT 
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Pendencies: Admins can insert pendencies" 
  ON pendencies FOR INSERT 
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Pendencies: Admins can update pendencies" 
  ON pendencies FOR UPDATE 
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Pendencies: Admins can delete pendencies" 
  ON pendencies FOR DELETE 
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role = 'admin'
  ));

-- Verify
SELECT 'Pendencies table created successfully!' as status;
