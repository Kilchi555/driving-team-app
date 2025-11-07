-- Migration: Update tenant_reglements for hybrid approach
-- Basis-Reglemente mit Platzhaltern + zusätzliche Abschnitte + zusätzliche Reglemente
-- Date: 2025-11-04

-- 1. Add columns for additional content
ALTER TABLE tenant_reglements
ADD COLUMN IF NOT EXISTS additional_content TEXT DEFAULT NULL, -- Zusätzliche Inhalte pro Reglement
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE, -- TRUE für zusätzliche/benutzerdefinierte Reglemente
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0; -- Sortierung

-- 2. Update unique constraint to allow custom reglements
-- Remove old constraint
ALTER TABLE tenant_reglements
DROP CONSTRAINT IF EXISTS unique_reglement_per_tenant;

-- Add new constraint that allows custom reglements (type can be duplicated for custom)
-- For standard types, only one per tenant
-- For custom types (is_custom = true), multiple allowed
CREATE UNIQUE INDEX IF NOT EXISTS unique_standard_reglement_per_tenant 
ON tenant_reglements(tenant_id, type) 
WHERE is_custom = FALSE AND tenant_id IS NOT NULL;

-- 3. Create table for reglement sections (additional sections within standard reglements)
CREATE TABLE IF NOT EXISTS reglement_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reglement_id UUID REFERENCES tenant_reglements(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  section_title VARCHAR(255) NOT NULL, -- Titel des zusätzlichen Abschnitts
  section_content TEXT NOT NULL, -- HTML-Content des Abschnitts
  display_order INTEGER DEFAULT 0, -- Position im Reglement
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 4. Create indexes for reglement_sections
CREATE INDEX IF NOT EXISTS idx_reglement_sections_reglement_id ON reglement_sections(reglement_id);
CREATE INDEX IF NOT EXISTS idx_reglement_sections_tenant_id ON reglement_sections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reglement_sections_active ON reglement_sections(is_active);
CREATE INDEX IF NOT EXISTS idx_reglement_sections_order ON reglement_sections(reglement_id, display_order);

-- 5. Add RLS for reglement_sections
ALTER TABLE reglement_sections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view active sections for their tenant
CREATE POLICY "Users can view reglement sections" ON reglement_sections
  FOR SELECT USING (
    is_active = true AND
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Admins can manage reglement sections
CREATE POLICY "Admins can manage reglement sections" ON reglement_sections
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

-- 6. Trigger for updated_at on reglement_sections
CREATE TRIGGER update_reglement_sections_updated_at 
  BEFORE UPDATE ON reglement_sections 
  FOR EACH ROW EXECUTE FUNCTION update_reglements_updated_at();

-- 7. Update templates with placeholders
UPDATE tenant_reglements
SET content = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(content, 
          'die Fahrschule', '{{tenant_name}}'),
        'Fahrschule', '{{tenant_name}}'),
      'bei der Sie Ihre Fahrstunden buchen', '{{tenant_name}}'),
    'Ihre Fahrschule', '{{tenant_name}}'),
  'die Fahrschule', '{{tenant_name}}')
WHERE tenant_id IS NULL;

-- Add placeholders for contact information in templates
-- This will be done in the application layer, but we can add some examples
COMMENT ON COLUMN tenant_reglements.content IS 'HTML-Content mit Platzhaltern: {{tenant_name}}, {{tenant_address}}, {{tenant_email}}, {{tenant_phone}}, {{tenant_website}}';
COMMENT ON COLUMN tenant_reglements.additional_content IS 'Zusätzlicher HTML-Content, der nach dem Basis-Content angezeigt wird';
COMMENT ON COLUMN tenant_reglements.is_custom IS 'TRUE für benutzerdefinierte Reglemente, FALSE für Standard-Reglemente';
COMMENT ON COLUMN reglement_sections.section_content IS 'Zusätzlicher Abschnitt, der nach dem Basis-Content eingefügt wird';

-- 8. Update existing reglements to be non-custom
UPDATE tenant_reglements
SET is_custom = FALSE
WHERE is_custom IS NULL;

