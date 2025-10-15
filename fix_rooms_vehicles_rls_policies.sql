-- Erstelle RLS Policies für die rooms und vehicles Tabellen

-- ===== ROOMS TABLE =====
-- RLS aktivieren
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see rooms from their tenant OR public rooms
CREATE POLICY "Users can view rooms from their tenant or public rooms" ON rooms
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
    OR is_public = true
  );

-- Policy: Users can insert rooms for their tenant
CREATE POLICY "Users can insert rooms for their tenant" ON rooms
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Users can update rooms from their tenant
CREATE POLICY "Users can update rooms from their tenant" ON rooms
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Users can delete rooms from their tenant
CREATE POLICY "Users can delete rooms from their tenant" ON rooms
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- ===== VEHICLES TABLE =====
-- RLS aktivieren
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see vehicles from their tenant
CREATE POLICY "Users can view vehicles from their tenant" ON vehicles
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Users can insert vehicles for their tenant
CREATE POLICY "Users can insert vehicles for their tenant" ON vehicles
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Users can update vehicles from their tenant
CREATE POLICY "Users can update vehicles from their tenant" ON vehicles
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Users can delete vehicles from their tenant
CREATE POLICY "Users can delete vehicles from their tenant" ON vehicles
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Prüfe ob RLS aktiviert ist
SELECT 'rooms' as table_name, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'rooms' AND schemaname = 'public'

UNION ALL

SELECT 'vehicles' as table_name, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'vehicles' AND schemaname = 'public';






