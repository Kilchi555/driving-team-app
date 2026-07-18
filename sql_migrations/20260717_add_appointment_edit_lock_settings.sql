-- Migration: Add configurable "past appointment edit lock" settings to tenants
--
-- Controls when a staff member can no longer edit an appointment in EventModal
-- once its start time has passed.
--
--   appointment_edit_lock_mode:
--     'immediately'  -> locked as soon as the appointment start time is in the past (current/default behaviour)
--     'after_hours'  -> locked N hours after the appointment start time (see appointment_edit_lock_hours)
--     'never'        -> never locked, always editable
--
--   appointment_edit_lock_hours:
--     Only used when appointment_edit_lock_mode = 'after_hours'. Number of hours after the
--     appointment start time before it becomes locked for editing.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS appointment_edit_lock_mode TEXT NOT NULL DEFAULT 'immediately',
  ADD COLUMN IF NOT EXISTS appointment_edit_lock_hours INTEGER NOT NULL DEFAULT 0;

ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_appointment_edit_lock_mode_check;

ALTER TABLE tenants
  ADD CONSTRAINT tenants_appointment_edit_lock_mode_check
  CHECK (appointment_edit_lock_mode IN ('immediately', 'after_hours', 'never'));

ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_appointment_edit_lock_hours_check;

ALTER TABLE tenants
  ADD CONSTRAINT tenants_appointment_edit_lock_hours_check
  CHECK (appointment_edit_lock_hours >= 0 AND appointment_edit_lock_hours <= 8760);

COMMENT ON COLUMN tenants.appointment_edit_lock_mode IS
  'When staff can no longer edit an appointment after its start time: immediately | after_hours | never';
COMMENT ON COLUMN tenants.appointment_edit_lock_hours IS
  'Grace period in hours before an appointment becomes locked for editing, used when appointment_edit_lock_mode = after_hours';
