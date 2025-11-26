-- Create booking_reservations table for temporary slot reservations
-- This is separate from appointments to handle guest bookings before payment

CREATE TABLE "public"."booking_reservations" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  "tenant_id" uuid NOT NULL REFERENCES "public"."tenants"("id") ON DELETE CASCADE,
  "staff_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
  "location_id" uuid REFERENCES "public"."locations"("id") ON DELETE SET NULL,
  "start_time" timestamp with time zone NOT NULL,
  "end_time" timestamp with time zone NOT NULL,
  "duration_minutes" integer NOT NULL,
  "category_code" text NOT NULL,
  "guest_email" text,
  "guest_phone" text,
  "status" text NOT NULL DEFAULT 'reserved', -- reserved, confirmed, cancelled
  "reserved_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL, -- 5 minutes from now
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE "public"."booking_reservations" ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read reservations (for checking availability)
CREATE POLICY "Allow public to read reservations"
  ON "public"."booking_reservations"
  FOR SELECT
  USING (true);

-- Allow anyone to create reservations
CREATE POLICY "Allow public to create reservations"
  ON "public"."booking_reservations"
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update their own reservation
CREATE POLICY "Allow public to update reservations"
  ON "public"."booking_reservations"
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anyone to delete reservations
CREATE POLICY "Allow public to delete reservations"
  ON "public"."booking_reservations"
  FOR DELETE
  USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access"
  ON "public"."booking_reservations"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add index for faster queries
CREATE INDEX idx_booking_reservations_tenant_id ON "public"."booking_reservations"("tenant_id");
CREATE INDEX idx_booking_reservations_staff_id ON "public"."booking_reservations"("staff_id");
CREATE INDEX idx_booking_reservations_expires_at ON "public"."booking_reservations"("expires_at");
CREATE INDEX idx_booking_reservations_start_time ON "public"."booking_reservations"("start_time");

