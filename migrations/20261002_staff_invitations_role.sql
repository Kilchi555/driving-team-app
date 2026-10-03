-- Staff and admin invitations share staff_invitations.
-- Existing rows stay staff via the column default.
-- Historical migrations are not modified.
-- Do not apply to production until this change is reviewed.

BEGIN;

ALTER TABLE public.staff_invitations
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'staff';

ALTER TABLE public.staff_invitations
  DROP CONSTRAINT IF EXISTS staff_invitations_role_check;

ALTER TABLE public.staff_invitations
  ADD CONSTRAINT staff_invitations_role_check
  CHECK (role IN ('admin', 'staff'));

COMMENT ON COLUMN public.staff_invitations.role IS
  'Invitation role. admin or staff. Default staff. Authoritative at accept time. Not a staff seat when admin.';

COMMIT;
