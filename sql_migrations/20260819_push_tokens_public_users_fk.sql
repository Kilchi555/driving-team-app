-- push_tokens.user_id was FK'd to auth.users(id), but the app stores
-- public.users.id (≠ auth uid for almost every row). Token upserts failed
-- silently from the client, so FCM had nobody to send to.

ALTER TABLE public.push_tokens
  DROP CONSTRAINT IF EXISTS push_tokens_user_id_fkey;

ALTER TABLE public.push_tokens
  ADD CONSTRAINT push_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Users can manage their own push tokens" ON public.push_tokens;

CREATE POLICY "Users can manage their own push tokens"
ON public.push_tokens
FOR ALL
USING (
  user_id = (
    SELECT u.id
    FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
    LIMIT 1
  )
)
WITH CHECK (
  user_id = (
    SELECT u.id
    FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
    LIMIT 1
  )
);
