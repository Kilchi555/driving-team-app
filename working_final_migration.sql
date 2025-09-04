-- Funktionierende finale Migration für das Bewertungssystem
-- Erstellt alle notwendigen Constraints

-- 1. Lösche nur den View (falls vorhanden)
DROP VIEW IF EXISTS v_evaluation_matrix;

-- 2. Erstelle evaluation_categories
CREATE TABLE IF NOT EXISTS evaluation_categories (
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
CREATE TABLE IF NOT EXISTS evaluation_scale (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rating INTEGER NOT NULL,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Erstelle evaluation_criteria
CREATE TABLE IF NOT EXISTS evaluation_criteria (
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

-- 5. Erstelle Constraints (falls noch nicht vorhanden)
DO $$
BEGIN
    -- Unique constraint für evaluation_scale (rating)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'evaluation_scale_rating_key'
    ) THEN
        ALTER TABLE evaluation_scale ADD CONSTRAINT evaluation_scale_rating_key UNIQUE(rating);
    END IF;
    
    -- Unique constraint für evaluation_categories (name, driving_categories)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'evaluation_categories_name_driving_categories_key'
    ) THEN
        ALTER TABLE evaluation_categories ADD CONSTRAINT evaluation_categories_name_driving_categories_key 
        UNIQUE(name, driving_categories);
    END IF;
    
    -- Unique constraint für evaluation_criteria (category_id, name)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'evaluation_criteria_category_id_name_key'
    ) THEN
        ALTER TABLE evaluation_criteria ADD CONSTRAINT evaluation_criteria_category_id_name_key 
        UNIQUE(category_id, name);
    END IF;
END $$;

-- 6. Füge Beispieldaten hinzu (nur wenn noch keine vorhanden sind)
INSERT INTO evaluation_scale (rating, label, description, color) 
SELECT * FROM (VALUES
    (1, 'Besprochen', 'Thema wurde besprochen', '#EF4444'),
    (2, 'Geübt', 'Thema wurde geübt', '#F97316'),
    (3, 'Ungenügend', 'Ungenügende Leistung', '#EAB308'),
    (4, 'Genügend', 'Genügende Leistung', '#3B82F6'),
    (5, 'Gut', 'Gute Leistung', '#10B981'),
    (6, 'Prüfungsreif', 'Prüfungsreife Leistung', '#059669')
) AS v(rating, label, description, color)
ON CONFLICT (rating) DO NOTHING;

INSERT INTO evaluation_categories (name, description, color, display_order, driving_categories) 
SELECT * FROM (VALUES
    ('Vorschulung', 'Grundlegende Fahrzeugbedienung und Verkehrsregeln', '#3B82F6', 1, ARRAY['A']),
    ('Grundschulung', 'Erste Fahrversuche und Grundmanöver', '#10B981', 2, ARRAY['A']),
    ('Manöver', 'Parkieren, Wenden und spezielle Manöver', '#F59E0B', 3, ARRAY['A']),
    ('Verkehrskunde', 'Verkehrsregeln und -zeichen', '#8B5CF6', 4, ARRAY['A'])
) AS v(name, description, color, display_order, driving_categories)
ON CONFLICT (name, driving_categories) DO NOTHING;

-- 7. Füge Kriterien hinzu (nur wenn noch keine vorhanden sind)
INSERT INTO evaluation_criteria (category_id, name, description, display_order, is_required) 
SELECT 
    ec.id,
    tc.name,
    tc.description,
    tc.display_order,
    tc.is_required
FROM (
    VALUES 
        ('Vorschulung', 'Blicksystematik', 'Systematisches Schauen in alle Richtungen', 1, true),
        ('Vorschulung', 'Spiegel einstellen', 'Richtige Einstellung der Spiegel', 2, true),
        ('Vorschulung', 'Sitzposition', 'Optimale Sitzposition einnehmen', 3, false),
        ('Grundschulung', 'Anfahren', 'Sauberes Anfahren ohne Abwürgen', 1, true),
        ('Grundschulung', 'Schalten', 'Richtiges Schalten und Kuppeln', 2, true),
        ('Grundschulung', 'Bremsen', 'Sanftes und kontrolliertes Bremsen', 3, true),
        ('Manöver', 'Rückwärtsparkieren', 'Rückwärtsparkieren in Parklücke', 1, true),
        ('Manöver', 'Wenden', 'Sicheres Wenden in engen Straßen', 2, true),
        ('Manöver', 'Parallelparkieren', 'Parallelparkieren am Straßenrand', 3, false),
        ('Verkehrskunde', 'Verkehrszeichen', 'Verstehen und Befolgen von Verkehrszeichen', 1, true),
        ('Verkehrskunde', 'Vorfahrt', 'Richtige Vorfahrtsregeln anwenden', 2, true),
        ('Verkehrskunde', 'Geschwindigkeit', 'Angemessene Geschwindigkeit wählen', 3, true)
) AS tc(category_name, name, description, display_order, is_required)
JOIN evaluation_categories ec ON ec.name = tc.category_name AND 'A' = ANY(ec.driving_categories)
ON CONFLICT (category_id, name) DO NOTHING;

-- 8. Füge Motorrad-Kategorien hinzu (falls gewünscht)
INSERT INTO evaluation_categories (name, description, color, display_order, driving_categories) 
SELECT * FROM (VALUES
    ('Motorrad-Grundlagen', 'Grundlegende Motorradbedienung', '#DC2626', 1, ARRAY['B']),
    ('Motorrad-Manöver', 'Spezielle Motorradmanöver', '#EA580C', 2, ARRAY['B']),
    ('Motorrad-Verkehr', 'Motorradspezifische Verkehrsregeln', '#CA8A04', 3, ARRAY['B'])
) AS v(name, description, color, display_order, driving_categories)
ON CONFLICT (name, driving_categories) DO NOTHING;

-- 9. Erstelle oder aktualisiere den View
CREATE OR REPLACE VIEW v_evaluation_matrix AS
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

-- 10. Erstelle Trigger für updated_at (falls noch nicht vorhanden)
DO $$
BEGIN
    -- Prüfe ob der Trigger bereits existiert
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_evaluation_categories_updated_at'
    ) THEN
        CREATE TRIGGER update_evaluation_categories_updated_at 
            BEFORE UPDATE ON evaluation_categories 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_evaluation_criteria_updated_at'
    ) THEN
        CREATE TRIGGER update_evaluation_criteria_updated_at 
            BEFORE UPDATE ON evaluation_criteria 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 11. Status prüfen
SELECT 'evaluation_categories' as table_name, COUNT(*) as count FROM evaluation_categories
UNION ALL
SELECT 'evaluation_criteria' as table_name, COUNT(*) as count FROM evaluation_criteria
UNION ALL
SELECT 'evaluation_scale' as table_name, COUNT(*) as count FROM evaluation_scale;
