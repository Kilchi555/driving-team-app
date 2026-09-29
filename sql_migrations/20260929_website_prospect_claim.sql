-- Public prospect claim. Not applied by this change.
-- Service role only. The raw token is never stored.
-- Reservation and finalization are each one UPDATE, so two callers cannot both win.

alter table public.website_prospects
  add column if not exists claim_token_hash text,
  add column if not exists claim_token_expires_at timestamptz,
  add column if not exists claim_reserved_until timestamptz;

comment on column public.website_prospects.claim_token_hash is
  'sha256 hex of the claim token. The raw token is not stored.';
comment on column public.website_prospects.claim_token_expires_at is
  'Claim links stop matching after this time.';
comment on column public.website_prospects.claim_reserved_until is
  'In-flight lock. A second claim waits until this time passes or the claim is finalized.';

create unique index if not exists website_prospects_claim_token_hash_uidx
  on public.website_prospects (claim_token_hash)
  where claim_token_hash is not null;

create or replace function public.reserve_website_prospect_claim(
  p_token_hash text,
  p_now timestamptz
)
returns table (
  id uuid,
  tenant_id uuid,
  website_id uuid
)
language sql
security invoker
set search_path = public
as $$
  update public.website_prospects
  set claim_reserved_until = p_now + interval '10 minutes',
      updated_at = p_now
  where claim_token_hash = p_token_hash
    and claim_token_expires_at > p_now
    and claimed_at is null
    and (claim_reserved_until is null or claim_reserved_until < p_now)
  returning id, tenant_id, website_id;
$$;

create or replace function public.commit_website_prospect_claim(
  p_prospect_id uuid,
  p_now timestamptz
)
returns table (id uuid)
language sql
security invoker
set search_path = public
as $$
  update public.website_prospects
  set claimed_at = p_now,
      status = 'claimed',
      claim_reserved_until = null,
      updated_at = p_now
  where id = p_prospect_id
    and claimed_at is null
    and claim_reserved_until is not null
    and claim_reserved_until >= p_now
  returning id;
$$;

create or replace function public.release_website_prospect_claim(
  p_prospect_id uuid,
  p_now timestamptz
)
returns table (id uuid)
language sql
security invoker
set search_path = public
as $$
  update public.website_prospects
  set claim_reserved_until = null,
      updated_at = p_now
  where id = p_prospect_id
    and claimed_at is null
  returning id;
$$;

revoke all on function public.reserve_website_prospect_claim(text, timestamptz) from public, anon, authenticated;
revoke all on function public.commit_website_prospect_claim(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.release_website_prospect_claim(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_website_prospect_claim(text, timestamptz) to service_role;
grant execute on function public.commit_website_prospect_claim(uuid, timestamptz) to service_role;
grant execute on function public.release_website_prospect_claim(uuid, timestamptz) to service_role;
