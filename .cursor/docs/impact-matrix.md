# Impact Matrix

> Change-impact reference for `driving-team-app`.  
> Blast radius and risk are based on repository coupling (import breadth, shared tables, middleware, money/security paths).  
> Tags: **CRITICAL** · `NEEDS VERIFICATION` · `ASSUMPTION`

---

## How to read this matrix

| Column | Meaning |
|--------|---------|
| **Bereich** | Product/technical area present in the repo |
| **Abhängigkeiten** | What typically moves with it |
| **Blast Radius** | Small / Medium / **High** / **Critical** |
| **Typisches Risiko** | Most likely failure mode if changed carelessly |

---

## Matrix

| Bereich | Abhängigkeiten | Blast Radius | Typisches Risiko |
|---------|----------------|--------------|------------------|
| **Authentication** · CRITICAL | `stores/auth`, auth plugins, `server/api/auth/*`, `server/utils/auth.ts`, `cookies.ts`, middleware `auth`/`admin`/`superadmin`, Supabase Auth, MFA/passkey tables, Capacitor session path | **Critical** | Global lockout; split-session bugs on native; cookie/JWT mismatch; broken redirects |
| **Authorization / roles** · CRITICAL | Pinia role flags, `requireAdminProfile`/`requireAdminOnly`, accountant grants, account-switch, RLS role branches | **Critical** | Privilege escalation or blocked admins; sub-admin/accountant path regressions |
| **Multi-tenant isolation** · CRITICAL | `tenant_id` on tables, branding/tenant plugins, `getAuthenticatedUser` profile scoping, service-role query filters, RLS tenant subquery | **Critical** | Cross-tenant data leak or write; wrong branding/context |
| **RLS policies** · CRITICAL | `migrations`/`sql_migrations`, `docs/RLS_POLICIES.csv`, JWT Supabase client paths, public booking anon policies | **Critical** | Silent over-exposure (anon/authenticated) or app breakage when policies deny expected reads |
| **Supabase clients** · CRITICAL | `utils/supabase.ts`, `server/utils/supabase.ts`, `supabase-admin.ts`, `@nuxtjs/supabase` module, bridge plugin | **High** | Auth/RLS bypass mistakes; broken all DB access; wrong key format handling |
| **Users / profiles** | `users` table, `/api/auth/current-user`, admin/staff/student selectors, documents, credits | **High** | Broken identity joins across appointments/payments; role/tenant corruption |
| **Tenants / branding / terminology** | `tenants`, `useTenant*`, `useTerminology` (~158), `useTenantBranding` (~101), layouts, LoadingLogo | **High** | UI labels/colors wrong everywhere; trial/website_only flags misapplied |
| **Feature flags** | `featureCatalog`, `useFeatures`, admin nav gating, (middleware `features` — `NEEDS VERIFICATION` attachment) | **Medium–High** | Features vanish/appear incorrectly; nav/API mismatch |
| **Appointments / calendar** | `appointments`, EventModal cluster, dashboard, staff APIs, notes/pendencies, evaluations | **High** | Scheduling corruption; double-booking; staff/customer calendar drift |
| **Availability engine** | `availability_slots`, `availability_recalc_queue`, staff hours, external calendars, booking APIs, crons | **High** | Empty or incorrect booking slots; race on reservations |
| **Public booking** | `server/api/booking/*`, booking pages/components, anon RLS, tenant slug resolution, frame-ancestors middleware | **High** | Public outage for acquisition funnel; slot leaks/overbook |
| **Payments (tenant / Wallee)** · CRITICAL | `payments*`, Wallee APIs/webhook, payment-providers factory, recovery cron, EventModal/payment UI | **Critical** | Lost/double charges; unpaid lessons marked paid; webhook desync |
| **Cash / credits / vouchers / discounts** | cash_* tables, `student_credits`, voucher/discount APIs & composables | **High** | Balance drift; abusive discounts; cash audit breaks |
| **Invoices / dunning** | `invoices*`, invoice APIs/utils, payment links, reminder crons | **High** | Wrong amounts/numbers; legal/billing disputes |
| **Accounting ledger** | accounting_* utils + extensive Vitest suite, lock/recurring crons | **High** | VAT/ledger inconsistency; locked period violations |
| **Stripe SaaS billing** · CRITICAL | `/api/stripe/*`, `tenants` subscription fields, `trial.global`, `apps/simy` prices | **Critical** | Tenants wrongly locked/unlocked; failed upgrades; webhook plan drift |
| **Courses / waitlist** | courses tables, course APIs/pages, enrollment payments, auto-waitlist cron | **Medium–High** | Enrollment/payment mismatch; capacity errors |
| **SARI integration** | `/api/sari/*`, sari_* tables, sync cron, course enrollment side effects | **Medium–High** | Regulatory sync failures; duplicate/missing course data |
| **Customer portal** | `customer-dashboard`, `/api/customer/*`, reglement modal, payments/courses views | **Medium** | Customers cannot pay/view lessons; legal modal loops |
| **Admin console** | `pages/admin/*` (~63), `/api/admin/*` (~327), admin layout/nav | **High** | Broad ops regressions; feature-gated nav vs API drift |
| **Staff workflows** | `/api/staff/*`, staff pages, evaluations, working hours | **Medium–High** | Instructor cannot complete/confirm lessons |
| **EventModal** 🔴 | `EventModal` + `useEventModal*` + students/payments/pricing composables | **High** | Core create/edit appointment path breaks for admin/staff |
| **Pricing engine** | `usePricing`, `usePriceCalculation`, `pricing_rules`, products | **High** | Wrong charged amounts across booking and EventModal |
| **Messaging (email/SMS/push)** | `email.ts`, `sms.ts`, `push.ts`, outbound queue, reminder crons | **Medium–High** | Missed reminders; spam/duplicate sends; quota burn |
| **Cron platform** | `vercel.json`, `/api/cron/*` (~54), `cron-auth.ts` | **High** | Silent job failure (auth); cascading stale availability/payments |
| **Marketing / Ads sync** | marketing APIs + GA4/GSC/Ads/Meta crons | **Medium** | Bad attribution; wasted ad spend data |
| **GBP** | `/api/gbp/*`, GBP crons, OAuth credentials | **Medium** | Failed posts/reviews sync; OAuth breakage |
| **Website builder / public sites** | website_* APIs/components, `/s/[subdomain]`, custom-domain middleware | **Medium–High** | Public site downtime; SEO/SSR regressions |
| **Platform super-admin** | `tenant-admin` pages/APIs, impersonation, vercel log review | **High** | Cross-tenant ops errors; access control gaps (`NEEDS VERIFICATION` on middleware coverage) |
| **Affiliate / referrals** | affiliate APIs/pages, referral globals, reward cron | **Medium** | Misattributed rewards; open partner routes |
| **Imports** | `/api/imports/*`, import batches | **Medium** | Bad bulk data into users/appointments |
| **Documents / reglemente** | user_documents, reglement pages/modals | **Medium** | Compliance gates fail; missing uploads |
| **Evaluations / exams** | evaluation_* tables, exam results, staff content types | **Medium** | Lost pedagogical records |
| **Security / rate limits** | rate-limiting middleware, login_attempts, blocked IPs, device security | **High** | Brute-force exposure or false lockouts |
| **i18n / locales** | `@nuxtjs/i18n`, `locales/*`, `useUserLanguage` | **Medium** | Missing strings; wrong language cookie behavior |
| **Native (Capacitor)** | android/ios, push plugin, native-redirect middleware, session split handling | **Medium–High** | App login loops; push registration failures |
| **Types / `types/supabase.ts`** | Shared TS contracts; may lag live schema | **Medium** | False safety; `NEEDS VERIFICATION` completeness |
| **Environment / secrets** | `nuxt.config` runtimeConfig, many `process.env.*`, secrets policy docs | **Critical** | Outage or secret leak; misconfigured providers |
| **CI / E2E gates** | Vitest suites, Playwright login/isolation, `.github/workflows/ci.yml` | **High** (process) | False green merges or blocked ship path |

