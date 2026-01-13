-- Migration: Add WebAuthn support for Face ID / Touch ID
-- Description: Store WebAuthn credentials (public keys) for biometric authentication

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User reference
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- WebAuthn data
  credential_id TEXT NOT NULL UNIQUE,  -- Base64 encoded credential ID
  public_key TEXT NOT NULL,             -- Base64 encoded public key
  sign_count INTEGER DEFAULT 0,         -- Counter for cloned credential detection
  
  -- Device info
  device_name VARCHAR(255),             -- "iPhone Face ID", "MacBook Pro Touch ID"
  transports TEXT[] DEFAULT '{}',       -- ["usb", "ble", "nfc", "internal"]
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  verified_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_credential_id CHECK (credential_id != '')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_active ON webauthn_credentials(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own WebAuthn credentials"
  ON webauthn_credentials FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create WebAuthn credentials"
  ON webauthn_credentials FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own WebAuthn credentials"
  ON webauthn_credentials FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage WebAuthn credentials"
  ON webauthn_credentials FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE webauthn_credentials IS 'Stores WebAuthn public keys for Face ID / Touch ID authentication';
COMMENT ON COLUMN webauthn_credentials.credential_id IS 'Base64 encoded credential ID from WebAuthn API';
COMMENT ON COLUMN webauthn_credentials.public_key IS 'Base64 encoded COSE key for signature verification';
COMMENT ON COLUMN webauthn_credentials.sign_count IS 'Signature counter to detect cloned credentials';

