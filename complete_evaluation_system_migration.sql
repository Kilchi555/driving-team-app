-- Vollständige Migration für das Bewertungssystem
-- Erstellt alle Tabellen, falls sie nicht existieren

-- 1. Bewertungskategorien (Bereiche wie "Vorschulung", "Grundschulung", etc.)
CREATE TABLE IF NOT EXISTS evaluation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,                    -- "Vorschulung", "Grundschulung", "Manöver"
  description TEXT,                            -- Optional: Beschreibung der Kategorie
  color VARCHAR(7) DEFAULT '#3B82F6',          -- Hex-Farbe für UI (z.B. "#3B82F6" für blau)
  display_order INTEGER NOT NULL DEFAULT 0,    -- Reihenfolge der Anzeige
  driving_categories TEXT[] DEFAULT ARRAY['A'], -- Array: ['A'], ['B'], ['A', 'B'] - für welche Fahrkategorien gilt
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bewertungskriterien (Themen innerhalb der Kategorien)
CREATE TABLE IF NOT EXISTS evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES evaluation_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,                   -- "Blicksystematik", "Rückwärtsparkieren", "Spiegel einstellen"
  description TEXT,                            -- Optional: Detaillierte Beschreibung
  display_order INTEGER NOT NULL DEFAULT 0,    -- Reihenfolge innerhalb der Kategorie
  is_required BOOLEAN DEFAULT false,           -- Muss dieses Kriterium bewertet werden?
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bewertungsskala (1-6, "Besprochen" bis "Prüfungsreif")
CREATE TABLE IF NOT EXISTS evaluation_scale (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating INTEGER NOT NULL,                     -- 1, 2, 3, 4, 5, 6
  label VARCHAR(100) NOT NULL,                 -- "Besprochen", "Geübt", "Ungenügend", etc.
  description TEXT,                            -- Optional: Beschreibung der Bewertung
  color VARCHAR(7) DEFAULT '#6B7280',          -- Hex-Farbe für UI
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Füge fehlende Spalten hinzu (falls Tabellen bereits existieren)
DO $$
BEGIN
    -- Füge driving_categories Spalte zu evaluation_categories hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_categories' 
        AND column_name = 'driving_categories'
    ) THEN
        ALTER TABLE evaluation_categories ADD COLUMN driving_categories TEXT[] DEFAULT ARRAY['A'];
        RAISE NOTICE 'Spalte driving_categories zu evaluation_categories hinzugefügt';
    END IF;

    -- Füge description Spalte zu evaluation_criteria hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_criteria' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE evaluation_criteria ADD COLUMN description TEXT;
        RAISE NOTICE 'Spalte description zu evaluation_criteria hinzugefügt';
    END IF;

    -- Füge is_required Spalte zu evaluation_criteria hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_criteria' 
        AND column_name = 'is_required'
    ) THEN
        ALTER TABLE evaluation_criteria ADD COLUMN is_required BOOLEAN DEFAULT false;
        RAISE NOTICE 'Spalte is_required zu evaluation_criteria hinzugefügt';
    END IF;

    -- Füge description Spalte zu evaluation_scale hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_scale' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE evaluation_scale ADD COLUMN description TEXT;
        RAISE NOTICE 'Spalte description zu evaluation_scale hinzugefügt';
    END IF;

    -- Füge color Spalte zu evaluation_scale hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_scale' 
        AND column_name = 'color'
    ) THEN
        ALTER TABLE evaluation_scale ADD COLUMN color VARCHAR(7) DEFAULT '#6B7280';
        RAISE NOTICE 'Spalte color zu evaluation_scale hinzugefügt';
    END IF;

    -- Füge is_active Spalte zu evaluation_scale hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_scale' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE evaluation_scale ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Spalte is_active zu evaluation_scale hinzugefügt';
    END IF;

    -- Füge updated_at Spalte zu evaluation_categories hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_categories' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE evaluation_categories ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Spalte updated_at zu evaluation_categories hinzugefügt';
    END IF;

    -- Füge updated_at Spalte zu evaluation_criteria hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_criteria' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE evaluation_criteria ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Spalte updated_at zu evaluation_criteria hinzugefügt';
    END IF;

END $$;

-- 5. Erstelle Unique Constraints (falls nicht vorhanden)
DO $$
BEGIN
    -- Unique constraint für evaluation_categories
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'evaluation_categories_name_driving_categories_key'
    ) THEN
        ALTER TABLE evaluation_categories ADD CONSTRAINT evaluation_categories_name_driving_categories_key 
        UNIQUE(name, driving_categories);
        RAISE NOTICE 'Unique constraint für evaluation_categories hinzugefügt';
    END IF;

    -- Unique constraint für evaluation_criteria
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'evaluation_criteria_category_id_name_key'
    ) THEN
        ALTER TABLE evaluation_criteria ADD CONSTRAINT evaluation_criteria_category_id_name_key 
        UNIQUE(category_id, name);
        RAISE NOTICE 'Unique constraint für evaluation_criteria hinzugefügt';
    END IF;

    -- Unique constraint für evaluation_scale
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'evaluation_scale_rating_key'
    ) THEN
        ALTER TABLE evaluation_scale ADD CONSTRAINT evaluation_scale_rating_key 
        UNIQUE(rating);
        RAISE NOTICE 'Unique constraint für evaluation_scale hinzugefügt';
    END IF;

