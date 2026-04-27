-- Allow invited_by to be NULL for onboarding-flow invitations (no auth user exists yet)
ALTER TABLE staff_invitations
  ALTER COLUMN invited_by DROP NOT NULL;
