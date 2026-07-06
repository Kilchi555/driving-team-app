-- Migration: Add vehicle_id + room_id to appointments, room_settings to categories
-- Date: 2026-07-05

-- ─── appointments: concrete resource references ───────────────────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS room_id    uuid REFERENCES rooms(id)    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_vehicle_id ON appointments(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_room_id    ON appointments(room_id)    WHERE room_id    IS NOT NULL;

-- ─── categories: room availability config per category ────────────────────────
-- Structure: { "mode": "none"|"optional"|"required", "allowed_room_ids": [1,2] }
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS room_settings JSONB DEFAULT NULL;

-- ─── RLS: staff/admin may update vehicle_id and room_id on own tenant appointments ──
-- vehicle_bookings and room_bookings already have tenant_id RLS.
-- appointments already has an update policy for staff — the new columns are
-- included automatically. No additional policy needed.
