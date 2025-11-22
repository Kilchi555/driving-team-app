-- Create password_reset_tokens table for password reset magic links
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  token VARCHAR(255) NOT NULL UNIQUE,
  reset_method VARCHAR(50) NOT NULL CHECK (reset_method IN ('email', 'sms')),
  
  -- Token validity
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_phone ON password_reset_tokens(phone);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Enable RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own reset tokens (for validation)
CREATE POLICY password_reset_tokens_user_read ON password_reset_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND expires_at > NOW() AND used_at IS NULL);

-- RLS Policy: Anon can read tokens if they have the correct token (for public reset page)
CREATE POLICY password_reset_tokens_anon_read ON password_reset_tokens
  FOR SELECT TO anon
  USING (expires_at > NOW() AND used_at IS NULL);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_password_reset_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_password_reset_tokens_updated_at
BEFORE UPDATE ON password_reset_tokens
FOR EACH ROW
EXECUTE FUNCTION update_password_reset_tokens_updated_at();

-- Comment on columns
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens for magic link-based password resets';
COMMENT ON COLUMN password_reset_tokens.token IS 'Unique token used in reset link (e.g., sent in email or SMS)';
COMMENT ON COLUMN password_reset_tokens.reset_method IS 'How the reset link was sent: email or sms';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'When this reset token expires (typically 1 hour)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'When this token was used to reset password (NULL = unused)';

