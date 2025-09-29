-- Course Management System Migration
-- Creates tables for courses, course sessions, rooms, vehicles, and registrations

-- 1. Vehicles Table (predefined vehicles for course bookings)
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Vehicle details
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'roller', 'motorrad', 'anhanger_be', 'lastwagen_c', 'anhanger_ce'
  location VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Booking settings
  requires_reservation BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 2. Rooms Table (rooms available for course bookings)
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Room details
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 20,
  description TEXT,
  equipment JSONB, -- {"projector": true, "whiteboard": true, "computers": 10}
  
  -- Booking settings
  is_public BOOLEAN DEFAULT true, -- Can be booked by external parties
  hourly_rate_rappen INTEGER DEFAULT 0, -- Cost per hour in Rappen
  requires_reservation BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 3. Courses Table (main course information)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Course details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'VKU', 'PGS', 'CZV', 'Fahrlehrer', 'Privat'
  
  -- Instructor assignment
  instructor_id UUID REFERENCES users(id), -- Internal staff instructor
  external_instructor_name VARCHAR(255), -- External instructor name
  external_instructor_email VARCHAR(255), -- External instructor email
  external_instructor_phone VARCHAR(50), -- External instructor phone
  
  -- Participant settings
  max_participants INTEGER NOT NULL DEFAULT 20,
  min_participants INTEGER DEFAULT 1,
  current_participants INTEGER DEFAULT 0,
  
  -- Resource requirements
  requires_room BOOLEAN DEFAULT false,
  room_id UUID REFERENCES rooms(id),
  requires_vehicle BOOLEAN DEFAULT false,
  vehicle_id UUID REFERENCES vehicles(id),
  
  -- Pricing
  price_per_participant_rappen INTEGER NOT NULL DEFAULT 0,
  early_bird_discount_rappen INTEGER DEFAULT 0,
  early_bird_deadline TIMESTAMP WITH TIME ZONE,
  
  -- Visibility and status
  is_public BOOLEAN DEFAULT true, -- Publicly visible for registration
  is_active BOOLEAN DEFAULT true,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  
  -- SARI Integration (future)
  sari_managed BOOLEAN DEFAULT false,
  sari_course_id VARCHAR(255), -- External SARI course ID
  sari_sync_status VARCHAR(50) DEFAULT 'none', -- 'none', 'pending', 'synced', 'error'
  sari_last_sync TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT course_instructor_check CHECK (
    (instructor_id IS NOT NULL AND external_instructor_name IS NULL) OR
    (instructor_id IS NULL AND external_instructor_name IS NOT NULL)
  )
);

-- 4. Course Sessions Table (individual course parts/sessions)
CREATE TABLE IF NOT EXISTS course_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Session details
  session_number INTEGER NOT NULL, -- 1, 2, 3 for multi-part courses
  title VARCHAR(255), -- Optional specific title for this session
  description TEXT,
  
  -- Timing
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Location override (if different from course default)
  room_id UUID REFERENCES rooms(id),
  vehicle_id UUID REFERENCES vehicles(id),
  custom_location VARCHAR(255),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT session_time_check CHECK (end_time > start_time),
  UNIQUE(course_id, session_number)
);

-- 5. Course Registrations Table (participant registrations)
CREATE TABLE IF NOT EXISTS course_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Participant info
  user_id UUID REFERENCES users(id), -- Existing user
  first_name VARCHAR(255), -- For non-users
  last_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  
  -- Registration details
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'waitlist', 'cancelled', 'completed')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  
  -- Payment info
  payment_id UUID, -- Link to payments table
  amount_paid_rappen INTEGER DEFAULT 0,
  discount_applied_rappen INTEGER DEFAULT 0,
  
  -- Admin fields
  registered_by UUID REFERENCES users(id), -- Staff who registered the participant
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(course_id, email) -- One registration per email per course
);

-- 6. Course Waitlist Table (when course is full)
CREATE TABLE IF NOT EXISTS course_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Participant info
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  
  -- Waitlist details
  position INTEGER NOT NULL, -- Position in waitlist
  added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'offered', 'accepted', 'declined', 'expired')),
  
  -- Notification tracking
  last_notification_sent TIMESTAMP WITH TIME ZONE,
  offer_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(course_id, email) -- One waitlist entry per email per course
);

