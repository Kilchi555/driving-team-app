-- Vereinfachtes Tenant-Branding-System
-- Nur individuelle Anpassungen, keine Templates
-- Erstellt: 2024-12-19

-- 1. Erweitere Tenants-Tabelle um Branding-Optionen
ALTER TABLE tenants 
-- Logo-Varianten (logo_square_url und logo_wide_url bereits vorhanden)
ADD COLUMN IF NOT EXISTS logo_url TEXT,        -- Standard-Logo (für Kompatibilität)
ADD COLUMN IF NOT EXISTS logo_dark_url TEXT,   -- Dunkles Logo für Dark Mode
ADD COLUMN IF NOT EXISTS favicon_url TEXT,     -- Custom Favicon

-- Erweiterte Farbpalette
ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7),        -- Akzentfarbe für Buttons, Links
ADD COLUMN IF NOT EXISTS success_color VARCHAR(7),       -- Erfolgs-Farbe (grün)
ADD COLUMN IF NOT EXISTS warning_color VARCHAR(7),       -- Warn-Farbe (orange/gelb)
ADD COLUMN IF NOT EXISTS error_color VARCHAR(7),         -- Fehler-Farbe (rot)
ADD COLUMN IF NOT EXISTS info_color VARCHAR(7),          -- Info-Farbe (blau)
ADD COLUMN IF NOT EXISTS background_color VARCHAR(7),    -- Hintergrundfarbe
ADD COLUMN IF NOT EXISTS surface_color VARCHAR(7),       -- Oberflächenfarbe (Cards, etc.)
ADD COLUMN IF NOT EXISTS text_color VARCHAR(7),          -- Haupttextfarbe
ADD COLUMN IF NOT EXISTS text_secondary_color VARCHAR(7), -- Sekundäre Textfarbe

-- Typografie
ADD COLUMN IF NOT EXISTS font_family VARCHAR(100),       -- Hauptschrift (z.B. "Inter", "Roboto")
ADD COLUMN IF NOT EXISTS heading_font_family VARCHAR(100), -- Überschriftenschrift
ADD COLUMN IF NOT EXISTS font_size_base INTEGER DEFAULT 16, -- Basis-Schriftgröße in px

-- Layout & Spacing
ADD COLUMN IF NOT EXISTS border_radius INTEGER DEFAULT 8, -- Standard Border-Radius in px
ADD COLUMN IF NOT EXISTS spacing_unit INTEGER DEFAULT 4,  -- Basis-Spacing-Einheit in px

-- Custom CSS
ADD COLUMN IF NOT EXISTS custom_css TEXT,                -- Custom CSS für erweiterte Anpassungen
ADD COLUMN IF NOT EXISTS custom_js TEXT,                 -- Custom JavaScript (optional)

-- Theme-Modus
ADD COLUMN IF NOT EXISTS default_theme VARCHAR(10) DEFAULT 'light', -- 'light', 'dark', 'auto'
ADD COLUMN IF NOT EXISTS allow_theme_switch BOOLEAN DEFAULT true,    -- Benutzer darf Theme wechseln

-- Branding-Metadaten
ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255),        -- Markenname (falls anders als tenant name)
ADD COLUMN IF NOT EXISTS brand_tagline VARCHAR(500),     -- Marken-Slogan
ADD COLUMN IF NOT EXISTS brand_description TEXT,         -- Markenbeschreibung

-- Social Media & SEO
ADD COLUMN IF NOT EXISTS website_url TEXT,               -- Haupt-Website
ADD COLUMN IF NOT EXISTS social_facebook TEXT,           -- Facebook URL
ADD COLUMN IF NOT EXISTS social_instagram TEXT,          -- Instagram URL
ADD COLUMN IF NOT EXISTS social_linkedin TEXT,           -- LinkedIn URL
ADD COLUMN IF NOT EXISTS social_twitter TEXT,            -- Twitter/X URL
ADD COLUMN IF NOT EXISTS meta_description TEXT,          -- SEO Meta Description
ADD COLUMN IF NOT EXISTS meta_keywords TEXT[];           -- SEO Keywords Array

-- 2. Standardwerte für bestehende Tenants setzen
UPDATE tenants 
SET 
  -- Standard-Farbpalette (neue Spalten)
  accent_color = COALESCE(accent_color, '#3B82F6'),                -- Heller Blau
  success_color = COALESCE(success_color, '#10B981'),              -- Grün
  warning_color = COALESCE(warning_color, '#F59E0B'),              -- Orange
  error_color = COALESCE(error_color, '#EF4444'),                  -- Rot
  info_color = COALESCE(info_color, '#06B6D4'),                    -- Cyan
  background_color = COALESCE(background_color, '#FFFFFF'),        -- Weiß
  surface_color = COALESCE(surface_color, '#F8FAFC'),              -- Helles Grau
  text_color = COALESCE(text_color, '#1F2937'),                    -- Dunkelgrau
  text_secondary_color = COALESCE(text_secondary_color, '#6B7280'), -- Mittelgrau
  
  -- Standard-Typografie
  font_family = COALESCE(font_family, 'Inter, system-ui, sans-serif'),
  heading_font_family = COALESCE(heading_font_family, 'Inter, system-ui, sans-serif'),
  font_size_base = COALESCE(font_size_base, 16),
  
  -- Standard-Layout
  border_radius = COALESCE(border_radius, 8),
  spacing_unit = COALESCE(spacing_unit, 4),
  
  -- Standard-Theme
  default_theme = COALESCE(default_theme, 'light'),
  allow_theme_switch = COALESCE(allow_theme_switch, true),
  
  -- Bestehende Farben als Fallback verwenden
  primary_color = COALESCE(primary_color, '#1E40AF'),              -- Blau
  secondary_color = COALESCE(secondary_color, '#64748B')           -- Grau
WHERE 
  accent_color IS NULL 
  OR success_color IS NULL 
  OR font_family IS NULL;

-- 3. Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_tenants_branding ON tenants(primary_color, secondary_color);

-- 4. Bestätigung der Änderungen
SELECT 
  '=== SIMPLIFIED TENANT BRANDING SYSTEM ===' as title,
  '' as separator1,
  'Neue Branding-Spalten hinzugefügt:' as info,
  '✅ Erweiterte Farbpalette (9 Farben)' as colors,
  '✅ Typografie-Einstellungen' as typography,
  '✅ Layout-Einstellungen' as layout,
  '✅ Custom CSS/JS Support' as custom,
  '✅ Social Media Links' as social,
  '✅ SEO Meta-Daten' as seo,
  '' as separator2,
  'Vereinfachungen:' as simplifications,
  '❌ Komplexe Templates entfernt' as no_templates,
  '✅ Einfache Farb-Presets im Admin' as simple_presets,
  '✅ Individuelle Anpassungen im Fokus' as individual,
  '' as separator3,
  'Verwendung:' as usage_title,
  '• Admin: /admin/tenant-branding' as usage_admin,
  '• API: useTenantBranding() composable' as usage_api;

-- 5. Zeige aktuellen Tenant-Status
SELECT 
  name,
  slug,
  CASE 
    WHEN primary_color IS NOT NULL THEN primary_color 
    ELSE 'Nicht gesetzt' 
  END as primary_color,
  CASE 
    WHEN font_family IS NOT NULL THEN font_family 
    ELSE 'Standard' 
  END as font_family,
  default_theme
FROM tenants 
WHERE is_active = true
ORDER BY name;





















