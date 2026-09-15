# Dependency Map

> Generated from repository analysis of `driving-team-app` (Nuxt 3).  
> Legend: **🔴 HIGH BLAST RADIUS** · **CRITICAL** · `NEEDS VERIFICATION` · `ASSUMPTION`  
> Counts are approximate file-hit breadth from the workspace (excluding `node_modules`).

---

## Inventory snapshot (repo-derived)

| Layer | Location | Approx. size |
|-------|----------|--------------|
| Pages | `pages/` | 147 `.vue` |
| Layouts | `layouts/` | 6 |
| Components | `components/` | ~150+ `.vue` (root + subdirs) |
| Composables | `composables/` | 111 |
| Pinia stores | `stores/` | 3 (`auth`, `ui`, `loading`) |
| Server API | `server/api/` | **1077** handlers |
| Server utils | `server/utils/` | ~368 |
| Middleware (client) | `middleware/` | 10 |
| Middleware (server) | `server/middleware/` | 6 |
| Types | `types/` | 13 |
| SQL migrations | `migrations/` + `sql_migrations/` | ~247 + ~179 |
| Documented tables | `docs/DATABASE_TABLES.csv` | 90 (CSV incomplete vs later migrations) |
| Unit tests | `server/utils/__tests__/` + `utils/__tests__/` | Vitest |
| E2E | `e2e/` | Playwright (`login`, `isolation`) |
| Sibling apps | `apps/simy/`, `apps/website/` | Separate Nuxt packages |

---

## Frontend

### Central shared modules 🔴 HIGH BLAST RADIUS

| Module | Path | Breadth (approx.) | Why central |
|--------|------|-------------------|-------------|
| Auth store | `stores/auth.ts` (`useAuthStore`) | ~120 files | Session, roles, tenant trial flags, login redirects |
| Terminology | `composables/useTerminology.ts` | ~158 files | Business-type labels across UI |
| Tenant branding | `composables/useTenantBranding.ts` | ~101 files | Logos/colors/CSS vars |
| Supabase client bridge | `utils/supabase.ts` (`getSupabase`) | ~150 files | Client DB/auth access |
| EventModal (+ composables) | `components/EventModal.vue` + `useEventModal*` | ~57 EventModal hits | Appointment create/edit hub |
| Features | `composables/useFeatures.ts` + `utils/featureCatalog.ts` | ~18 + catalog | Feature gating for admin surfaces |
| UI store | `stores/ui.ts` | ~35 files | Toasts, loading, modals |

### Pages → middleware → layout

```
Public / guest
→ pages/login.vue, login/[tenant].vue, register/*, booking/*, shop.vue, s/[subdomain]/*
→ (often no auth middleware; SSR only on /s/**)
→ layouts: default | minimal | site

Authenticated customer
→ pages/customer-dashboard.vue, customer/*, payment/*
→ middleware: auth (+ trial.global, website-only.global)
→ layout: customer

Staff / admin
→ pages/dashboard.vue, admin/* (~63), staff/*
→ middleware: auth + admin (accountant restricted paths)
→ layout: admin

Platform super admin
→ pages/tenant-admin/*
→ middleware: superadmin (websites/* + cron-status explicitly; other tenant-admin pages: NEEDS VERIFICATION)
→ layout: tenant-admin
```

### User flow dependency chains

#### A. Login / session restore 🔴 HIGH BLAST RADIUS · CRITICAL

```
User Flow: Login
→ Page: pages/login.vue | pages/login/[tenant].vue
→ Plugins: auth-init / auth-restore / session-* / fetch-interceptor
→ Store: useAuthStore.initializeAuthStore
→ API: POST /api/auth/login → GET /api/auth/current-user
→ Server: server/utils/auth.ts (getAuthenticatedUser), cookies.ts
→ Database: auth.users, users, tenants, login_attempts, blocked_ip_addresses, mfa_*
→ RLS: users self/tenant policies; service-role for admin client paths
```

#### B. Public online booking

