-- Erweiterte Tenant-Branding-System Migration
-- Fügt umfassende Branding-Optionen für Multi-Tenant-System hinzu
-- Erstellt: 2024-12-19

-- 1. Erweitere Tenants-Tabelle um erweiterte Branding-Optionen
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

-- 2. Standardwerte für bestehende Tenants setzen (nur neue Spalten)
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

-- 3. Neue Tenant-Branding-Templates Tabelle
CREATE TABLE IF NOT EXISTS tenant_branding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Template-Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'business', -- 'business', 'creative', 'minimal', 'bold'
  
  -- Template-Branding (gleiche Struktur wie tenants)
  primary_color VARCHAR(7) NOT NULL,
  secondary_color VARCHAR(7) NOT NULL,
  accent_color VARCHAR(7) NOT NULL,
  success_color VARCHAR(7) NOT NULL,
  warning_color VARCHAR(7) NOT NULL,
  error_color VARCHAR(7) NOT NULL,
  info_color VARCHAR(7) NOT NULL,
  background_color VARCHAR(7) NOT NULL,
  surface_color VARCHAR(7) NOT NULL,
  text_color VARCHAR(7) NOT NULL,
  text_secondary_color VARCHAR(7) NOT NULL,
  
  font_family VARCHAR(100) NOT NULL,
  heading_font_family VARCHAR(100) NOT NULL,
  font_size_base INTEGER DEFAULT 16,
  border_radius INTEGER DEFAULT 8,
  spacing_unit INTEGER DEFAULT 4,
  
  -- Template-Status
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false, -- Nur für Premium-Tenants verfügbar
  display_order INTEGER DEFAULT 0,
  
  -- Preview-Bild
  preview_image_url TEXT
);

-- 4. Standard-Branding-Templates einfügen
INSERT INTO tenant_branding_templates (
  name, description, category,
  primary_color, secondary_color, accent_color,
  success_color, warning_color, error_color, info_color,
  background_color, surface_color, text_color, text_secondary_color,
  font_family, heading_font_family, is_active, display_order
) VALUES 
-- Business Professional (Standard)
('Business Professional', 'Professionelles blaues Design für Fahrschulen', 'business',
 '#1E40AF', '#64748B', '#3B82F6',
 '#10B981', '#F59E0B', '#EF4444', '#06B6D4',
 '#FFFFFF', '#F8FAFC', '#1F2937', '#6B7280',
 'Inter, system-ui, sans-serif', 'Inter, system-ui, sans-serif', true, 1),

-- Modern Green
('Modern Green', 'Modernes grünes Design für umweltbewusste Fahrschulen', 'business',
 '#059669', '#374151', '#10B981',
 '#10B981', '#F59E0B', '#EF4444', '#06B6D4',
 '#FFFFFF', '#F0FDF4', '#111827', '#6B7280',
 'Inter, system-ui, sans-serif', 'Inter, system-ui, sans-serif', true, 2),

-- Elegant Purple
('Elegant Purple', 'Elegantes violettes Design für Premium-Fahrschulen', 'creative',
 '#7C3AED', '#6B7280', '#8B5CF6',
 '#10B981', '#F59E0B', '#EF4444', '#06B6D4',
 '#FFFFFF', '#FAF5FF', '#1F2937', '#6B7280',
 'Inter, system-ui, sans-serif', 'Inter, system-ui, sans-serif', true, 3),

-- Bold Orange
('Bold Orange', 'Auffälliges oranges Design für dynamische Fahrschulen', 'bold',
 '#EA580C', '#525252', '#F97316',
 '#10B981', '#F59E0B', '#EF4444', '#06B6D4',
 '#FFFFFF', '#FFF7ED', '#1F2937', '#6B7280',
 'Inter, system-ui, sans-serif', 'Inter, system-ui, sans-serif', true, 4),

-- Minimal Dark
('Minimal Dark', 'Minimalistisches dunkles Design', 'minimal',
 '#3B82F6', '#E5E7EB', '#60A5FA',
 '#10B981', '#F59E0B', '#EF4444', '#06B6D4',
 '#111827', '#1F2937', '#F9FAFB', '#D1D5DB',
 'Inter, system-ui, sans-serif', 'Inter, system-ui, sans-serif', true, 5);

