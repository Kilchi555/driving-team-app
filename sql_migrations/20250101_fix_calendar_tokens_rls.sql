-- Fix RLS policies for calendar_tokens table
-- Issue: Calendar tokens cannot be inserted due to missing/incorrect RLS policies
-- The service_role (backend) needs to be able to insert tokens

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "calendar_tokens_insert" ON public.calendar_tokens;
DROP POLICY IF EXISTS "calendar_tokens_select" ON public.calendar_tokens;
DROP POLICY IF EXISTS "calendar_tokens_update" ON public.calendar_tokens;

-- Enable RLS on calendar_tokens table
ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;

-- NOTE (2026-08-08): Do NOT recreate USING (true) policies.
-- ICS feed uses the service role (server/api/calendar/ics.get.ts).
-- Ownership-scoped policies live in 20260808_harden_calendar_tokens_rls.sql.
-- This file is kept for history only — do not re-apply.

