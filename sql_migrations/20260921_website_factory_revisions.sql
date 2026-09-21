-- Website Factory production foundation: revisions, lifecycle audit.
-- Additive only. Do NOT apply to production from this PR.
-- Reviewable / reversible: drop the new tables, indexes, and columns.
--
-- Strategy B: schema + verified backfill capability only.
-- Do NOT switch public reads off website_pages.blocks.
-- Pointer lives on website_tenants.published_revision_id (NOT website_pages).
-- No triggers / functions: writes stay explicit and application-controlled.
--
-- PRODUCTION_APPLY_NOT_CERTIFIED until an explicit apply runbook is approved.
-- Existing tenants keep working without this migration: app code treats
-- missing relations as a no-op and keeps the current mutable live tables.

-- ── Immutable published snapshots ──────────────────────────────────────────
create table if not exists public.website_revisions (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.website_tenants(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  version_number integer not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'superseded')),
  snapshot jsonb not null,
  source_revision_id uuid references public.website_revisions(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid,
  published_at timestamptz,
  published_by uuid
);

comment on table public.website_revisions is
  'Immutable website snapshots. Publish/rollback create new rows; published snapshots are not updated in place. APPLICATION_ENFORCED_IMMUTABILITY=YES (no in-place snapshot UPDATE). DATABASE_ENFORCED_IMMUTABILITY=NO (no triggers).';
comment on column public.website_revisions.snapshot is
  'Deterministic JSON of pages + site SEO/brand at publish time. No secrets.';
comment on column public.website_revisions.source_revision_id is
  'When set, this revision is a rollback copy of the referenced revision.';
comment on column public.website_revisions.version_number is
  'Server-assigned, per-website monotonic integer. Never taken from client input.';

create unique index if not exists website_revisions_website_version_uidx
  on public.website_revisions (website_id, version_number);

create unique index if not exists website_revisions_one_published_uidx
  on public.website_revisions (website_id)
  where status = 'published';

create index if not exists website_revisions_tenant_idx
  on public.website_revisions (tenant_id, created_at desc);

alter table public.website_revisions enable row level security;
revoke all on table public.website_revisions from anon, authenticated;
grant all on table public.website_revisions to service_role;

-- ── Pointer on the live website row (nullable = legacy mutable render) ─────
alter table public.website_tenants
  add column if not exists published_revision_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'website_tenants_published_revision_id_fkey'
  ) then
    alter table public.website_tenants
      add constraint website_tenants_published_revision_id_fkey
      foreign key (published_revision_id) references public.website_revisions(id)
      on delete set null;
  end if;
end $$;

comment on column public.website_tenants.published_revision_id is
  'Optional pointer to the current published revision. NULL = legacy live tables (existing tenants).';

-- ── Lifecycle audit (no secrets) ───────────────────────────────────────────
create table if not exists public.website_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  website_id uuid references public.website_tenants(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  revision_id uuid references public.website_revisions(id) on delete set null,
  actor_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.website_lifecycle_events is
  'Website factory audit trail. Must never store preview/claim/session/payment secrets.';

create index if not exists website_lifecycle_events_tenant_idx
  on public.website_lifecycle_events (tenant_id, created_at desc);

create index if not exists website_lifecycle_events_website_idx
  on public.website_lifecycle_events (website_id, created_at desc);

alter table public.website_lifecycle_events enable row level security;
revoke all on table public.website_lifecycle_events from anon, authenticated;
grant all on table public.website_lifecycle_events to service_role;
