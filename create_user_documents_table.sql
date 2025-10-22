-- Erstelle user_documents Tabelle für saubere Dokumentenverwaltung
-- Jedes Dokument wird als separater Eintrag gespeichert

CREATE TABLE IF NOT EXISTS public.user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Dokumenttyp und Kategoriezuordnung
  document_type VARCHAR(100) NOT NULL, -- 'lernfahrausweis', 'fuehrerschein', 'ausweis', etc.
  category_code VARCHAR(10), -- 'B', 'A', 'BE', etc. (optional, für kategoriespezifische Dokumente)
  
  -- Dokumentseite (für zweiseitige Dokumente)
  side VARCHAR(10) NOT NULL DEFAULT 'front', -- 'front', 'back'
  
  -- Dateiinformationen
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(50) NOT NULL, -- 'image/jpeg', 'image/png', 'application/pdf'
  storage_path TEXT NOT NULL, -- Pfad im Supabase Storage
  
  -- Metadaten
  title VARCHAR(255), -- Benutzerfreundlicher Titel
  description TEXT, -- Optionale Beschreibung
  
  -- Status und Validierung
  is_verified BOOLEAN DEFAULT false, -- Von Admin/Staff verifiziert
  verification_date TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES public.users(id),
  
  -- Zeitstempel
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  
  -- Soft Delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES public.users(id),
  
  -- Eindeutigkeit: Ein User kann pro Dokumenttyp, Kategorie und Seite nur ein Dokument haben
  UNIQUE(user_id, document_type, category_code, side, deleted_at)
);

-- Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_tenant_id ON public.user_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_type ON public.user_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_user_documents_active ON public.user_documents(user_id, deleted_at) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users können ihre eigenen Dokumente sehen
CREATE POLICY user_documents_own_access ON public.user_documents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Policy: Staff/Admin können alle Dokumente ihres Tenants sehen
CREATE POLICY user_documents_staff_access ON public.user_documents
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    (
      user_id = auth.uid() OR 
      (
        (auth.jwt() ->> 'role')::text IN ('admin', 'staff') AND
        tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1)
      )
    )
  );

-- Policy: Users können ihre eigenen Dokumente hochladen/bearbeiten
CREATE POLICY user_documents_own_modify ON public.user_documents
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (
      (auth.jwt() ->> 'role')::text IN ('admin', 'staff') AND
      tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1)
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (
      (auth.jwt() ->> 'role')::text IN ('admin', 'staff') AND
      tenant_id = (SELECT u.tenant_id FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1)
    )
  );

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_documents_updated_at 
  BEFORE UPDATE ON public.user_documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Kommentare für Dokumentation
COMMENT ON TABLE public.user_documents IS 'Speichert alle Benutzerdokumente (Lernfahrausweise, Führerscheine, etc.) als separate Einträge';
COMMENT ON COLUMN public.user_documents.document_type IS 'Typ des Dokuments (lernfahrausweis, fuehrerschein, ausweis, etc.)';
COMMENT ON COLUMN public.user_documents.category_code IS 'Fahrzeugkategorie für kategoriespezifische Dokumente (B, A, BE, etc.)';
COMMENT ON COLUMN public.user_documents.side IS 'Seite des Dokuments (front, back) für zweiseitige Dokumente';
COMMENT ON COLUMN public.user_documents.storage_path IS 'Pfad zur Datei im Supabase Storage';
COMMENT ON COLUMN public.user_documents.is_verified IS 'Wurde das Dokument von Staff/Admin verifiziert?';

-- Beispiel-Einträge für Dokumenttypen (als Referenz)
/*
Beispiel-Dokumenttypen:
- 'lernfahrausweis' + category_code 'B' + side 'front'/'back'
- 'lernfahrausweis' + category_code 'A' + side 'front'/'back'  
- 'fuehrerschein' + category_code NULL + side 'front'/'back'
- 'ausweis' + category_code NULL + side 'front'/'back'
- 'medizinisches_zeugnis' + category_code NULL + side 'front'
*/

-- Verifiziere die Tabellenerstellung
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_documents'
ORDER BY ordinal_position;
