-- 7. Room Bookings Table (track room reservations)
CREATE TABLE IF NOT EXISTS room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Booking details
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  purpose VARCHAR(255) NOT NULL, -- 'course', 'meeting', 'event', 'external'
  
  -- Reference to what's using the room
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  course_session_id UUID REFERENCES course_sessions(id) ON DELETE CASCADE,
  
  -- Booking info
  booked_by UUID REFERENCES users(id) NOT NULL,
  external_contact_name VARCHAR(255), -- For external bookings
  external_contact_email VARCHAR(255),
  external_contact_phone VARCHAR(50),
  
  -- Status
  status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT room_booking_time_check CHECK (end_time > start_time)
);

-- 8. Vehicle Bookings Table (track vehicle reservations)
CREATE TABLE IF NOT EXISTS vehicle_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Booking details
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  purpose VARCHAR(255) NOT NULL, -- 'course', 'lesson', 'exam', 'maintenance'
  
  -- Reference to what's using the vehicle
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  course_session_id UUID REFERENCES course_sessions(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Booking info
  booked_by UUID REFERENCES users(id) NOT NULL,
  driver_name VARCHAR(255), -- Who will drive the vehicle
  
  -- Status
  status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'in_use')),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT vehicle_booking_time_check CHECK (end_time > start_time)
);

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_id ON vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles(location);

CREATE INDEX IF NOT EXISTS idx_rooms_tenant_id ON rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rooms_location ON rooms(location);
CREATE INDEX IF NOT EXISTS idx_rooms_public ON rooms(is_public);

CREATE INDEX IF NOT EXISTS idx_courses_tenant_id ON courses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_public ON courses(is_public);
CREATE INDEX IF NOT EXISTS idx_courses_sari ON courses(sari_managed);

CREATE INDEX IF NOT EXISTS idx_course_sessions_course_id ON course_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sessions_start_time ON course_sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_course_registrations_course_id ON course_registrations(course_id);
CREATE INDEX IF NOT EXISTS idx_course_registrations_user_id ON course_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_course_registrations_email ON course_registrations(email);
CREATE INDEX IF NOT EXISTS idx_course_registrations_status ON course_registrations(status);

CREATE INDEX IF NOT EXISTS idx_course_waitlist_course_id ON course_waitlist(course_id);
CREATE INDEX IF NOT EXISTS idx_course_waitlist_position ON course_waitlist(position);

