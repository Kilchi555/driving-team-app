-- Einfache Migration für das Bewertungssystem
-- Ohne komplexe DO-Blöcke

-- 1. Lösche bestehende Objekte
DROP VIEW IF EXISTS v_evaluation_matrix;
DROP TRIGGER IF EXISTS update_evaluation_criteria_updated_at ON evaluation_criteria;
DROP TRIGGER IF EXISTS update_evaluation_categories_updated_at ON evaluation_categories;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS evaluation_criteria CASCADE;
DROP TABLE IF EXISTS evaluation_categories CASCADE;
DROP TABLE IF EXISTS evaluation_scale CASCADE;

-- 2. Erstelle evaluation_categories Tabelle
CREATE TABLE evaluation_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    display_order INTEGER NOT NULL DEFAULT 0,
    driving_categories TEXT[] DEFAULT ARRAY['A'],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, driving_categories)
);

-- 3. Erstelle evaluation_scale Tabelle
CREATE TABLE evaluation_scale (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rating INTEGER NOT NULL,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rating)
);

-- 4. Erstelle evaluation_criteria Tabelle
CREATE TABLE evaluation_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES evaluation_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- 5. Erstelle Indizes
CREATE INDEX idx_evaluation_categories_driving_categories ON evaluation_categories USING GIN(driving_categories);
CREATE INDEX idx_evaluation_categories_display_order ON evaluation_categories(display_order);
CREATE INDEX idx_evaluation_criteria_category_id ON evaluation_criteria(category_id);
CREATE INDEX idx_evaluation_criteria_display_order ON evaluation_criteria(display_order);
CREATE INDEX idx_evaluation_scale_rating ON evaluation_scale(rating);

-- 6. Aktiviere RLS
ALTER TABLE evaluation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_scale ENABLE ROW LEVEL SECURITY;

-- 7. Erstelle RLS Policies
CREATE POLICY "Evaluation categories are viewable by everyone" ON evaluation_categories FOR SELECT USING (true);
CREATE POLICY "Evaluation criteria are viewable by everyone" ON evaluation_criteria FOR SELECT USING (true);
CREATE POLICY "Evaluation scale is viewable by everyone" ON evaluation_scale FOR SELECT USING (true);

CREATE POLICY "Evaluation categories are manageable by admins" ON evaluation_categories FOR ALL USING (auth.role() = 'admin');
CREATE POLICY "Evaluation criteria are manageable by admins" ON evaluation_criteria FOR ALL USING (auth.role() = 'admin');
CREATE POLICY "Evaluation scale is manageable by admins" ON evaluation_scale FOR ALL USING (auth.role() = 'admin');

-- 8. Füge Beispieldaten hinzu

-- Bewertungsskala (1-6)
INSERT INTO evaluation_scale (rating, label, description, color) VALUES
(1, 'Besprochen', 'Thema wurde besprochen', '#EF4444'),
(2, 'Geübt', 'Thema wurde geübt', '#F97316'),
(3, 'Ungenügend', 'Ungenügende Leistung', '#EAB308'),
(4, 'Genügend', 'Genügende Leistung', '#3B82F6'),
(5, 'Gut', 'Gute Leistung', '#10B981'),
(6, 'Prüfungsreif', 'Prüfungsreife Leistung', '#059669');

-- Bewertungskategorien für Kategorie A
INSERT INTO evaluation_categories (name, description, color, display_order, driving_categories) VALUES
('Vorschulung', 'Grundlegende Fahrzeugbedienung und Verkehrsregeln', '#3B82F6', 1, ARRAY['A']),
('Grundschulung', 'Erste Fahrversuche und Grundmanöver', '#10B981', 2, ARRAY['A']),
('Manöver', 'Parkieren, Wenden und spezielle Manöver', '#F59E0B', 3, ARRAY['A']),
('Verkehrskunde', 'Verkehrsregeln und -zeichen', '#8B5CF6', 4, ARRAY['A']);

-- Bewertungskriterien für Kategorie A
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
JOIN evaluation_categories ec ON ec.name = tc.category_name AND 'A' = ANY(ec.driving_categories);

-- Bewertungskategorien für Kategorie B
INSERT INTO evaluation_categories (name, description, color, display_order, driving_categories) VALUES
('Motorrad-Grundlagen', 'Grundlegende Motorradbedienung', '#DC2626', 1, ARRAY['B']),
('Motorrad-Manöver', 'Spezielle Motorradmanöver', '#EA580C', 2, ARRAY['B']),
('Motorrad-Verkehr', 'Motorradspezifische Verkehrsregeln', '#CA8A04', 3, ARRAY['B']);

-- 9. Erstelle Trigger-Funktion
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Erstelle Trigger
CREATE TRIGGER update_evaluation_categories_updated_at 
    BEFORE UPDATE ON evaluation_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluation_criteria_updated_at 
    BEFORE UPDATE ON evaluation_criteria 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Erstelle View
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

-- 12. Status-Report
SELECT 
    'evaluation_categories' as table_name,
    COUNT(*) as record_count,
    array_agg(DISTINCT name) as items
FROM evaluation_categories
UNION ALL
SELECT 
    'evaluation_criteria' as table_name,
    COUNT(*) as record_count,
    array_agg(DISTINCT name) as items
FROM evaluation_criteria
UNION ALL
SELECT 
    'evaluation_scale' as table_name,
    COUNT(*) as record_count,
    array_agg(DISTINCT rating::text) as items
FROM evaluation_scale;
