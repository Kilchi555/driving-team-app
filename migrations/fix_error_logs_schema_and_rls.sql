-- Don't delete existing error data, just ensure all columns exist
-- This migration adds missing columns to support both old and new error log formats

-- Ensure all necessary columns exist (won't fail if they already exist)
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'error';
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS component VARCHAR(255);
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS url VARCHAR(500);
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Migrate old data if it exists (for backwards compatibility)
-- If old columns exist, copy data to new columns
DO $$
BEGIN
  -- Try to migrate old column names to new ones if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='error_logs' AND column_name='error_type') THEN
    UPDATE error_logs SET component = error_type WHERE component IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='error_logs' AND column_name='error_message') THEN
    UPDATE error_logs SET message = error_message WHERE message IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='error_logs' AND column_name='error_stack') THEN
    UPDATE error_logs SET data = jsonb_build_object('stack', error_stack) WHERE data IS NULL AND error_stack IS NOT NULL;
  END IF;
END $$;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Admins can view tenant errors" ON error_logs;
DROP POLICY IF EXISTS "Admins and super_admin can view errors" ON error_logs;
DROP POLICY IF EXISTS "Users can insert their own errors" ON error_logs;
DROP POLICY IF EXISTS "Authenticated users can insert errors" ON error_logs;
DROP POLICY IF EXISTS "Service role can manage all errors" ON error_logs;

-- Create new policies that include super_admin
CREATE POLICY "Admins and super_admin can view errors" ON error_logs
  FOR SELECT TO authenticated
  USING (
    -- Super admin can view ALL errors (no tenant filter)
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
    OR
    -- Regular admins can view errors for their tenant
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND u.tenant_id = error_logs.tenant_id
      AND u.role IN ('admin', 'tenant_admin')
    )
  );

-- Allow authenticated users to insert errors
CREATE POLICY "Authenticated users can insert errors" ON error_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Service role bypass
CREATE POLICY "Service role can manage all errors" ON error_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
