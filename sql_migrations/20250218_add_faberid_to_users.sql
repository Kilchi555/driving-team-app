-- Migration: Add faberid (Ausweisnummer) to users table for SARI integration
-- Date: 2025-02-18
-- Purpose: Store driver's license number for SARI course registration

-- ============================================
-- 1. Add faberid column to users table
-- ============================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS faberid VARCHAR(20);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_faberid ON public.users(faberid) WHERE faberid IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.faberid IS 'Ausweisnummer (Lernfahrausweis) for SARI VKU/PGS course registration';

-- ============================================
-- 2. Add sari_session_id to course_sessions
-- ============================================
ALTER TABLE public.course_sessions
ADD COLUMN IF NOT EXISTS sari_session_id VARCHAR(50);

-- Add index for SARI lookups
CREATE INDEX IF NOT EXISTS idx_course_sessions_sari_id ON public.course_sessions(sari_session_id) WHERE sari_session_id IS NOT NULL;

COMMENT ON COLUMN public.course_sessions.sari_session_id IS 'SARI course ID for this individual session (VKU Teil 1, 2, 3, 4 etc.)';

-- ============================================
-- 3. Add SARI sync columns to course_registrations
-- ============================================
ALTER TABLE public.course_registrations
ADD COLUMN IF NOT EXISTS sari_synced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sari_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS registered_by UUID REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_course_registrations_sari_synced ON public.course_registrations(sari_synced) WHERE sari_synced = TRUE;

