-- Website Factory lifecycle hardening.
-- Additive only. Do NOT apply to production from this PR.
-- Reviewable / reversible: drop the new indexes, columns, table, and trigger.

-- ── Claim token (separate from preview_token / preview_url) ────────────────
alter table public.website_prospects
  add column if not exists claim_token_hash text,
  add column if not exists claim_expires_at timestamptz,
  add column if not exists claim_revoked_at timestamptz;

comment on column public.website_prospects.claim_token_hash is
  'SHA-256 hex of the one-time claim token. Plaintext is never persisted.';
comment on column public.website_prospects.claim_expires_at is
  'Claim token expiry. Expired tokens cannot start a new claim.';
comment on column public.website_prospects.claim_revoked_at is
  'When set, the claim token is revoked even if it has not expired.';

-- ── 1 prospect ↔ 1 tenant ↔ 1 website ─────────────────────────────────────
create unique index if not exists website_prospects_tenant_id_uidx
  on public.website_prospects (tenant_id)
  where tenant_id is not null;

create unique index if not exists website_prospects_website_id_uidx
  on public.website_prospects (website_id)
  where website_id is not null;

create unique index if not exists website_prospects_claim_token_hash_uidx
  on public.website_prospects (claim_token_hash)
  where claim_token_hash is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'website_prospects_website_id_fkey'
  ) then
    alter table public.website_prospects
      add constraint website_prospects_website_id_fkey
      foreign key (website_id) references public.website_tenants(id)
      on delete set null;
  end if;
end $$;

-- ── Checkout webhook idempotency ──────────────────────────────────────────
create table if not exists public.website_checkout_events (
  stripe_session_id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text not null default 'checkout.session.completed',
  processed_at timestamptz not null default now()
);

comment on table public.website_checkout_events is
  'Idempotency ledger for website Stripe checkout.session.completed deliveries.';

alter table public.website_checkout_events enable row level security;
revoke all on table public.website_checkout_events from anon, authenticated;
grant all on table public.website_checkout_events to service_role;

-- ── DB-level first-publish gate for website-only tenants ──────────────────
create or replace function public.enforce_website_only_publish_gate()
returns trigger
language plpgsql
as $$
declare
  t record;
begin
  if new.is_published is true and old.is_published is distinct from true then
    select
      website_only,
      website_setup_paid_at,
      website_hosting_plan,
      website_status
    into t
    from public.tenants
    where id = new.tenant_id;

    if not found then
      raise exception 'website_publish_blocked_tenant';
    end if;

    -- Regular (non website-only) tenants keep the existing publish path.
    if t.website_only is not true then
      return new;
    end if;

    if t.website_status = 'disabled' then
      raise exception 'website_publish_blocked_cancelled';
    end if;

    if t.website_setup_paid_at is null then
      raise exception 'website_publish_blocked_setup';
    end if;

    if t.website_hosting_plan is null or t.website_hosting_plan not in ('host', 'care') then
      raise exception 'website_publish_blocked_hosting';
    end if;

    if t.website_status is distinct from 'approved' and t.website_status is distinct from 'live' then
      raise exception 'website_publish_blocked_qa';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists website_tenants_publish_gate on public.website_tenants;
create trigger website_tenants_publish_gate
  before update of is_published on public.website_tenants
  for each row
  execute procedure public.enforce_website_only_publish_gate();
