-- Draft preview tokens for tenant websites.
-- Store only a hash. The raw token is returned once to the owning session.
-- DO NOT apply this file from an automated audit or agent run.
-- Apply deliberately in a later, reviewed deployment.

alter table public.website_tenants
  add column if not exists preview_token_hash text;

alter table public.website_tenants
  add column if not exists preview_token_expires_at timestamptz;

comment on column public.website_tenants.preview_token_hash is
  'sha256 hex of the current draft preview token. The raw token is not stored.';

comment on column public.website_tenants.preview_token_expires_at is
  'When preview_token_hash stops granting draft access. Null means no valid preview.';

create index if not exists website_tenants_preview_token_hash_idx
  on public.website_tenants (preview_token_hash)
  where preview_token_hash is not null;
