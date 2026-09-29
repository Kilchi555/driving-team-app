-- Global prospect-discovery automation.
-- Super-admin APIs and the cron dispatcher use the service role.
-- No client policies: anon and authenticated cannot read or write these rows.
-- The seeded row is disabled. Application code also treats a missing row as disabled.

create table if not exists public.prospect_discovery_settings (
  id integer primary key,
  enabled boolean not null default false,
  frequency text not null default 'daily',
  run_time text not null default '04:30',
  timezone text not null default 'Europe/Zurich',
  updated_at timestamptz not null default now(),
  updated_by uuid,
  last_dispatch_at timestamptz,
  last_dispatch_result text,
  constraint prospect_discovery_settings_singleton check (id = 1),
  constraint prospect_discovery_settings_frequency_check check (frequency in ('daily')),
  constraint prospect_discovery_settings_time_check check (run_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint prospect_discovery_settings_timezone_check check (timezone ~ '^[A-Za-z0-9_+/-]{1,64}$'),
  constraint prospect_discovery_settings_dispatch_check check (
    last_dispatch_result is null
    or last_dispatch_result in ('disabled', 'not_due', 'started', 'already_running')
  )
);

insert into public.prospect_discovery_settings (id, enabled, frequency, run_time, timezone)
values (1, false, 'daily', '04:30', 'Europe/Zurich')
on conflict (id) do nothing;

create table if not exists public.prospect_discovery_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null,
  triggered_by uuid,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  city text,
  duration_ms integer,
  created_count integer not null default 0,
  review_count integer not null default 0,
  scored_count integer not null default 0,
  error_count integer not null default 0,
  generated_count integer not null default 0,
  emails_sent integer not null default 0,
  error_summary text,
  constraint prospect_discovery_runs_trigger_check check (trigger in ('manual', 'cron')),
  constraint prospect_discovery_runs_status_check check (status in ('running', 'completed', 'failed', 'skipped')),
  constraint prospect_discovery_runs_emails_sent_check check (emails_sent = 0)
);

create unique index if not exists prospect_discovery_runs_one_running_uidx
  on public.prospect_discovery_runs ((1))
  where status = 'running';

create index if not exists prospect_discovery_runs_started_idx
  on public.prospect_discovery_runs (started_at desc);

create index if not exists prospect_discovery_runs_cron_started_idx
  on public.prospect_discovery_runs (started_at desc)
  where trigger = 'cron';

comment on table public.prospect_discovery_settings is
  'Singleton switch for the Places prospect cron. Default and missing row mean disabled.';

comment on table public.prospect_discovery_runs is
  'One row per prospect-discovery attempt. At most one row may be running.';

alter table public.prospect_discovery_settings enable row level security;
alter table public.prospect_discovery_runs enable row level security;

revoke all on table public.prospect_discovery_settings from anon, authenticated;
revoke all on table public.prospect_discovery_runs from anon, authenticated;

grant all on table public.prospect_discovery_settings to service_role;
grant all on table public.prospect_discovery_runs to service_role;
