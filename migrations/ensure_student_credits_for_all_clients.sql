-- Ensure all client users have student_credits records

INSERT INTO student_credits (user_id, tenant_id, balance_rappen, notes)
SELECT u.id, u.tenant_id, 0, 'Auto-created via migration for existing user'
FROM users u
WHERE u.role = 'client'
  AND u.id NOT IN (SELECT DISTINCT user_id FROM student_credits)
  AND u.deleted_at IS NULL
ON CONFLICT (user_id) DO NOTHING;

