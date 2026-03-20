-- =============================================================================
-- Nur Farben setzen: exakt die Codes, die früher im Kalender hardcodiert waren.
--
-- • Es werden KEINE neuen Kategorien angelegt.
-- • Andere Codes (z. B. „B Schaltung“, „B Automatik“, …) bleiben unverändert.
-- • Mehrere Zeilen mit demselben code (z. B. zwei „A“ oder zwei „C“) erhalten
--   alle dieselbe Legacy-Farbe.
--
-- Ausführen z. B. im Supabase SQL Editor.
-- Optional: nur einen Mandanten — WHERE am UPDATE ergänzen:
--   AND tenant_id = '64259d68-195a-4c68-8875-f1b44d962830'::uuid
-- =============================================================================

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS color VARCHAR(7);

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.categories AS c
SET
  color = CASE trim(c.code)
    WHEN 'B' THEN '#10b981'
    WHEN 'A' THEN '#f59e0b'
    WHEN 'A1' THEN '#f59e0b'
    WHEN 'A35kW' THEN '#f59e0b'
    WHEN 'BE' THEN '#3b82f6'
    WHEN 'C' THEN '#8b5cf6'
    WHEN 'C1' THEN '#8b5cf6'
    WHEN 'CE' THEN '#ef4444'
    WHEN 'D' THEN '#06b6d4'
    WHEN 'D1' THEN '#06b6d4'
    WHEN 'Motorboot' THEN '#1d4ed8'
    WHEN 'Boot' THEN '#1d4ed8'
    WHEN 'BPT' THEN '#10b981'
    WHEN 'C1/D1' THEN '#8b5cf6'
    WHEN 'C1D1' THEN '#8b5cf6'
    ELSE c.color
  END,
  updated_at = now()
WHERE trim(c.code) IN (
  'B', 'A', 'A1', 'A35kW', 'BE', 'C', 'C1', 'CE', 'D', 'D1',
  'Motorboot', 'Boot', 'BPT', 'C1/D1', 'C1D1'
);

-- Kontrolle
SELECT id, tenant_id, code, name, color
FROM public.categories
WHERE trim(code) IN (
  'B', 'A', 'A1', 'A35kW', 'BE', 'C', 'C1', 'CE', 'D', 'D1',
  'Motorboot', 'Boot', 'BPT', 'C1/D1', 'C1D1'
)
ORDER BY tenant_id NULLS FIRST, code, id;
