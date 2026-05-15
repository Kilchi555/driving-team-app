-- Add vacation entitlement days to users (default 20 days/year per Swiss law)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS vacation_entitlement_days integer NOT NULL DEFAULT 20;
