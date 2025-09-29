-- Create standard evaluation templates (tenant_id IS NULL)
-- These will serve as default templates for new tenants

-- 0. Add required columns if they don't exist
ALTER TABLE evaluation_categories 
ADD COLUMN IF NOT EXISTS driving_categories TEXT[] DEFAULT ARRAY['A'];

ALTER TABLE evaluation_criteria 
ADD COLUMN IF NOT EXISTS driving_categories TEXT[] DEFAULT ARRAY['A'];

ALTER TABLE evaluation_categories 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE evaluation_criteria 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE evaluation_scale 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Add missing columns that might not exist
ALTER TABLE evaluation_criteria 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE evaluation_scale 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 1. Insert standard evaluation scale (if not exists)
INSERT INTO evaluation_scale (rating, label, description, color, is_active, tenant_id) 
SELECT * FROM (VALUES
    (1, 'Besprochen', 'Thema wurde besprochen', '#EF4444', true, NULL),
    (2, 'Geübt', 'Thema wurde geübt', '#F97316', true, NULL),
    (3, 'Ungenügend', 'Ungenügende Leistung', '#EAB308', true, NULL),
    (4, 'Genügend', 'Genügende Leistung', '#3B82F6', true, NULL),
    (5, 'Gut', 'Gute Leistung', '#10B981', true, NULL),
    (6, 'Prüfungsreif', 'Prüfungsreife Leistung', '#059669', true, NULL)
) AS v(rating, label, description, color, is_active, tenant_id)
ON CONFLICT (rating) WHERE tenant_id IS NULL DO NOTHING;

-- 2. Insert standard evaluation categories (if not exists)
INSERT INTO evaluation_categories (name, description, color, display_order, driving_categories, is_active, tenant_id)
SELECT * FROM (VALUES
    ('Vorschulung', 'Grundlegende Fahrzeugbedienung und Verkehrsregeln', '#3B82F6', 1, ARRAY['A'], true, NULL),
    ('Grundschulung', 'Erste Fahrversuche und Grundmanöver', '#10B981', 2, ARRAY['A'], true, NULL),
    ('Manöver', 'Parkieren, Wenden und spezielle Manöver', '#F59E0B', 3, ARRAY['A'], true, NULL),
    ('Verkehrskunde', 'Verkehrsregeln und -zeichen', '#8B5CF6', 4, ARRAY['A'], true, NULL)
) AS v(name, description, color, display_order, driving_categories, is_active, tenant_id)
ON CONFLICT (name, driving_categories) WHERE tenant_id IS NULL DO NOTHING;

-- 3. Insert standard evaluation criteria (if not exists)
-- First, get the category IDs for the standard categories
WITH standard_categories AS (
    SELECT id, name FROM evaluation_categories WHERE tenant_id IS NULL
),
criteria_data AS (
    SELECT 
        sc.id as category_id,
        tc.name,
        tc.description,
        tc.display_order
    FROM (
        VALUES 
            ('Vorschulung', 'Blicksystematik', 'Systematisches Schauen in alle Richtungen', 1),
            ('Vorschulung', 'Spiegel einstellen', 'Richtige Einstellung der Spiegel', 2),
            ('Vorschulung', 'Sitzposition', 'Optimale Sitzposition einnehmen', 3),
            ('Grundschulung', 'Anfahren', 'Sauberes Anfahren ohne Abwürgen', 1),
            ('Grundschulung', 'Schalten', 'Richtiges Schalten und Kuppeln', 2),
            ('Grundschulung', 'Bremsen', 'Sanftes und kontrolliertes Bremsen', 3),
            ('Manöver', 'Rückwärtsparkieren', 'Rückwärtsparkieren in Parklücke', 1),
            ('Manöver', 'Wenden', 'Sicheres Wenden in engen Straßen', 2),
            ('Manöver', 'Parallelparkieren', 'Parallelparkieren am Straßenrand', 3),
            ('Verkehrskunde', 'Verkehrszeichen', 'Verstehen und Befolgen von Verkehrszeichen', 1),
            ('Verkehrskunde', 'Vorfahrt', 'Richtige Vorfahrtsregeln anwenden', 2),
            ('Verkehrskunde', 'Geschwindigkeit', 'Angemessene Geschwindigkeit wählen', 3)
    ) AS tc(category_name, name, description, display_order)
    JOIN standard_categories sc ON sc.name = tc.category_name
)
INSERT INTO evaluation_criteria (category_id, name, description, display_order, is_active, driving_categories, tenant_id)
SELECT 
    category_id,
    name,
    description,
    display_order,
    true as is_active,
    ARRAY['A'] as driving_categories,
    NULL as tenant_id
FROM criteria_data
ON CONFLICT (category_id, name) WHERE tenant_id IS NULL DO NOTHING;

-- 4. Verify the setup
SELECT 'Standard evaluation templates created successfully' as status;
SELECT 'Categories:' as info, COUNT(*) as count FROM evaluation_categories WHERE tenant_id IS NULL;
SELECT 'Criteria:' as info, COUNT(*) as count FROM evaluation_criteria WHERE tenant_id IS NULL;
SELECT 'Scale:' as info, COUNT(*) as count FROM evaluation_scale WHERE tenant_id IS NULL;
