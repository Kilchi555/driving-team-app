-- Add onboarding fields to users table for SMS-based student registration

-- 1. Add onboarding_status column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'completed';

-- 2. Add onboarding_token column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_token TEXT;

-- 3. Add onboarding_token_expires column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_token_expires TIMESTAMPTZ;

-- 4. Add onboarding_completed_at column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 5. Add accepted_terms_at column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ;

-- 6. Create index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_users_onboarding_token ON users(onboarding_token);

-- 7. Update existing users to have completed status
UPDATE users 
SET onboarding_status = 'completed',
    onboarding_completed_at = created_at
WHERE onboarding_status IS NULL 
  AND auth_user_id IS NOT NULL;

-- 8. Comment the columns
COMMENT ON COLUMN users.onboarding_status IS 'Status of student onboarding: pending, in_progress, completed';
COMMENT ON COLUMN users.onboarding_token IS 'Unique token for onboarding link (sent via SMS)';
COMMENT ON COLUMN users.onboarding_token_expires IS 'Expiration date for onboarding token (typically 7 days)';
COMMENT ON COLUMN users.onboarding_completed_at IS 'When the student completed the onboarding process';
COMMENT ON COLUMN users.accepted_terms_at IS 'When the student accepted terms & conditions';

-- Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('onboarding_status', 'onboarding_token', 'onboarding_token_expires', 'onboarding_completed_at', 'accepted_terms_at')
ORDER BY column_name;

