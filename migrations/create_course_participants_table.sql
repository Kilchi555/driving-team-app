-- Create course_participants table for course registrations
-- Used for: CZV Grundkurs, Fahrlehrerweiterbildung, etc.
CREATE TABLE IF NOT EXISTS public.course_participants (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  
  -- Participant info
  first_name character varying(100) not null,
  last_name character varying(100) not null,
  email character varying(255),
  phone character varying(50),
  
  -- For driver courses: driving license number
  faberid character varying(20),
  birthdate date,
  
  -- Address
  street character varying(255),
  street_nr character varying(20),
  zip character varying(10),
  city character varying(100),
  
  -- Course info
  course_type character varying(50) not null, -- 'czv_grundkurs', 'fahrlehrer_weiterbildung', etc.
  course_dates date[],
  notes text,
  
  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  constraint course_participants_pkey primary key (id),
  constraint course_participants_tenant_id_fkey foreign key (tenant_id) references tenants (id) on delete cascade,
  constraint course_participants_email_check check (
    (
      (
        (email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text
      )
      or (email is null)
    )
  ),
  constraint course_participants_phone_check check (
    (
      ((phone)::text ~ '^[\d\s\+\-\(\)]+$'::text)
      or (phone is null)
    )
  )
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_course_participants_tenant on public.course_participants using btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_course_participants_course_type on public.course_participants using btree (course_type);
CREATE INDEX IF NOT EXISTS idx_course_participants_email on public.course_participants using btree (email);
CREATE INDEX IF NOT EXISTS idx_course_participants_faberid on public.course_participants using btree (faberid);

-- Enable RLS
ALTER TABLE course_participants ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert their own registrations
CREATE POLICY anon_insert_course_participants ON course_participants
  FOR INSERT
  WITH CHECK (true);

-- Allow admins to view and update
CREATE POLICY admin_manage_course_participants ON course_participants
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY admin_update_course_participants ON course_participants
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_course_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_participants_updated_at 
BEFORE UPDATE ON course_participants 
FOR EACH ROW 
EXECUTE FUNCTION update_course_participants_updated_at();
