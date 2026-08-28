-- One auth login may belong to at most one public.users profile.
CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_uidx
  ON public.users (auth_user_id)
  WHERE auth_user_id IS NOT NULL;