```
User Flow: Guest/customer books lesson
→ Page: booking/* | services/[tenant] | partner/[slug]
→ Components: booking/* (registration, login, docs, preferences)
→ Composables: useAvailabilitySystem / useSecureAvailability, usePricing, useTenantBranding
→ API: /api/booking/* (availability, reserve, guest-book, create-appointment, pricing)
→ Database: tenants, categories, locations, availability_slots, booking_reservations,
            appointments, payments (optional), users
→ RLS: public SELECT available slots/categories/locations; anon reserve patterns
→ Side effects: availability_recalc_queue, emails (Resend), optional Wallee
```

#### C. Admin appointment via EventModal 🔴 HIGH BLAST RADIUS

```
User Flow: Staff/admin creates or edits appointment
→ Page: pages/dashboard.vue (calendar) | admin appointment surfaces
→ Component: EventModal (+ StudentSelector, PaymentComponent, …)
→ Composables: useEventModalState/Form/Handlers/Api, usePriceCalculation,
               usePayments / usePaymentsNew, useStudents, useDiscounts*
→ API: /api/appointments/*, /api/admin/*, /api/payments/*, /api/students/*
→ Database: appointments, users, products/product_sales, payments, discounts,
            availability_slots, notes, pendencies
→ RLS: tenant staff/admin policies; many writes via service-role admin client
```

#### D. Customer dashboard

```
User Flow: Client views appointments/payments
→ Page: pages/customer-dashboard.vue
→ Layout: customer (+ GlobalReglementModal)
→ Composables: useCustomerPayments, useCurrentUser, useAuthStore
→ API: /api/customer/*
→ Database: appointments, payments, student_credits, user_documents, courses
→ RLS: customer self-read patterns
```

#### E. Tenant branding / multi-tenant shell 🔴 HIGH BLAST RADIUS

```
User Flow: Any branded surface loads
→ Plugins: tenant-branding.client, tenant-restore, tenant-consistency
→ Composables: useTenant, useTenantBranding, useTerminology, usePrimaryColor, useLoadingLogo
→ API: /api/tenants/branding (and related)
→ Database: tenants (+ assets in storage)
→ Affects: layouts/admin.vue, LoadingLogo, almost all customer/admin chrome
```

### Frontend components with elevated blast radius

| Component | Role | Blast |
|-----------|------|-------|
| `EventModal` | Core scheduling/payment UI | 🔴 HIGH BLAST RADIUS |
| `LoadingLogo` | Ubiquitous loading indicator (~25 pages) | Medium–High |
| `Toast` / UI store toasts | Cross-app feedback | Medium |
| `StudentSelector` / `EnhancedStudentModal` | Shared student pickers | Medium |
| `PaymentComponent` | Payment UI surface | Medium–High · CRITICAL for money paths |
| `GlobalReglementModal` | Legal acceptance gate (customer layout) | Medium · CRITICAL for compliance flows |

### Forms / validation

- Client: mostly inline checks + Nuxt UI; **no vee-validate**.
- Password: `usePasswordStrength` → `/api/auth/check-password-pwned`.
- Server: `server/utils/validators.ts`, `email-validator.ts`, `password-validator.ts`.
- Zod: present; used in a **small** set of server APIs (e.g. Wallee/public payment/customer profile) — not a global form layer.

---

## Backend

### Central server modules 🔴 HIGH BLAST RADIUS · CRITICAL

| Module | Path | Breadth | Role |
|--------|------|---------|------|
| Auth helpers | `server/utils/auth.ts` | `getAuthenticatedUser` ~462, `requireAdminProfile` ~166 | Every authenticated API |
| Supabase admin | `server/utils/supabase-admin.ts` | Widespread | Bypasses RLS (service role) |
| Supabase user client | `server/utils/supabase.ts` | Widespread | JWT → RLS-scoped client |
| Cookies | `server/utils/cookies.ts` | Auth APIs | `sb-auth-token` / `sb-refresh-token` |
| Cron auth | `server/utils/cron-auth.ts` | All `/api/cron/*` | Vercel cron / `CRON_SECRET` |
| Email | `server/utils/email.ts` | Many domains | Resend |
| Payment providers | `server/payment-providers/*` | Payments | Factory currently selects **Wallee** when enabled |

