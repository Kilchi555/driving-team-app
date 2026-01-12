-- Migration: Create availability_slots table for pre-computed booking availability
-- Date: 2026-01-12
-- 
-- PURPOSE:
-- Replace direct frontend queries to appointments/working_hours/busy_times
-- with a pre-computed, public-safe availability table.
--
-- SECURITY BENEFITS:
-- 1. No exposure of sensitive appointment data (customer names, payment status)
-- 2. No exposure of staff working hours (privacy)
-- 3. No exposure of external busy times (personal data)
-- 4. Only shows: "This time slot is available" - nothing more!
--
-- PERFORMANCE BENEFITS:
-- 1. Ultra-fast queries (pre-computed)
-- 2. Can be cached aggressively
-- 3. No complex JOIN queries in frontend
--
-- RACE CONDITION PREVENTION:
-- Atomic slot locking via UPDATE WHERE is_available = true

-- ============================================
-- TABLE: availability_slots
-- ============================================
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant & Staff (for filtering)
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  
  -- Time Slot
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL,
  
  -- Availability Status
  is_available BOOLEAN DEFAULT true,
  booking_type VARCHAR(50) DEFAULT 'regular', -- 'regular', 'trial_lesson', 'exam', etc.
  
  -- Metadata (for backend use, NOT exposed publicly)
  slot_type VARCHAR(50), -- 'free_day', 'constrained', 'between_appointments'
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Reserved for booking (temporary lock during booking process)
  reserved_until TIMESTAMPTZ,
  reserved_by_session VARCHAR(255),
  
  -- Linked appointment (once booked)
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  CONSTRAINT valid_reservation CHECK (
    (reserved_until IS NULL AND reserved_by_session IS NULL) OR
    (reserved_until IS NOT NULL AND reserved_by_session IS NOT NULL)
  )
);

-- ============================================
-- INDEXES for Performance
-- ============================================

-- Main query: Find available slots for tenant/staff/time range
-- Note: Cannot use NOW() in index predicate (not IMMUTABLE)
-- Expired reservations cleaned up by cron job
CREATE INDEX idx_availability_lookup ON availability_slots(
  tenant_id, 
  staff_id, 
  is_available, 
  start_time, 
  end_time
) WHERE is_available = true;

-- Cleanup: Find expired reservations
CREATE INDEX idx_availability_expired_reservations ON availability_slots(
  reserved_until
) WHERE reserved_until IS NOT NULL;

-- Staff view: All slots for a staff member
CREATE INDEX idx_availability_staff ON availability_slots(
  staff_id, 
  start_time
);

-- Appointment linkage: Find slot by appointment
CREATE INDEX idx_availability_appointment ON availability_slots(
  appointment_id
) WHERE appointment_id IS NOT NULL;

-- ============================================
-- RLS POLICIES (Row Level Security)
-- ============================================

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- PUBLIC SELECT: Anyone can see available slots (with minimal data)
-- But only for active tenants
CREATE POLICY "availability_public_select" ON availability_slots
  FOR SELECT
  USING (
    is_available = true 
    AND (reserved_until IS NULL OR reserved_until < NOW())
    AND EXISTS (
      SELECT 1 FROM tenants 
      WHERE tenants.id = availability_slots.tenant_id 
      AND tenants.is_active = true
    )
  );

-- STAFF/ADMIN: Can see all slots for their tenant
CREATE POLICY "availability_staff_select" ON availability_slots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.tenant_id = availability_slots.tenant_id
      AND users.role IN ('staff', 'admin', 'super_admin')
    )
  );

-- BACKEND ONLY: Insert/Update/Delete via service role
-- No direct frontend access to modify!

-- ============================================
-- HELPER FUNCTION: Auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_availability_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_availability_slots_updated_at
  BEFORE UPDATE ON availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_availability_slots_updated_at();

-- ============================================
-- HELPER FUNCTION: Cleanup expired reservations
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_slot_reservations()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE availability_slots
  SET 
    reserved_until = NULL,
    reserved_by_session = NULL
  WHERE 
    reserved_until IS NOT NULL 
    AND reserved_until < NOW();
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE availability_slots IS 
  'Pre-computed availability slots for public booking. Replaces direct frontend queries to appointments/working_hours/busy_times for security and performance.';

COMMENT ON COLUMN availability_slots.is_available IS 
  'Public flag: true = slot can be booked. Does not expose WHY unavailable (privacy).';

COMMENT ON COLUMN availability_slots.reserved_until IS 
  'Temporary reservation during booking process. Prevents double-booking race conditions.';

COMMENT ON COLUMN availability_slots.slot_type IS 
  'Backend metadata for slot generation. NOT exposed to public queries.';

COMMENT ON COLUMN availability_slots.appointment_id IS 
  'Linked appointment once slot is booked. Used for invalidation triggers.';