-- 5. Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_tenants_branding ON tenants(primary_color, secondary_color);
CREATE INDEX IF NOT EXISTS idx_tenant_branding_templates_category ON tenant_branding_templates(category);
CREATE INDEX IF NOT EXISTS idx_tenant_branding_templates_active ON tenant_branding_templates(is_active);

-- 6. Update-Trigger für tenant_branding_templates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tenant_branding_templates_updated_at'
  ) THEN
    CREATE TRIGGER trg_tenant_branding_templates_updated_at
      BEFORE UPDATE ON tenant_branding_templates
      FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;

-- 7. RLS für tenant_branding_templates
ALTER TABLE tenant_branding_templates ENABLE ROW LEVEL SECURITY;

-- Alle können Templates sehen (für Auswahl)
CREATE POLICY tenant_branding_templates_read ON tenant_branding_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Nur Admins können Templates verwalten
CREATE POLICY tenant_branding_templates_admin ON tenant_branding_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'tenant_admin')
    )
  );

-- 8. Bestätigung der Änderungen
SELECT 
  '=== TENANT BRANDING SYSTEM UPDATE ===' as title,
  '' as separator1,
  'Neue Branding-Spalten hinzugefügt:' as info,
  '✅ Erweiterte Farbpalette (9 Farben)' as colors,
  '✅ Typografie-Einstellungen' as typography,
  '✅ Layout-Einstellungen' as layout,
  '✅ Custom CSS/JS Support' as custom,
  '✅ Social Media Links' as social,
  '✅ SEO Meta-Daten' as seo,
  '' as separator2,
  'Neue Tabellen:' as tables_title,
  '✅ tenant_branding_templates (5 Standard-Templates)' as templates,
  '' as separator3,
  'Verwendung:' as usage_title,
  '• Admin: /admin/tenant-branding' as usage_admin,
  '• API: useTenantBranding() composable' as usage_api;

-- 9. Zeige aktuellen Tenant-Branding-Status (defensive Abfrage)
DO $$ 
DECLARE
  has_logo_url BOOLEAN;
  has_logo_wide_url BOOLEAN;
  has_font_family BOOLEAN;
  has_default_theme BOOLEAN;
BEGIN
  -- Prüfe welche Spalten existieren
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'logo_url'
  ) INTO has_logo_url;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'logo_wide_url'
  ) INTO has_logo_wide_url;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'font_family'
  ) INTO has_font_family;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'default_theme'
  ) INTO has_default_theme;
  
  -- Zeige Status nur wenn Tabelle und Grundspalten existieren
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
    RAISE NOTICE '=== TENANT BRANDING STATUS ===';
    RAISE NOTICE 'Logo URL column exists: %', has_logo_url;
    RAISE NOTICE 'Logo Wide URL column exists: %', has_logo_wide_url;
    RAISE NOTICE 'Font Family column exists: %', has_font_family;
    RAISE NOTICE 'Default Theme column exists: %', has_default_theme;
    RAISE NOTICE '';
    RAISE NOTICE 'To see detailed tenant status, run:';
    RAISE NOTICE 'SELECT name, slug, primary_color, secondary_color FROM tenants WHERE is_active = true;';
  ELSE
    RAISE NOTICE 'Tenants table does not exist yet. Please run database_migration_tenants.sql first.';
  END IF;
END $$;

-- 10. Zeige verfügbare Branding-Templates (defensive Abfrage)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_branding_templates') THEN
    RAISE NOTICE '';
    RAISE NOTICE '=== AVAILABLE BRANDING TEMPLATES ===';
    PERFORM name, category, primary_color, secondary_color, font_family, is_premium
    FROM tenant_branding_templates 
    WHERE is_active = true
    ORDER BY display_order;
  ELSE
    RAISE NOTICE 'Branding templates will be available after running this migration.';
  END IF;
END $$;