### API domain map (top-level under `server/api/`)

| Domain | ~Files | Depends on |
|--------|-------:|------------|
| `admin/` | 327 | auth, tenants, appointments, payments, accounting, courses, GBP/Ads |
| `staff/` | 101 | appointments, students, payments, credits, invoices |
| `gbp/` | 60 | Google Business Profile + gbp_* tables |
| `cron/` | 54 | reminders, availability, SARI, marketing, Wallee recovery, accounting |
| `auth/` | 38 | Supabase Auth, users, MFA, passkeys, security tables |
| `marketing/` | 33 | campaigns, leads, Meta/Google sync |
| `customer/` | 31 | appointments, payments, documents |
| `website/` | 28 | website_* tables, Unsplash/AI |
| `invoices/` | 27 | invoices, dunning |
| `booking/` | 26 | availability, appointments, public booking |
| `payments/` + `wallee/` + `webhooks/` | ~17 | payments, Wallee |
| `stripe/` | 11 | SaaS subscription on `tenants` |
| `sari/` | 19 | SARI SOAP + sari_* tables |
| `courses/` | 19 | courses, registrations, waitlist |

```
Typical authenticated API chain
→ server/middleware/01.auth-cookie-to-header.ts
→ getAuthenticatedUser / requireAdminProfile
→ getSupabaseAdmin() OR getSupabase() with JWT
→ Postgres tables filtered by profile.tenant_id
→ (optional) email/SMS/push/Wallee/Stripe side effects
```

### Server middleware chain

1. `00.well-known.ts` — App Links / well-known  
2. `01.auth-cookie-to-header.ts` — cookie → Bearer 🔴 HIGH BLAST RADIUS  
3. `02.custom-domain.ts` — custom domain routing  
4. `booking-frame-ancestors.ts` — CSP for embeds  
5. `rate-limiting.ts` — API rate limits  
6. `validate-tenant.ts` — partner/affiliate/register slug checks (skips `/api/*`)

---

## Database

### Isolation model 🔴 HIGH BLAST RADIUS · CRITICAL

- **Primary tenant key:** `tenant_id` on business tables.  
- **Users:** `users.tenant_id` + `users.auth_user_id` → `auth.users`.  
- **Companies:** `companies` / `company_billing_addresses` are **billing entities within a tenant**, not the multi-tenant root.  
- **Platform override:** `role = 'super_admin'` (and service role) can cross tenants.

### Core table clusters (from `docs/DATABASE_TABLES.csv` + later migration evidence)

| Cluster | Tables (representative) | Coupled domains |
|---------|-------------------------|-----------------|
| Identity | `tenants`, `users`, MFA/WebAuthn/login security | Auth, branding, features |
| Scheduling | `appointments`, `locations`, `staff_*`, `availability_*`, `external_calendars` | Booking, calendar, cron |
| Commerce | `payments`, `payment_*`, `products`, `pricing_rules`, `discounts*`, `vouchers*`, `student_credits` | Wallee, cash, invoices |
| Courses | `courses`, `course_*`, `session_participants` | Booking, SARI, payments |
| Billing docs | `invoices`, `invoice_*` | Accounting, dunning |
| Ops | `pendencies`, `notes`, `outbound_messages_queue`, `reminder_*` | Cron, email/SMS |
| Integrations | `sari_*`, gbp_*, website_*, marketing_*, accounting_* | External APIs |

`NEEDS VERIFICATION`: Live Supabase schema vs CSV — many later tables (accounting, GBP, website, marketing, accountant_grants, impersonation_sessions, …) exist in SQL migrations but are incomplete/absent in `DATABASE_TABLES.csv`.

### RLS 🔴 HIGH BLAST RADIUS · CRITICAL

Documented in `docs/RLS_POLICIES.csv`. Dominant patterns:

1. Tenant membership: `tenant_id IN (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid())`  
2. Self access: `auth_user_id = auth.uid()` / own `user_id`  
3. Super admin bypass  
4. Anon public booking reads/updates on slots  
5. Service role full access for Nitro admin client  

Wave migrations also **revoke** client EXECUTE on sensitive DEFINER RPCs (`get_tenant_secret`, etc.).

`NEEDS VERIFICATION`: Which historical policy migrations are currently applied in production.

### Database functions (sample, migration-derived)

- Credits/gift cards: `deduct_student_credit`, `reserve_gift_card_for_payment`, …  
- Accounting: `book_payment_to_accounting`, `allocate_quote_number`  
- Auth helpers: `lookup_auth_user_id_by_email`, session admin RPCs  
- RLS helpers: `can_read_tenant_users`

---

## Authentication / Authorization

### Auth stack

```
Browser / Capacitor
→ HTTP-only cookies (sb-auth-token, sb-refresh-token)  [preferred]
→ OR Capactior/localStorage Supabase session (native / affiliate paths)
→ @nuxtjs/supabase + plugins (bridge, persist, refresh interceptor)
→ Pinia useAuthStore
→ Route middleware: auth | admin | superadmin | trial.global | website-only.global
→ API: getAuthenticatedUser → users row + tenants trial/subscription flags
```

### Roles (code-derived from `stores/auth.ts` + server helpers)

| Role string | Frontend flags | Typical access |
|-------------|----------------|----------------|
| `admin` | `isAdmin` | Tenant admin UI |
| `staff` | `isStaff` | Instructor/employee |
| `client` | `isClient` | Customer |
| `super_admin` | `isSuperAdmin` | Platform console |
| `accountant` | `isAccountant` | Accounting/payroll subset via grants |
| `tenant_admin` | treated like admin in places | `NEEDS VERIFICATION` if first-class DB value |
| `admin_level: sub_admin` | account-switch | Sub-admin under admin |

`ASSUMPTION`: Canonical DB CHECK constraint for `users.role` matches the Pinia role strings; overlapping literals (`customer`/`student`/`superadmin`) appear in some code paths and need canonicalization.

### Authorization enforcement layers

1. **Route middleware** (UX gate)  
2. **API `requireAdminProfile` / `requireAdminOnly` / accountant helpers** (authoritative for mutations)  
3. **RLS** (defense-in-depth when using JWT client; weaker when service-role admin is used)  
4. **Feature flags** (`useFeatures` / `featureCatalog`) for product surface  

🔴 HIGH BLAST RADIUS: Changing role strings, cookie names, `getAuthenticatedUser`, or RLS tenant subquery breaks isolation and login globally.

---

## External Services

| Service | Used for | Key entry points |
|---------|----------|------------------|
| **Supabase** | Auth, Postgres, Storage, Realtime | `utils/supabase.ts`, `server/utils/supabase*.ts` |
| **Wallee** 🔴 | Tenant checkout (lessons/shop/courses) | `server/api/wallee/*`, `payments/*`, webhook, crons recovery |
| **Stripe** 🔴 | Platform SaaS + website billing | `server/api/stripe/*`, `apps/simy` prices |
| **Resend** | Transactional email | `server/utils/email.ts`, crons |
| **Twilio** | SMS | `server/utils/sms.ts` |
| **Firebase** | Native push | `server/utils/push.ts`, `/api/push/*` |
| **Google** Maps/Places/Distance/GBP/Ads/GA4/GSC | Booking geo, marketing, GBP | `server/api/gbp/*`, marketing crons, geocoding |
| **Meta** | Pixel + CAPI | marketing sync crons |
| **SARI** | CH driving-school course sync | `server/api/sari/*`, cron `sync-sari-courses` |
| **OpenAI / Anthropic** | OCR / AI website / marketing / GBP | website + marketing + receipt paths |
| **Unsplash** | Website images | website APIs |
| **Vercel** | Hosting, crons, domains, log drain | `vercel.json`, integrations API |
| **hCaptcha** | Bot protection on auth | login/register flows |
| **BillScan** | Accounting QR | runtimeConfig `billScanApiKey` |
| **R2** | Credential/backup storage (env-referenced) | security/credential APIs |

