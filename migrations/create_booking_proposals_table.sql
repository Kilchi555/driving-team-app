-- Create booking_proposals table for customer appointment requests without available slots
CREATE TABLE booking_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Booking context
  category_code VARCHAR(50) NOT NULL,
  duration_minutes INT NOT NULL,
  
  -- Selected location and staff
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Customer's preferred time slots (JSON array of { day_of_week: 0-6, start_time: "HH:MM", end_time: "HH:MM" })
  preferred_time_slots JSONB NOT NULL DEFAULT '[]',
  
  -- Customer contact info (for anonymous bookings, or pre-filled from auth)
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(255),
  
  -- Customer notes
  notes TEXT,
  
  -- Proposal status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, contacted, accepted, rejected, expired
  
  -- Admin notes (filled by staff when reviewing)
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'),
  
  -- Audit
  created_by_user_id UUID REFERENCES users(id),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'contacted', 'accepted', 'rejected', 'expired'))
);

-- Indexes for faster queries
CREATE INDEX idx_booking_proposals_tenant_id ON booking_proposals(tenant_id);
CREATE INDEX idx_booking_proposals_staff_id ON booking_proposals(staff_id);
CREATE INDEX idx_booking_proposals_location_id ON booking_proposals(location_id);
CREATE INDEX idx_booking_proposals_status ON booking_proposals(status);
CREATE INDEX idx_booking_proposals_created_at ON booking_proposals(created_at);

-- RLS Policies
ALTER TABLE booking_proposals ENABLE ROW LEVEL SECURITY;

-- Anon users can INSERT their own proposals (during booking flow)
-- This policy allows anyone (authenticated or not) to create a proposal
CREATE POLICY anon_insert_proposals ON booking_proposals
  FOR INSERT
  WITH CHECK (
    -- Allow insert for anyone
    true
  );

-- Staff can view proposals for their locations
CREATE POLICY staff_view_proposals ON booking_proposals
  FOR SELECT
  USING (
    staff_id = auth.uid() OR 
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Admin can update proposals
CREATE POLICY admin_update_proposals ON booking_proposals
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_booking_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_proposals_updated_at_trigger
BEFORE UPDATE ON booking_proposals
FOR EACH ROW
EXECUTE FUNCTION update_booking_proposals_updated_at();
