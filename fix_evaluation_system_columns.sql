-- Korrektur der fehlenden Spalten im Bewertungssystem
-- Führe diesen Script aus, falls die Tabellen bereits existieren

-- 1. Prüfe ob die Tabellen existieren
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
    ELSE
        RAISE NOTICE 'Spalte driving_categories existiert bereits in evaluation_categories';
    END IF;

    -- Füge description Spalte zu evaluation_criteria hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_criteria' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE evaluation_criteria ADD COLUMN description TEXT;
        RAISE NOTICE 'Spalte description zu evaluation_criteria hinzugefügt';
    ELSE
        RAISE NOTICE 'Spalte description existiert bereits in evaluation_criteria';
    END IF;

    -- Füge is_required Spalte zu evaluation_criteria hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_criteria' 
        AND column_name = 'is_required'
    ) THEN
        ALTER TABLE evaluation_criteria ADD COLUMN is_required BOOLEAN DEFAULT false;
        RAISE NOTICE 'Spalte is_required zu evaluation_criteria hinzugefügt';
    ELSE
        RAISE NOTICE 'Spalte is_required existiert bereits in evaluation_criteria';
    END IF;

    -- Füge description Spalte zu evaluation_scale hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_scale' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE evaluation_scale ADD COLUMN description TEXT;
        RAISE NOTICE 'Spalte description zu evaluation_scale hinzugefügt';
    ELSE
        RAISE NOTICE 'Spalte description existiert bereits in evaluation_scale';
    END IF;

    -- Füge color Spalte zu evaluation_scale hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_scale' 
        AND column_name = 'color'
    ) THEN
        ALTER TABLE evaluation_scale ADD COLUMN color VARCHAR(7) DEFAULT '#6B7280';
        RAISE NOTICE 'Spalte color zu evaluation_scale hinzugefügt';
    ELSE
        RAISE NOTICE 'Spalte color existiert bereits in evaluation_scale';
    END IF;

    -- Füge is_active Spalte zu evaluation_scale hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_scale' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE evaluation_scale ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Spalte is_active zu evaluation_scale hinzugefügt';
    ELSE
        RAISE NOTICE 'Spalte is_active existiert bereits in evaluation_scale';
    END IF;

    -- Füge updated_at Spalte zu evaluation_categories hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_categories' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE evaluation_categories ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Spalte updated_at zu evaluation_categories hinzugefügt';
    ELSE
        RAISE NOTICE 'Spalte updated_at existiert bereits in evaluation_categories';
    END IF;

    -- Füge updated_at Spalte zu evaluation_criteria hinzu (falls nicht vorhanden)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluation_criteria' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE evaluation_criteria ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Spalte updated_at zu evaluation_criteria hinzugefügt';
    ELSE
        RAISE NOTICE 'Spalte updated_at existiert bereits in evaluation_criteria';
    END IF;

END $$;

-- 2. Aktualisiere bestehende Einträge mit Standardwerten
UPDATE evaluation_categories 
SET driving_categories = ARRAY['A'] 
WHERE driving_categories IS NULL OR array_length(driving_categories, 1) IS NULL;

UPDATE evaluation_criteria 
SET description = COALESCE(description, 'Keine Beschreibung verfügbar'),
    is_required = COALESCE(is_required, false)
WHERE description IS NULL OR is_required IS NULL;

UPDATE evaluation_scale 
SET description = COALESCE(description, 'Keine Beschreibung verfügbar'),
    color = COALESCE(color, '#6B7280'),
    is_active = COALESCE(is_active, true)
WHERE description IS NULL OR color IS NULL OR is_active IS NULL;

-- 3. Erstelle die fehlenden Indizes (falls nicht vorhanden)
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_driving_categories ON evaluation_categories USING GIN(driving_categories);
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_display_order ON evaluation_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_category_id ON evaluation_criteria(category_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_display_order ON evaluation_criteria(display_order);
CREATE INDEX IF NOT EXISTS idx_evaluation_scale_rating ON evaluation_scale(rating);

-- 4. Erstelle oder aktualisiere den View
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

-- 5. Erstelle die Trigger-Funktion (falls nicht vorhanden)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Erstelle die Trigger (falls nicht vorhanden)
DROP TRIGGER IF EXISTS update_evaluation_categories_updated_at ON evaluation_categories;
DROP TRIGGER IF EXISTS update_evaluation_criteria_updated_at ON evaluation_criteria;

CREATE TRIGGER update_evaluation_categories_updated_at 
    BEFORE UPDATE ON evaluation_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluation_criteria_updated_at 
    BEFORE UPDATE ON evaluation_criteria 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Aktualisiere bestehende Einträge mit Standardwerten für driving_categories
-- Falls du bereits Daten in den Tabellen hast, setze sie auf Standardwerte
UPDATE evaluation_categories 
SET driving_categories = ARRAY['A'] 
WHERE name IN ('Vorschulung', 'Grundschulung', 'Manöver', 'Verkehrskunde')
AND (driving_categories IS NULL OR array_length(driving_categories, 1) IS NULL);

-- 8. Zeige den aktuellen Status
SELECT 
  'evaluation_categories' as table_name,
  COUNT(*) as record_count,
  array_agg(DISTINCT name) as categories
FROM evaluation_categories
UNION ALL
SELECT 
  'evaluation_criteria' as table_name,
  COUNT(*) as record_count,
  array_agg(DISTINCT name) as categories
FROM evaluation_criteria
UNION ALL
SELECT 
  'evaluation_scale' as table_name,
  COUNT(*) as record_count,
  array_agg(DISTINCT rating::text) as categories
FROM evaluation_scale;