`NEEDS VERIFICATION`: Whether Supabase Edge Functions under `supabase/functions/` (send-email, payment-reminder, staff-invitation) are still production-active vs Nitro Resend.

Payment docs note: `docs/PAYMENT_PROVIDERS.md` references `/api/payment-gateway/*` which **does not exist** in the repo; factory hardcodes Wallee for tenant checkout (`NEEDS VERIFICATION` / outdated docs).

---

## Shared Infrastructure

### Environment / runtimeConfig (names only)

From `nuxt.config.ts` + server `process.env` usage (non-exhaustive):

- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`  
- Wallee / Stripe / Resend / Twilio / Firebase / Maps / Vercel / Unsplash / hCaptcha  
- Secrets: `CRON_SECRET`, `ENCRYPTION_KEY`, `IBAN_ENCRYPTION_KEY`, `ACCOUNT_SWITCH_COOKIE_SECRET`, `INTERNAL_API_SECRET`, webhook secrets  

No root `.env.example`; partial examples under `apps/simy` and `apps/website`.

### Cron jobs (`vercel.json` → `/api/cron/*`)

High-coupling crons (blast into core domains):

- Availability: `calculate-availability`, `process-recalc-queue`  
- Payments: `send-payment-reminders`, `recover-pending-wallee-payments`, `detect-suspicious-zero-payments`  
- Messaging: `process-outbound-messages`, appointment/course/instructor reminders  
- Integrations: SARI, marketing syncs, GBP publish/poll  
- Accounting: lock entries, recurring, year-end  

### Tests

| Suite | Path | Coverage focus |
|-------|------|----------------|
| Vitest | `server/utils/__tests__/` | accounting, auth/email-claim, payments/Wallee, credits, invoices, SMS, validators, rate-limiter, … |
| Vitest | `utils/__tests__/` | shared utils |
| Playwright | `e2e/login.spec.ts`, `e2e/isolation.spec.ts` | login + tenant isolation |
| CI | `.github/workflows/ci.yml` | **Test and lint** + **E2E login** (required for main) |

Gaps (factual): most of 1077 API handlers lack dedicated tests; RLS/security largely undocumented as automated suites in Vitest include paths.

### Sibling apps

```
apps/simy (marketing / Stripe prices)
apps/website (public marketing site APIs)
→ share Supabase + some env naming
→ deploy separately from main app.simy.ch Nuxt app
```

---

## Cross-cutting “hub” dependencies (summary)

Mark as **🔴 HIGH BLAST RADIUS** when changed:

1. `users` + `tenants` schema / RLS  
2. `server/utils/auth.ts` + auth cookies + auth plugins/store  
3. `getSupabase` / `getSupabaseAdmin` credential & client behavior  
4. `appointments` + `availability_slots` + recalc queue  
5. `payments` + Wallee webhook/recovery  
6. `EventModal` composable cluster  
7. `useTenantBranding` / `useTerminology` / feature catalog  
8. Global middleware (`trial.global`, `website-only.global`, cookie→header)  
9. Cron auth + outbound message pipeline  
10. Stripe subscription fields on `tenants` (gates product access via trial middleware)

---

## Open verification items

| Item | Status |
|------|--------|
| Live schema completeness vs CSV | NEEDS VERIFICATION |
| Production RLS set vs migration history | NEEDS VERIFICATION |
| Edge functions vs Nitro email path | NEEDS VERIFICATION |
| `tenant-admin` pages without `superadmin` middleware | NEEDS VERIFICATION |
| Named `features` / `admin-only` / `validate-tenant` middleware effectiveness | NEEDS VERIFICATION |
| Canonical `users.role` enum | NEEDS VERIFICATION |
| Payment gateway docs vs code | NEEDS VERIFICATION (docs outdated) |
