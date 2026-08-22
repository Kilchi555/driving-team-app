-- Outbound website-generator prospects: audit + draft site + outreach review.
-- Superadmin APIs use the service role. No client policies on purpose.

create table if not exists public.website_prospects (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  business_type text not null default 'driving_school',
  existing_url text,
  hostname text,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  canton text,
  country text not null default 'CH',
  place_id text,

  source text not null default 'manual',
  status text not null default 'discovered',

  speed_score integer,
  seo_score integer,
  freshness_score integer,
  opportunity_score integer,

  pagespeed jsonb,
  scrape jsonb,
  analysis jsonb,
  revenue_model jsonb,
  email_draft jsonb,
  place jsonb,

  scraped_at timestamptz,
  tenant_id uuid references public.tenants(id) on delete set null,
  website_id uuid,
  preview_url text,
  preview_token text,

  matched_tenant_id uuid references public.tenants(id) on delete set null,
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  email_approved_at timestamptz,
  email_sent_at timestamptz,
  claimed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint website_prospects_status_check check (status in (
    'discovered',
    'scored',
    'generated',
    'review',
    'approved',
    'sent',
    'claimed',
    'skipped',
    'rejected'
  )),
  constraint website_prospects_source_check check (source in (
    'manual',
    'places_cron'
  ))
);

create unique index if not exists website_prospects_place_id_uidx
  on public.website_prospects (place_id)
  where place_id is not null;

create unique index if not exists website_prospects_hostname_uidx
  on public.website_prospects (hostname)
  where hostname is not null;

create index if not exists website_prospects_status_idx
  on public.website_prospects (status, opportunity_score desc nulls last);

create index if not exists website_prospects_created_idx
  on public.website_prospects (created_at desc);

comment on table public.website_prospects is
  'Outbound website-generator leads. Analysis + optional unpublished preview tenant. Email is never sent automatically.';

alter table public.website_prospects enable row level security;

revoke all on table public.website_prospects from anon, authenticated;
grant all on table public.website_prospects to service_role;
