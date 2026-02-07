-- Add password strength tracking for forced password updates
-- Supports gradual migration from weak to strong passwords

-- Add password_strength_version column to users table
-- 1 = old weak validation (legacy)
-- 2 = new strong validation (current)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password_strength_version INT DEFAULT 1;

-- Create index for efficient querying of users with old password strength
CREATE INDEX IF NOT EXISTS idx_users_password_strength 
ON public.users(password_strength_version) 
WHERE password_strength_version < 2;

-- Audit table to track password strength upgrades
-- Helps with compliance and security tracking
CREATE TABLE IF NOT EXISTS public.password_strength_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  old_version INT,
  new_version INT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_audits_user_id 
ON public.password_strength_audits(user_id);

CREATE INDEX IF NOT EXISTS idx_password_audits_updated_at 
ON public.password_strength_audits(updated_at DESC);