CREATE INDEX IF NOT EXISTS idx_room_bookings_room_id ON room_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_time ON room_bookings(start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_vehicle_bookings_vehicle_id ON vehicle_bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_bookings_time ON vehicle_bookings(start_time, end_time);

-- 10. Insert predefined vehicles
INSERT INTO vehicles (tenant_id, name, type, location, description, requires_reservation, created_at) VALUES
-- For tenant 1
('64259d68-195a-4c68-8875-f1b44d962830', 'Roller Zürich-Altstetten', 'roller', 'Zürich-Altstetten', 'Roller für Grundkurse', true, NOW()),
('64259d68-195a-4c68-8875-f1b44d962830', 'Motorrad Zürich-Altstetten', 'motorrad', 'Zürich-Altstetten', 'Motorrad für PGS-Kurse', true, NOW()),
('64259d68-195a-4c68-8875-f1b44d962830', 'Anhänger BE Zürich-Altstetten', 'anhanger_be', 'Zürich-Altstetten', 'Anhänger für BE-Kurse', true, NOW()),
('64259d68-195a-4c68-8875-f1b44d962830', 'Anhänger BE Lachen', 'anhanger_be', 'Lachen', 'Anhänger für BE-Kurse', true, NOW()),
('64259d68-195a-4c68-8875-f1b44d962830', 'Lastwagen C Lachen', 'lastwagen_c', 'Lachen', 'Lastwagen für C-Kurse', true, NOW()),
('64259d68-195a-4c68-8875-f1b44d962830', 'Anhänger CE Lachen', 'anhanger_ce', 'Lachen', 'Anhänger für CE-Kurse', true, NOW()),
-- For tenant 2
('78af580f-1670-4be3-a556-250339c872fa', 'Roller Zürich-Altstetten', 'roller', 'Zürich-Altstetten', 'Roller für Grundkurse', true, NOW()),
('78af580f-1670-4be3-a556-250339c872fa', 'Motorrad Zürich-Altstetten', 'motorrad', 'Zürich-Altstetten', 'Motorrad für PGS-Kurse', true, NOW()),
('78af580f-1670-4be3-a556-250339c872fa', 'Anhänger BE Zürich-Altstetten', 'anhanger_be', 'Zürich-Altstetten', 'Anhänger für BE-Kurse', true, NOW()),
('78af580f-1670-4be3-a556-250339c872fa', 'Anhänger BE Lachen', 'anhanger_be', 'Lachen', 'Anhänger für BE-Kurse', true, NOW()),
('78af580f-1670-4be3-a556-250339c872fa', 'Lastwagen C Lachen', 'lastwagen_c', 'Lachen', 'Lastwagen für C-Kurse', true, NOW()),
('78af580f-1670-4be3-a556-250339c872fa', 'Anhänger CE Lachen', 'anhanger_ce', 'Lachen', 'Anhänger für CE-Kurse', true, NOW())
ON CONFLICT DO NOTHING;

-- 11. Enable RLS for all tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_bookings ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies for tenant isolation
-- Vehicles policies
CREATE POLICY vehicles_tenant_access ON vehicles
  FOR ALL TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

-- Rooms policies (public rooms can be seen by all, but bookings are tenant-specific)
CREATE POLICY rooms_public_read ON rooms
  FOR SELECT TO authenticated
  USING (is_public = true OR tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY rooms_tenant_insert ON rooms
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY rooms_tenant_update ON rooms
  FOR UPDATE TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY rooms_tenant_delete ON rooms
  FOR DELETE TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

-- Courses policies
CREATE POLICY courses_public_read ON courses
  FOR SELECT TO authenticated
  USING (is_public = true OR tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY courses_tenant_insert ON courses
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY courses_tenant_update ON courses
  FOR UPDATE TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY courses_tenant_delete ON courses
  FOR DELETE TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

-- Course sessions policies
CREATE POLICY course_sessions_tenant_access ON course_sessions
  FOR ALL TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

-- Course registrations policies
CREATE POLICY course_registrations_tenant_access ON course_registrations
  FOR ALL TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

-- Course waitlist policies
CREATE POLICY course_waitlist_tenant_access ON course_waitlist
  FOR ALL TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

-- Room bookings policies
CREATE POLICY room_bookings_tenant_access ON room_bookings
  FOR ALL TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

-- Vehicle bookings policies
CREATE POLICY vehicle_bookings_tenant_access ON vehicle_bookings
  FOR ALL TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND is_active = true
  ));

-- 13. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();
CREATE TRIGGER update_course_sessions_updated_at BEFORE UPDATE ON course_sessions FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();
CREATE TRIGGER update_course_registrations_updated_at BEFORE UPDATE ON course_registrations FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();
CREATE TRIGGER update_course_waitlist_updated_at BEFORE UPDATE ON course_waitlist FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();
CREATE TRIGGER update_room_bookings_updated_at BEFORE UPDATE ON room_bookings FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();
CREATE TRIGGER update_vehicle_bookings_updated_at BEFORE UPDATE ON vehicle_bookings FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();

-- 14. Verification
DO $$
BEGIN
    RAISE NOTICE 'Course Management System Migration completed successfully';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '- vehicles (with predefined vehicles)';
    RAISE NOTICE '- rooms (public bookable)';
    RAISE NOTICE '- courses (with SARI integration placeholders)';
    RAISE NOTICE '- course_sessions (multi-part courses)';
    RAISE NOTICE '- course_registrations (participant management)';
    RAISE NOTICE '- course_waitlist (when courses are full)';
    RAISE NOTICE '- room_bookings (resource management)';
    RAISE NOTICE '- vehicle_bookings (resource management)';
    RAISE NOTICE '';
    RAISE NOTICE 'Features ready:';
    RAISE NOTICE '- Multi-tenant isolation';
    RAISE NOTICE '- Public/private courses';
    RAISE NOTICE '- Internal/external instructors';
    RAISE NOTICE '- Resource reservation';
    RAISE NOTICE '- Participant limits and waitlist';
    RAISE NOTICE '- SARI integration placeholders';
    RAISE NOTICE '- Payment integration ready';
END $$;
