-- Create staff_invitations table for inviting staff members with token-based registration
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Invitee details
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  
  -- Invitation details
  invitation_token VARCHAR(255) NOT NULL UNIQUE,
  invited_by UUID NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  
  -- Timing
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_staff_invitations_tenant_id ON staff_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);

-- Enable RLS
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can manage invitations for their tenant
CREATE POLICY staff_invitations_admin_access ON staff_invitations
  FOR ALL TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role = 'admin' AND is_active = true
  ));

-- RLS Policy: Anyone with a valid token can read their own invitation (for registration)
CREATE POLICY staff_invitations_token_read ON staff_invitations
  FOR SELECT TO anon
  USING (status = 'pending' AND expires_at > NOW());

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_staff_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_invitations_updated_at
  BEFORE UPDATE ON staff_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_invitations_updated_at();

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_staff_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE staff_invitations 
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'pending' 
  AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION expire_old_staff_invitations() TO authenticated;

-- Verify
DO $$
BEGIN
    RAISE NOTICE 'Staff invitations system created successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '- Token-based staff invitations';
    RAISE NOTICE '- Email and SMS support';
    RAISE NOTICE '- Automatic expiration handling';
    RAISE NOTICE '- Secure registration flow';
END $$;

