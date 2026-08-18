-- Website-only tenants: same tenant row, slim admin after login.
-- Default false so the existing Simy register path is unchanged.

alter table public.tenants
  add column if not exists website_only boolean not null default false;

comment on column public.tenants.website_only is
  'True when the tenant signed up for the website product only. Full Simy register stays website_only=false.';

create index if not exists tenants_website_only_idx
  on public.tenants (website_only)
  where website_only = true;
