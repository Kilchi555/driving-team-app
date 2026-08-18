-- Website-only billing: setup fee paid + monthly hosting plan.
-- Default Simy tenants stay null / unused.

alter table public.tenants
  add column if not exists website_setup_paid_at timestamptz null;

alter table public.tenants
  add column if not exists website_hosting_plan text null;

alter table public.tenants
  drop constraint if exists tenants_website_hosting_plan_check;

alter table public.tenants
  add constraint tenants_website_hosting_plan_check
  check (website_hosting_plan is null or website_hosting_plan in ('host', 'care'));

comment on column public.tenants.website_setup_paid_at is
  'When the one-time website setup fee (CHF 490) was paid. Null until go-live checkout.';

comment on column public.tenants.website_hosting_plan is
  'Monthly website plan: host (CHF 29) or care (CHF 49). Null during free setup window.';
