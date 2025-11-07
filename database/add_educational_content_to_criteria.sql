-- Erweitere evaluation_criteria Tabelle um educational_content Feld
-- Dieses Feld speichert zusätzlichen Lerninhalt (Text + Bilder) für Fahrschüler

-- 1. Füge educational_content JSONB Spalte hinzu
ALTER TABLE evaluation_criteria 
ADD COLUMN IF NOT EXISTS educational_content JSONB DEFAULT NULL;

-- 2. Erstelle Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_educational_content 
ON evaluation_criteria USING GIN(educational_content);

-- 3. Kommentar hinzufügen
COMMENT ON COLUMN evaluation_criteria.educational_content IS 'Zusätzlicher Lerninhalt für Fahrschüler: {title: string, sections: [{title: string, text: string, images: string[]}]}';

-- Beispiel-Struktur:
-- {
--   "title": "Haupttitel des Lerninhalts",
--   "sections": [
--     {
--       "title": "Titel des Abschnitts 1",
--       "text": "Textinhalt des Abschnitts...",
--       "images": ["https://storage.supabase.co/.../image1.jpg", "https://storage.supabase.co/.../image2.jpg"]
--     },
--     {
--       "title": "Titel des Abschnitts 2",
--       "text": "Textinhalt des Abschnitts...",
--       "images": ["https://storage.supabase.co/.../image3.jpg"]
--     }
--   ]
-- }

