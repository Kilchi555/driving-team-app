-- Cross-instance coordination for Supabase refresh-token rotation.
--
-- WHY: Supabase refresh tokens are single-use (rotated on every refresh). When
-- several parallel API requests hit an expired access token at (nearly) the
-- same time, they may land on DIFFERENT serverless (Vercel) function
-- instances. The previous fix (server/utils/token-refresh.ts) only
-- deduplicated concurrent refreshes *within one warm instance* via an
-- in-memory Map — useless across instances, since each gets its own empty
-- Map. Result: only the first instance to reach Supabase wins the refresh;
-- every other instance gets "refresh token already used" and 401s, even
-- though the session was actually still valid a moment earlier.
--
-- This table lets any instance "claim" a refresh attempt for a given
-- (hashed) refresh token via a simple insert-race (primary key conflict =
-- lost the race), then poll the row until the winning instance publishes the
-- freshly rotated session. Rows are short-lived (a few seconds) and are
-- opportunistically cleaned up by the app; nothing sensitive lingers long.
--
-- Only ever accessed with the service_role key from trusted server code
-- (server/utils/token-refresh.ts) — never exposed to clients.

create table if not exists public.auth_refresh_locks (
  token_hash text primary key,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  session jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_refresh_locks_created_at on public.auth_refresh_locks (created_at);

alter table public.auth_refresh_locks enable row level security;

-- Service-role only — no anon/authenticated access whatsoever.
create policy service_role_manage_auth_refresh_locks on public.auth_refresh_locks
  for all to service_role using (true) with check (true);
