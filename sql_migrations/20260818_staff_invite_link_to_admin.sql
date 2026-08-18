-- Mark owner self-invite so staff register can set linked_admin_user_id.
ALTER TABLE public.staff_invitations
  ADD COLUMN IF NOT EXISTS link_to_admin boolean NOT NULL DEFAULT false;
