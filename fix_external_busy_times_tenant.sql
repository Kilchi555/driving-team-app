-- Fix tenant_id mismatch for external_busy_times
-- Current user tenant: 78af580f-1670-4be3-a556-250339c872fa
-- External busy times tenant: 64259d68-195a-4c68-8875-f1b44d962830

-- Update external_busy_times to correct tenant
UPDATE external_busy_times 
SET tenant_id = '78af580f-1670-4be3-a556-250339c872fa'
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';

-- Update external_calendars to correct tenant
UPDATE external_calendars 
SET tenant_id = '78af580f-1670-4be3-a556-250339c872fa'
WHERE tenant_id = '64259d68-195a-4c68-8875-f1b44d962830';

-- Verify the fix
SELECT 
  'external_busy_times' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN tenant_id = '78af580f-1670-4be3-a556-250339c872fa' THEN 1 END) as correct_tenant_rows
FROM external_busy_times
UNION ALL
SELECT 
  'external_calendars' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN tenant_id = '78af580f-1670-4be3-a556-250339c872fa' THEN 1 END) as correct_tenant_rows
FROM external_calendars;
