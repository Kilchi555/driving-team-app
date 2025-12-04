-- Create document_categories table for managing document types required from users

CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  max_file_size_mb INTEGER DEFAULT 10,
  allowed_file_types TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'application/pdf'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- Create index for tenant_id and code lookups
CREATE INDEX IF NOT EXISTS idx_document_categories_tenant_id ON document_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_code ON document_categories(code);

-- Insert default category for learning license (Lernfahrausweis)
INSERT INTO document_categories (tenant_id, code, name, description, display_order, is_required, max_file_size_mb, allowed_file_types)
SELECT 
  id,
  'lernfahrausweis',
  'Lernfahrausweis',
  'Kopie deines Lernfahrausweises',
  1,
  true,
  10,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
FROM tenants
WHERE is_active = true
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Enable RLS
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view document categories for their tenant" ON document_categories
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage document categories" ON document_categories
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

