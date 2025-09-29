-- Add instructor_invitations table for external instructor management
-- This allows inviting external instructors via email with acceptance tracking

CREATE TABLE IF NOT EXISTS instructor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Instructor details
  instructor_name VARCHAR(255) NOT NULL,
  instructor_email VARCHAR(255) NOT NULL,
  instructor_phone VARCHAR(50),
  
  -- Course reference
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  
  -- Invitation details
  invited_by UUID REFERENCES users(id) NOT NULL,
  invitation_token VARCHAR(255) NOT NULL UNIQUE,
  invitation_status VARCHAR(50) DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined', 'expired')),
  
  -- Additional instructor details (filled when accepting)
  instructor_details JSONB, -- {"specialties": ["VKU", "PGS"], "hourly_rate": 5000, "bio": "..."}
  
  -- Timing
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_instructor_invitations_tenant_id ON instructor_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_instructor_invitations_course_id ON instructor_invitations(course_id);
CREATE INDEX IF NOT EXISTS idx_instructor_invitations_email ON instructor_invitations(instructor_email);
CREATE INDEX IF NOT EXISTS idx_instructor_invitations_token ON instructor_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_instructor_invitations_status ON instructor_invitations(invitation_status);

-- Enable RLS
ALTER TABLE instructor_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY instructor_invitations_tenant_access ON instructor_invitations
  FOR ALL TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

-- Add trigger for updated_at
CREATE TRIGGER update_instructor_invitations_updated_at 
  BEFORE UPDATE ON instructor_invitations 
  FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_instructor_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE instructor_invitations 
  SET 
    invitation_status = 'expired',
    updated_at = NOW()
  WHERE invitation_status = 'pending' 
  AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION expire_old_instructor_invitations() TO authenticated;

-- Verify
DO $$
BEGIN
    RAISE NOTICE 'Instructor invitations system created successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '- Email invitations for external instructors';
    RAISE NOTICE '- Token-based acceptance system';
    RAISE NOTICE '- Automatic expiration handling';
    RAISE NOTICE '- Integration with course management';
END $$;
