-- Debug user mapping issue
-- There seem to be multiple users with the same auth_user_id

-- Check all users with this auth_user_id
SELECT 
    'All users with auth_user_id' as test,
    id,
    email,
    first_name,
    last_name,
    tenant_id,
    auth_user_id,
    is_active,
    created_at
FROM users 
WHERE auth_user_id = '54c82b77-a758-4372-88a8-a8081b464d45'
ORDER BY created_at;

-- Check the specific user you mentioned
SELECT 
    'Specific user from your data' as test,
    id,
    email,
    first_name,
    last_name,
    tenant_id,
    auth_user_id,
    is_active,
    created_at
FROM users 
WHERE id = '091afa9b-e8a1-43b8-9cae-3195621619ae';

-- Check which user the RLS policy would use
SELECT 
    'RLS Policy Test' as test,
    auth.uid() as current_auth_uid,
    u.id as user_id,
    u.tenant_id,
    u.email
FROM users u
WHERE u.auth_user_id = auth.uid();
