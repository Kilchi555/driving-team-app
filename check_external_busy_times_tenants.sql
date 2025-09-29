-- Check external busy times tenant distribution
SELECT 
    tenant_id,
    COUNT(*) as count,
    MIN(start_time) as earliest_event,
    MAX(start_time) as latest_event
FROM external_busy_times 
GROUP BY tenant_id
ORDER BY count DESC;

-- Check which staff members have external busy times
SELECT 
    ebt.tenant_id,
    t.name as tenant_name,
    u.first_name,
    u.last_name,
    u.email,
    COUNT(*) as busy_times_count
FROM external_busy_times ebt
LEFT JOIN tenants t ON ebt.tenant_id = t.id
LEFT JOIN users u ON ebt.staff_id = u.id
GROUP BY ebt.tenant_id, t.name, u.first_name, u.last_name, u.email
ORDER BY ebt.tenant_id, busy_times_count DESC;

-- Check if the user has any external busy times
SELECT 
    ebt.*,
    u.first_name,
    u.last_name,
    u.email
FROM external_busy_times ebt
LEFT JOIN users u ON ebt.staff_id = u.id
WHERE u.auth_user_id = '54c82b77-a758-4372-88a8-a8081b464d45';
