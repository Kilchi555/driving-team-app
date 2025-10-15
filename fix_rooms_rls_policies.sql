-- Erstelle RLS Policies für die rooms Tabelle

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

-- Prüfe ob RLS aktiviert ist
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'rooms' AND schemaname = 'public';