---

## Blast-radius tiers (quick index)

### Critical (security / money / tenancy)

- Authentication  
- Authorization / roles  
- Multi-tenant isolation  
- RLS  
- Supabase admin/user clients  
- Tenant payments (Wallee)  
- Stripe SaaS billing  
- Environment / secrets  

### High (core product coupling)

- Users/profiles, tenants/branding/terminology  
- Appointments, availability, public booking  
- EventModal, pricing  
- Admin console, invoices/accounting, cash/credits  
- Cron platform, messaging  
- Platform super-admin  

### Medium

- Marketing/GBP/affiliate/imports/documents/evaluations/i18n  
- Customer portal (still user-facing; narrower than admin)  
- Website builder (high for public SEO, medium for core lesson ops)

---

## Suggested test emphasis by area

| Area | Prefer |
|------|--------|
| Auth / isolation | Playwright `e2e/login.spec.ts`, `e2e/isolation.spec.ts`; manual role matrix |
| Payments / Wallee / credits | Existing Vitest payment/credit suites; webhook/recovery dry-runs; manual checkout |
| Accounting / invoices | Large Vitest accounting set; sample invoice PDF/amounts |
| Availability / booking | Slot generation after hours change; public booking reserve/expire |
| RLS / tenant | Manual or SQL policy checks — automated RLS suite largely **NEEDS VERIFICATION** / missing |
| Stripe trial | Upgrade middleware behavior; webhook plan sync |
| Cron | Auth rejection without secret; idempotency of reminder/payment jobs |

---

## Change heuristics

1. Touching **`server/utils/auth.ts`**, cookies, or RLS on **`users`/`tenants`** → treat as **Critical**; run login + isolation E2E.  
2. Touching **`EventModal`** or **`payments`/`wallee`** → expect admin scheduling + money regressions.  
3. Touching **`availability_*`** or availability crons → verify public booking and staff calendar.  
4. Touching **`tenants` plan/trial/website_only** → verify `trial.global` and `website-only.global`.  
5. Adding service-role queries → explicitly filter **`tenant_id`**; do not rely on RLS.  
6. If dependency cannot be proven from repo → write **`NEEDS VERIFICATION`**, do not invent.
