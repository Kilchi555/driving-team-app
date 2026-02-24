-- Debug: Check if webhook_logs table is accessible and RLS is really disabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'webhook_logs';

-- Check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'webhook_logs';

-- Try a test insert to see if it works
INSERT INTO webhook_logs (
  transaction_id,
  wallee_state,
  success,
  error_message
) VALUES (
  'test-' || now()::text,
  'TEST',
  true,
  'Test insert to verify RLS is working'
)
RETURNING id;

-- Check if insert worked
SELECT COUNT(*) as webhook_logs_count FROM webhook_logs;
