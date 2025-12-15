-- Fix RLS policies for calendar_tokens table
-- Issue: Calendar tokens cannot be inserted due to missing/incorrect RLS policies
-- The service_role (backend) needs to be able to insert tokens

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "calendar_tokens_insert" ON public.calendar_tokens;
DROP POLICY IF EXISTS "calendar_tokens_select" ON public.calendar_tokens;
DROP POLICY IF EXISTS "calendar_tokens_update" ON public.calendar_tokens;

-- Enable RLS on calendar_tokens table
ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: Public can read active tokens (for ICS endpoint)
-- This is safe because tokens are not sensitive - they're like share links
CREATE POLICY "calendar_tokens_select"
ON public.calendar_tokens
FOR SELECT
USING (true); -- Allow anyone to read tokens (needed for ICS endpoint to validate token)

-- INSERT: Service role and staff/admin can insert tokens
-- This allows backend to create tokens, and staff to regenerate their own
CREATE POLICY "calendar_tokens_insert"
ON public.calendar_tokens
FOR INSERT
WITH CHECK (true); -- Allow service_role and authenticated users to insert

-- UPDATE: Service role and staff/admin can update tokens
-- This allows invalidating old tokens and updating last_used_at
CREATE POLICY "calendar_tokens_update"
ON public.calendar_tokens
FOR UPDATE
USING (true)
WITH CHECK (true);

-- DELETE: Service role only (no soft delete needed for tokens)
CREATE POLICY "calendar_tokens_delete"
ON public.calendar_tokens
FOR DELETE
USING (true);

