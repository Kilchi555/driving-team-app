-- Add course_categories table for dynamic course types
-- This allows admins to manage course categories instead of hardcoded options

CREATE TABLE IF NOT EXISTS course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Category details
  code VARCHAR(50) NOT NULL, -- 'VKU', 'PGS', 'CZV', etc.
  name VARCHAR(255) NOT NULL, -- 'Verkehrskunde', 'Motorradkurse', etc.
  description TEXT,
  
  -- SARI integration
  sari_category_code VARCHAR(100), -- External SARI category code
  requires_sari_sync BOOLEAN DEFAULT false,
  
  -- Default settings for courses in this category
  default_max_participants INTEGER DEFAULT 20,
  default_price_rappen INTEGER DEFAULT 0,
  default_requires_room BOOLEAN DEFAULT true,
  default_requires_vehicle BOOLEAN DEFAULT false,
  
  -- Visual settings
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for badges
  icon VARCHAR(10) DEFAULT '📚', -- Emoji icon
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Constraints
  UNIQUE(tenant_id, code)
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_course_categories_tenant_id ON course_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_course_categories_active ON course_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_course_categories_sort ON course_categories(sort_order);

-- Enable RLS
ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY course_categories_tenant_access ON course_categories
  FOR ALL TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

-- Insert default categories for existing tenants
INSERT INTO course_categories (tenant_id, code, name, description, default_max_participants, default_requires_room, color, icon, sort_order, requires_sari_sync) VALUES
-- Tenant 1
('64259d68-195a-4c68-8875-f1b44d962830', 'VKU', 'Verkehrskunde', 'Verkehrskundeunterricht für Lernfahrer', 20, true, '#3B82F6', '🚗', 1, true),
('64259d68-195a-4c68-8875-f1b44d962830', 'PGS', 'Motorradkurse', 'Praktische Grundschulung für Motorradfahrer', 12, false, '#8B5CF6', '🏍️', 2, true),
('64259d68-195a-4c68-8875-f1b44d962830', 'CZV', 'CZV-Weiterbildungen', 'Weiterbildungen für Berufschauffeure', 16, true, '#F59E0B', '🚛', 3, true),
('64259d68-195a-4c68-8875-f1b44d962830', 'Fahrlehrer', 'Fahrlehrerweiterbildungen', 'Weiterbildungen für Fahrlehrer', 15, true, '#10B981', '👨‍🏫', 4, true),
('64259d68-195a-4c68-8875-f1b44d962830', 'Privat', 'Privatkurse', 'Individuelle private Kurse', 10, false, '#6B7280', '🔒', 5, false),
-- Tenant 2  
('78af580f-1670-4be3-a556-250339c872fa', 'VKU', 'Verkehrskunde', 'Verkehrskundeunterricht für Lernfahrer', 20, true, '#3B82F6', '🚗', 1, true),
('78af580f-1670-4be3-a556-250339c872fa', 'PGS', 'Motorradkurse', 'Praktische Grundschulung für Motorradfahrer', 12, false, '#8B5CF6', '🏍️', 2, true),
('78af580f-1670-4be3-a556-250339c872fa', 'CZV', 'CZV-Weiterbildungen', 'Weiterbildungen für Berufschauffeure', 16, true, '#F59E0B', '🚛', 3, true),
('78af580f-1670-4be3-a556-250339c872fa', 'Fahrlehrer', 'Fahrlehrerweiterbildungen', 'Weiterbildungen für Fahrlehrer', 15, true, '#10B981', '👨‍🏫', 4, true),
('78af580f-1670-4be3-a556-250339c872fa', 'Privat', 'Privatkurse', 'Individuelle private Kurse', 10, false, '#6B7280', '🔒', 5, false)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Update courses table to reference course_categories
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS course_category_id UUID REFERENCES course_categories(id);

-- Migrate existing category strings to course_categories
UPDATE courses 
SET course_category_id = (
  SELECT cc.id 
  FROM course_categories cc 
  WHERE cc.tenant_id = courses.tenant_id 
  AND cc.code = courses.category
)
WHERE course_category_id IS NULL AND category IS NOT NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_course_categories_updated_at 
  BEFORE UPDATE ON course_categories 
  FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();

-- Verify
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM course_categories;
    RAISE NOTICE 'Course categories table created successfully';
    RAISE NOTICE 'Total categories created: %', category_count;
    RAISE NOTICE 'Categories are now dynamically manageable per tenant';
    RAISE NOTICE 'Each category has default settings and SARI integration flags';
END $$;
