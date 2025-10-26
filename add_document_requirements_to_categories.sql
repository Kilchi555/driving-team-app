-- Erweitere die categories Tabelle um Dokumentenanforderungen
-- Jede Kategorie kann ihre eigenen Dokumentenanforderungen definieren

-- 1. Füge JSONB-Spalte für Dokumentenanforderungen hinzu
ALTER TABLE public.categories 
ADD COLUMN document_requirements JSONB DEFAULT '{}';

-- 2. Definiere Standard-Dokumentenanforderungen für jede Kategorie
UPDATE public.categories 
SET document_requirements = CASE 
  WHEN code = 'B' THEN '{
    "required": [
      {
        "id": "lernfahrausweis_b",
        "title": "Lernfahrausweis Kategorie B",
        "description": "Lernfahrausweis für Personenwagen",
        "icon": "📄",
        "field_prefix": "lernfahrausweis",
        "storage_prefix": "lernfahrausweise",
        "requires_both_sides": true,
        "when_required": "always"
      }
    ],
    "optional": [
      {
        "id": "fuehrerschein",
        "title": "Führerschein",
        "description": "Führerschein nach bestandener Prüfung",
        "icon": "🪪",
        "field_prefix": "fuehrerschein",
        "storage_prefix": "fuehrerschein",
        "requires_both_sides": true,
        "when_required": "after_exam"
      }
    ]
  }'::jsonb
  
  WHEN code = 'A' OR code = 'A1' OR code = 'A35kW' THEN '{
    "required": [
      {
        "id": "lernfahrausweis_a",
        "title": "Lernfahrausweis Kategorie A",
        "description": "Lernfahrausweis für Motorräder",
        "icon": "📄",
        "field_prefix": "lernfahrausweis_a",
        "storage_prefix": "lernfahrausweise",
        "requires_both_sides": true,
        "when_required": "always"
      }
    ],
    "optional": [
      {
        "id": "fuehrerschein",
        "title": "Führerschein",
        "description": "Führerschein nach bestandener Prüfung",
        "icon": "🪪",
        "field_prefix": "fuehrerschein",
        "storage_prefix": "fuehrerschein",
        "requires_both_sides": true,
        "when_required": "after_exam"
      }
    ]
  }'::jsonb
  
  WHEN code = 'BE' THEN '{
    "required": [
      {
        "id": "lernfahrausweis_be",
        "title": "Lernfahrausweis Kategorie BE",
        "description": "Lernfahrausweis für Anhänger",
        "icon": "📄",
        "field_prefix": "lernfahrausweis_be",
        "storage_prefix": "lernfahrausweise",
        "requires_both_sides": true,
        "when_required": "always"
      },
      {
        "id": "fuehrerschein_b",
        "title": "Führerschein Kategorie B",
        "description": "Bestehender B-Führerschein (Voraussetzung für BE)",
        "icon": "🪪",
        "field_prefix": "fuehrerschein",
        "storage_prefix": "fuehrerschein",
        "requires_both_sides": true,
        "when_required": "always"
      }
    ],
    "optional": []
  }'::jsonb
  
  WHEN code = 'C' OR code = 'C1' THEN '{
    "required": [
      {
        "id": "fuehrerschein_b",
        "title": "Führerschein Kategorie B",
        "description": "Bestehender B-Führerschein (Voraussetzung für C)",
        "icon": "🪪",
        "field_prefix": "fuehrerschein",
        "storage_prefix": "fuehrerschein",
        "requires_both_sides": true,
        "when_required": "always"
      }
    ],
    "optional": [
      {
        "id": "fuehrerschein_c",
        "title": "Führerschein Kategorie C",
        "description": "Führerschein nach bestandener C-Prüfung",
        "icon": "🪪",
        "field_prefix": "fuehrerschein_c",
        "storage_prefix": "fuehrerschein",
        "requires_both_sides": true,
        "when_required": "after_exam"
      }
    ]
  }'::jsonb
  
  WHEN code = 'D' OR code = 'D1' THEN '{
    "required": [
      {
        "id": "fuehrerschein_b",
        "title": "Führerschein Kategorie B",
        "description": "Bestehender B-Führerschein (Voraussetzung für D)",
        "icon": "🪪",
        "field_prefix": "fuehrerschein",
        "storage_prefix": "fuehrerschein",
        "requires_both_sides": true,
        "when_required": "always"
      }
    ],
    "optional": [
      {
        "id": "fuehrerschein_d",
        "title": "Führerschein Kategorie D",
        "description": "Führerschein nach bestandener D-Prüfung",
        "icon": "🪪",
        "field_prefix": "fuehrerschein_d",
        "storage_prefix": "fuehrerschein",
        "requires_both_sides": true,
        "when_required": "after_exam"
      }
    ]
  }'::jsonb
  
  WHEN code = 'CE' THEN '{
    "required": [
      {
        "id": "fuehrerschein_c",
        "title": "Führerschein Kategorie C",
        "description": "Bestehender C-Führerschein (Voraussetzung für CE)",
        "icon": "🪪",
        "field_prefix": "fuehrerschein_c",
        "storage_prefix": "fuehrerschein",
        "requires_both_sides": true,
        "when_required": "always"
      }
    ],
    "optional": [
      {
        "id": "fuehrerschein_ce",
        "title": "Führerschein Kategorie CE",
        "description": "Führerschein nach bestandener CE-Prüfung",
        "icon": "🪪",
        "field_prefix": "fuehrerschein_ce",
        "storage_prefix": "fuehrerschein",
        "requires_both_sides": true,
        "when_required": "after_exam"
      }
    ]
  }'::jsonb
  
  ELSE '{
    "required": [],
    "optional": [
      {
        "id": "fuehrerschein",
        "title": "Führerschein",
        "description": "Führerschein für diese Kategorie",
        "icon": "🪪",
        "field_prefix": "fuehrerschein",
        "storage_prefix": "fuehrerschein",
        "requires_both_sides": true,
        "when_required": "after_exam"
      }
    ]
  }'::jsonb
END;

-- 3. Setze Default-Wert für neue Kategorien
ALTER TABLE public.categories 
ALTER COLUMN document_requirements SET DEFAULT '{
  "required": [],
  "optional": [
    {
      "id": "fuehrerschein",
      "title": "Führerschein",
      "description": "Führerschein für diese Kategorie",
      "icon": "🪪",
      "field_prefix": "fuehrerschein",
      "storage_prefix": "fuehrerschein",
      "requires_both_sides": true,
      "when_required": "after_exam"
    }
  ]
}';

-- 4. Kommentar hinzufügen
COMMENT ON COLUMN public.categories.document_requirements IS 'JSONB structure defining required and optional documents for this category. Structure: {"required": [...], "optional": [...]} where each document has id, title, description, icon, field_prefix, storage_prefix, requires_both_sides, when_required';

-- 5. Verifiziere die Änderungen
SELECT code, name, 
  jsonb_pretty(document_requirements) as document_requirements_pretty
FROM public.categories 
WHERE is_active = true
ORDER BY code;



















