-- Normalize appointments that were created as scheduled but still require confirmation
-- Rule: Any appointment with a non-null confirmation_token and status = 'scheduled'
--       should be set to status = 'pending_confirmation'

UPDATE appointments
SET status = 'pending_confirmation',
    updated_at = NOW()
WHERE status = 'scheduled'
  AND confirmation_token IS NOT NULL
  AND deleted_at IS NULL;

-- Optional: log a preview (run manually in psql)
-- SELECT id, start_time, user_id FROM appointments
--  WHERE status = 'pending_confirmation'
--    AND confirmation_token IS NOT NULL
--    AND updated_at > NOW() - INTERVAL '1 minute';


