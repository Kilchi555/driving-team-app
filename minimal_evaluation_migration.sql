-- Minimale Migration für das Bewertungssystem
-- Kopiere diesen Code direkt in den Supabase SQL Editor

-- 1. Lösche alles
DROP VIEW IF EXISTS v_evaluation_matrix;
DROP TRIGGER IF EXISTS update_evaluation_criteria_updated_at ON evaluation_criteria;
DROP TRIGGER IF EXISTS update_evaluation_categories_updated_at ON evaluation_categories;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS evaluation_criteria CASCADE;
DROP TABLE IF EXISTS evaluation_categories CASCADE;
DROP TABLE IF EXISTS evaluation_scale CASCADE;

-- 2. Erstelle evaluation_categories
CREATE TABLE evaluation_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    display_order INTEGER NOT NULL DEFAULT 0,
    driving_categories TEXT[] DEFAULT ARRAY['A'],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Erstelle evaluation_scale
CREATE TABLE evaluation_scale (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rating INTEGER NOT NULL,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Erstelle evaluation_criteria
CREATE TABLE evaluation_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES evaluation_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Füge Beispieldaten hinzu
INSERT INTO evaluation_scale (rating, label, description, color) VALUES
(1, 'Besprochen', 'Thema wurde besprochen', '#EF4444'),
(2, 'Geübt', 'Thema wurde geübt', '#F97316'),
(3, 'Ungenügend', 'Ungenügende Leistung', '#EAB308'),
(4, 'Genügend', 'Genügende Leistung', '#3B82F6'),
(5, 'Gut', 'Gute Leistung', '#10B981'),
(6, 'Prüfungsreif', 'Prüfungsreife Leistung', '#059669');

INSERT INTO evaluation_categories (name, description, color, display_order, driving_categories) VALUES
('Vorschulung', 'Grundlegende Fahrzeugbedienung und Verkehrsregeln', '#3B82F6', 1, ARRAY['A']),
('Grundschulung', 'Erste Fahrversuche und Grundmanöver', '#10B981', 2, ARRAY['A']),
('Manöver', 'Parkieren, Wenden und spezielle Manöver', '#F59E0B', 3, ARRAY['A']),
('Verkehrskunde', 'Verkehrsregeln und -zeichen', '#8B5CF6', 4, ARRAY['A']);

-- 6. Erstelle View
CREATE VIEW v_evaluation_matrix AS
SELECT 
    ec.id as category_id,
    ec.name as category_name,
    ec.color as category_color,
    ec.display_order as category_order,
    ec.driving_categories,
    cr.id as criteria_id,
    cr.name as criteria_name,
    cr.description as criteria_description,
    cr.display_order as criteria_order,
    cr.is_required,
    cr.is_active
FROM evaluation_categories ec
JOIN evaluation_criteria cr ON cr.category_id = ec.id
WHERE ec.is_active = true AND cr.is_active = true
ORDER BY ec.display_order, cr.display_order;

-- 7. Status prüfen
SELECT 'evaluation_categories' as table_name, COUNT(*) as count FROM evaluation_categories
UNION ALL
SELECT 'evaluation_scale' as table_name, COUNT(*) as count FROM evaluation_scale;