END $$;

-- 6. Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_driving_categories ON evaluation_categories USING GIN(driving_categories);
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_display_order ON evaluation_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_category_id ON evaluation_criteria(category_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_display_order ON evaluation_criteria(display_order);
CREATE INDEX IF NOT EXISTS idx_evaluation_scale_rating ON evaluation_scale(rating);

-- 7. RLS Policies
ALTER TABLE evaluation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_scale ENABLE ROW LEVEL SECURITY;

-- Alle können lesen (für Bewertungen)
DROP POLICY IF EXISTS "Evaluation categories are viewable by everyone" ON evaluation_categories;
CREATE POLICY "Evaluation categories are viewable by everyone" ON evaluation_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Evaluation criteria are viewable by everyone" ON evaluation_criteria;
CREATE POLICY "Evaluation criteria are viewable by everyone" ON evaluation_criteria FOR SELECT USING (true);

DROP POLICY IF EXISTS "Evaluation scale is viewable by everyone" ON evaluation_scale;
CREATE POLICY "Evaluation scale is viewable by everyone" ON evaluation_scale FOR SELECT USING (true);

-- Nur Admins können bearbeiten
DROP POLICY IF EXISTS "Evaluation categories are manageable by admins" ON evaluation_categories;
CREATE POLICY "Evaluation categories are manageable by admins" ON evaluation_categories FOR ALL USING (auth.role() = 'admin');

DROP POLICY IF EXISTS "Evaluation criteria are manageable by admins" ON evaluation_criteria;
CREATE POLICY "Evaluation criteria are manageable by admins" ON evaluation_criteria FOR ALL USING (auth.role() = 'admin');

DROP POLICY IF EXISTS "Evaluation scale is manageable by admins" ON evaluation_scale;
CREATE POLICY "Evaluation scale is manageable by admins" ON evaluation_scale FOR ALL USING (auth.role() = 'admin');

-- 8. Beispieldaten einfügen (nur wenn noch keine Daten vorhanden sind)

-- Bewertungsskala (1-6)
INSERT INTO evaluation_scale (rating, label, description, color) VALUES
(1, 'Besprochen', 'Thema wurde besprochen', '#EF4444'),
(2, 'Geübt', 'Thema wurde geübt', '#F97316'),
(3, 'Ungenügend', 'Ungenügende Leistung', '#EAB308'),
(4, 'Genügend', 'Genügende Leistung', '#3B82F6'),
(5, 'Gut', 'Gute Leistung', '#10B981'),
(6, 'Prüfungsreif', 'Prüfungsreife Leistung', '#059669')
ON CONFLICT (rating) DO NOTHING;

-- Bewertungskategorien für Kategorie A
INSERT INTO evaluation_categories (name, description, color, display_order, driving_categories) VALUES
('Vorschulung', 'Grundlegende Fahrzeugbedienung und Verkehrsregeln', '#3B82F6', 1, ARRAY['A']),
('Grundschulung', 'Erste Fahrversuche und Grundmanöver', '#10B981', 2, ARRAY['A']),
('Manöver', 'Parkieren, Wenden und spezielle Manöver', '#F59E0B', 3, ARRAY['A']),
('Verkehrskunde', 'Verkehrsregeln und -zeichen', '#8B5CF6', 4, ARRAY['A'])
ON CONFLICT (name, driving_categories) DO NOTHING;

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
JOIN evaluation_categories ec ON ec.name = tc.category_name AND 'A' = ANY(ec.driving_categories)
ON CONFLICT (category_id, name) DO NOTHING;

-- Bewertungskategorien für Kategorie B (falls gewünscht)
INSERT INTO evaluation_categories (name, description, color, display_order, driving_categories) VALUES
('Motorrad-Grundlagen', 'Grundlegende Motorradbedienung', '#DC2626', 1, ARRAY['B']),
('Motorrad-Manöver', 'Spezielle Motorradmanöver', '#EA580C', 2, ARRAY['B']),
('Motorrad-Verkehr', 'Motorradspezifische Verkehrsregeln', '#CA8A04', 3, ARRAY['B'])
ON CONFLICT (name, driving_categories) DO NOTHING;

-- 9. Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_evaluation_categories_updated_at ON evaluation_categories;
DROP TRIGGER IF EXISTS update_evaluation_criteria_updated_at ON evaluation_criteria;

CREATE TRIGGER update_evaluation_categories_updated_at 
    BEFORE UPDATE ON evaluation_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluation_criteria_updated_at 
    BEFORE UPDATE ON evaluation_criteria 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. View für einfache Abfragen
DROP VIEW IF EXISTS v_evaluation_matrix;

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

-- 11. Status-Report
SELECT 
  'evaluation_categories' as table_name,
  COUNT(*) as record_count,
  array_agg(DISTINCT name) as categories
FROM evaluation_categories
UNION ALL
SELECT 
  'evaluation_criteria' as table_name,
  COUNT(*) as record_count,
  array_agg(DISTINCT name) as criteria
FROM evaluation_criteria
UNION ALL
SELECT 
  'evaluation_scale' as table_name,
  COUNT(*) as record_count,
  array_agg(DISTINCT rating::text) as ratings
FROM evaluation_scale;
