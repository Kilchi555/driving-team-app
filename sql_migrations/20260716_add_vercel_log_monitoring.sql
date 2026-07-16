-- Vercel log monitoring: ingests error/warning runtime logs from a Vercel Log
-- Drain, and lets a daily cron job group them into a "review" that the
-- super-admin sees in the dashboard and gets emailed about.
--
-- Setup required in the Vercel dashboard (cannot be done via migration):
--   Project Settings -> Log Drains -> Add a Custom Endpoint
--     URL:    https://app.simy.ch/api/integrations/vercel-log-drain
--     Format: JSON
--     Sources: lambda, edge (build/static optional)
--   Copy the generated "Drain signature secret" into the VERCEL_LOG_DRAIN_SECRET
--   env var in the Vercel project settings (not committed to this repo).

create table if not exists public.vercel_log_reviews (
  id uuid primary key default gen_random_uuid(),
  period_start timestamptz not null,
  period_end timestamptz not null,
  error_count integer not null default 0,
  warning_count integer not null default 0,
  -- Array of { message, path, status_code, level, count, sample_event_id }, sorted by count desc.
  top_issues jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vercel_log_reviews_status on public.vercel_log_reviews (status);
create index if not exists idx_vercel_log_reviews_created_at on public.vercel_log_reviews (created_at desc);

create table if not exists public.vercel_log_events (
  id uuid primary key default gen_random_uuid(),
  -- Vercel's own log line id. Unique so re-delivered drain requests don't duplicate rows.
  vercel_log_id text unique,
  deployment_id text,
  project_id text,
  source text,
  level text not null,
  message text,
  status_code integer,
  path text,
  method text,
  environment text,
  request_id text,
  region text,
  client_ip text,
  occurred_at timestamptz not null,
  raw jsonb,
  review_id uuid references public.vercel_log_reviews(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_vercel_log_events_occurred_at on public.vercel_log_events (occurred_at desc);
create index if not exists idx_vercel_log_events_level on public.vercel_log_events (level);
create index if not exists idx_vercel_log_events_review_id on public.vercel_log_events (review_id);

alter table public.vercel_log_reviews enable row level security;
alter table public.vercel_log_events enable row level security;

create policy service_role_manage_vercel_log_reviews on public.vercel_log_reviews
  for all to service_role using (true) with check (true);

create policy service_role_manage_vercel_log_events on public.vercel_log_events
  for all to service_role using (true) with check (true);

create policy super_admin_view_vercel_log_reviews on public.vercel_log_reviews
  for select to authenticated
  using (exists (select 1 from public.users u where u.auth_user_id = auth.uid() and u.role = 'super_admin'));

create policy super_admin_update_vercel_log_reviews on public.vercel_log_reviews
  for update to authenticated
  using (exists (select 1 from public.users u where u.auth_user_id = auth.uid() and u.role = 'super_admin'));

create policy super_admin_view_vercel_log_events on public.vercel_log_events
  for select to authenticated
  using (exists (select 1 from public.users u where u.auth_user_id = auth.uid() and u.role = 'super_admin'));
