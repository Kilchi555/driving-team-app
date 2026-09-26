-- Hashed, expiring, revocable preview tokens for unpublished prospect websites.
-- Do not store the plaintext token. Existing unused preview_token column is left in place.

alter table public.website_prospects
  add column if not exists preview_token_hash text,
  add column if not exists preview_expires_at timestamptz,
  add column if not exists preview_revoked_at timestamptz;

comment on column public.website_prospects.preview_token_hash is
  'SHA-256 hex of the opaque preview bearer token. Never store the plaintext token.';
comment on column public.website_prospects.preview_expires_at is
  'Server-side preview token expiry. Access must fail after this timestamp.';
comment on column public.website_prospects.preview_revoked_at is
  'When set, the preview token is permanently invalid.';
