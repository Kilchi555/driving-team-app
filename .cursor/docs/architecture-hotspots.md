# Architecture Hotspots

> Practical engineering map: **„If I change file X tomorrow — what breaks?“**  
> Condensed from repo analysis + `.cursor/docs/{dependency-map,system-map,impact-matrix}.md`.  
> Max **20** hotspots, ordered by risk × blast radius.  
> Tags: `NEEDS VERIFICATION` · `ASSUMPTION` · **CRITICAL**

| Priority | Meaning |
|----------|---------|
| **P0** | Critical — security, money, or tenant isolation |
| **P1** | High — core product path, wide fan-out |
| **P2** | Medium — important domain, narrower blast |
| **P3** | Lower — still shared, but usually contained |

---

## TOP 20 — index

| # | P | Hotspot | Blast | Primary locations |
|---|---|----------|-------|-------------------|
| 1 | P0 | Server auth gate | 🔴 HIGH | `server/utils/auth.ts`, `cookies.ts` |
| 2 | P0 | Auth store + session plugins | 🔴 HIGH | `stores/auth.ts`, `plugins/auth-*`, `session-*` |
| 3 | P0 | Multi-tenant isolation | 🔴 HIGH | `tenant_id` filters, RLS, branding plugins |
| 4 | P0 | Supabase clients (esp. admin) | 🔴 HIGH | `utils/supabase.ts`, `server/utils/supabase*.ts` |
| 5 | P0 | RLS policies | 🔴 HIGH | `migrations/`, `sql_migrations/`, RLS docs |
| 6 | P0 | Tenant payments (Wallee) | 🔴 HIGH | `server/api/wallee/`, `payments/`, webhook |
| 7 | P0 | Stripe SaaS / trial gates | 🔴 HIGH | `server/api/stripe/`, `trial.global.ts` |
| 8 | P1 | EventModal appointment hub | 🔴 HIGH | `components/EventModal.vue`, `useEventModal*` |
| 9 | P1 | Availability / booking engine | 🔴 HIGH | `availability_*`, `server/api/booking/`, crons |
| 10 | P1 | Route + server middleware | 🔴 HIGH | `middleware/`, `server/middleware/` |
| 11 | P1 | Admin layout / nav shell | 🟠 MEDIUM→HIGH | `layouts/admin.vue`, admin pages |
| 12 | P1 | Terminology + branding | 🔴 HIGH | `useTerminology`, `useTenantBranding` |
| 13 | P1 | Pricing engine | 🔴 HIGH | `usePricing`, `usePriceCalculation`, `pricing_rules` |
| 14 | P1 | Cron auth + job platform | 🔴 HIGH | `cron-auth.ts`, `server/api/cron/`, `vercel.json` |
| 15 | P1 | Platform super-admin | 🔴 HIGH | `pages/tenant-admin/`, `server/api/tenant-admin/` |
| 16 | P2 | Feature catalog / flags | 🟠 MEDIUM | `featureCatalog.ts`, `useFeatures` |
| 17 | P2 | Cash / credits / vouchers | 🟠 MEDIUM→HIGH | credits/cash/voucher APIs + composables |
| 18 | P2 | Messaging pipeline | 🟠 MEDIUM | `email.ts`, `sms.ts`, `push.ts`, outbound queue |
| 19 | P2 | Admin API surface | 🟠 MEDIUM→HIGH | `server/api/admin/` (~327 handlers) |
| 20 | P2 | Shared UI (LoadingLogo / Toast / selectors) | 🟢 LOW→🟠 MEDIUM | root `components/` |

---

## HOTSPOT 1 — Server auth gate

**Name:** Server authentication & authorization helpers  
**Priority:** P0 · **CRITICAL**  
**Location:** `server/utils/auth.ts`, `server/utils/cookies.ts`, `server/utils/auth-helper.ts`, `server/utils/accountant-access.ts`, `server/utils/account-switch.ts`  
**Purpose:** Resolve JWT/cookies → user profile + tenant; enforce admin/staff/accountant gates for Nitro APIs.  
**Used by:** ~462 call sites for `getAuthenticatedUser`; ~166 for `requireAdminProfile`; essentially all authenticated `/api/*` handlers.  
**Depends on:** Supabase Auth, `users` + `tenants` rows, httpOnly cookies, cookie→Bearer middleware.  
**Blast Radius:** 🔴 HIGH  

**Why risky:** One broken check locks out or over-authorizes the whole API surface. Account-switch/impersonation and accountant grants add privilege edge cases.  
**Changes here require:** Full Impact Analysis; security review of role branches; no silent default-role changes.  
**Required regression tests:** Vitest auth/account-switch suites (where present); Playwright `e2e/login.spec.ts` + `e2e/isolation.spec.ts`.  
**Manual verification:** Login as admin, staff, client, accountant, super_admin; expired session refresh; account switch if used.

---

## HOTSPOT 2 — Auth store + session plugins

**Name:** Client session / Pinia auth  
**Priority:** P0 · **CRITICAL**  
**Location:** `stores/auth.ts`; `plugins/auth-init.client.ts`, `auth-restore.client.ts`, `00-session-persist.client.ts`, `01-session-*.client.ts`, `02-supabase-auth-interceptor.client.ts`, `fetch-interceptor.client.ts`; `middleware/auth.ts`  
**Purpose:** Initialize/restore session, expose roles (`isAdmin`/`isStaff`/`isClient`/`isSuperAdmin`/`isAccountant`), drive redirects.  
**Used by:** ~120 files (`useAuthStore`); almost every authenticated page/layout.  
**Depends on:** `/api/auth/login`, `/api/auth/current-user`, Supabase client bridge, Capacitor session path.  
**Blast Radius:** 🔴 HIGH  

**Why risky:** Cookie vs localStorage (native/affiliate) split-session logic is easy to break → login loops or silent logged-out UI while APIs still work (or reverse). Role computed flags gate entire consoles.  
**Changes here require:** Impact Analysis; native + web login matrix.  
**Required regression tests:** E2E login; isolation.  
**Manual verification:** Web login/logout/refresh; Capacitor login if shipping native; affiliate path if touched (`NEEDS VERIFICATION` for every Capacitor edge).

---

## HOTSPOT 3 — Multi-tenant isolation

**Name:** Tenant boundary  
**Priority:** P0 · **CRITICAL**  
**Location:** `users.tenant_id` / `*.tenant_id`; `composables/useTenant*.ts`; tenant branding/restore/consistency plugins; app-level filters on `getSupabaseAdmin()` queries; RLS tenant subquery pattern  
**Purpose:** Keep every business row and UI context inside one tenant (except `super_admin`).  
**Used by:** Virtually all domains (appointments, payments, users, courses, admin APIs).  
**Depends on:** Auth profile `tenant_id`, slug routing, branding APIs.  
**Blast Radius:** 🔴 HIGH  

**Why risky:** Service-role admin client **bypasses RLS** — isolation then depends on application filters. A missing `eq('tenant_id', …)` is a cross-tenant leak.  
**Changes here require:** Security + DB review; Impact Analysis; never “drive-by” query refactors.  
**Required regression tests:** Playwright isolation; manual two-tenant smoke.  
**Manual verification:** Same action as tenant A must not read/write tenant B data.

---

## HOTSPOT 4 — Supabase clients

**Name:** Supabase client factories  
**Priority:** P0 · **CRITICAL**  
**Location:** `utils/supabase.ts` (`getSupabase` ~150 files); `server/utils/supabase.ts`; `server/utils/supabase-admin.ts`; `plugins/000-supabase-nuxt-bridge.client.ts`; `@nuxtjs/supabase` in `nuxt.config.ts`  
**Purpose:** Browser/SSR/user-JWT clients vs service-role admin.  
**Used by:** Client composables + majority of server handlers.  
**Depends on:** `SUPABASE_URL`, anon/secret/service keys, cookie/JWT wiring.  
**Blast Radius:** 🔴 HIGH  

**Why risky:** Wrong client = either broken app or RLS bypass. Key-format handling (`Bearer sb_*`) is security-sensitive.  
**Changes here require:** Impact Analysis; secret/env checklist; confirm which code paths use admin vs JWT.  
**Required regression tests:** Login E2E; spot-check one admin and one customer API.  
**Manual verification:** Authenticated read still works; unauthenticated cannot hit admin data.

---

## HOTSPOT 5 — RLS policies

**Name:** Postgres Row Level Security  
**Priority:** P0 · **CRITICAL**  
**Location:** `migrations/`, `sql_migrations/`, `docs/RLS_POLICIES.csv`, `docs/RLS_SECURITY_AUDIT.md`  
**Purpose:** DB-enforced access for JWT clients; anon rules for public booking.  
**Used by:** Any path using user-scoped Supabase client; defense-in-depth even when admin client is primary.  
**Depends on:** `auth.uid()`, `users` membership, role strings.  
**Blast Radius:** 🔴 HIGH  

**Why risky:** Overly permissive anon/authenticated policies expose data; overly strict policies break booking/customer portal. Migration history is overlapping — **live applied set: `NEEDS VERIFICATION`**.  
**Changes here require:** Security + DB review; never ship RLS-only changes without staging verification.  
**Required regression tests:** No complete automated RLS suite found in Vitest includes — treat as gap; use SQL/manual + isolation E2E.  
**Manual verification:** Anon booking reads; customer self-only; staff tenant-only; super_admin cross-tenant intentional only.

---

## HOTSPOT 6 — Tenant payments (Wallee)

**Name:** Lesson/shop/course online payments  
**Priority:** P0 · **CRITICAL**  
**Location:** `server/api/wallee/`, `server/api/payments/`, `server/api/webhooks/wallee-payment-success.post.ts`, `server/payment-providers/*`, `server/utils/wallee-*.ts`, recovery cron, payment composables/UI  
**Purpose:** Create/process/confirm tenant customer payments.  
**Used by:** EventModal, booking, shop, courses enrollment, payment pages, reminder crons.  
**Depends on:** `payments*` tables, tenant Wallee credentials, webhooks, optional credits/discounts.  
**Blast Radius:** 🔴 HIGH  

**Why risky:** Money + status desync (paid in Wallee, unpaid in DB or reverse). Factory currently selects Wallee for tenant checkout (`ASSUMPTION` from factory code); docs mentioning `/api/payment-gateway` are outdated (`NEEDS VERIFICATION`).  
**Changes here require:** Impact Analysis; webhook idempotency check; PCI-aware review for card data handling (no PAN in app — follow existing PCI docs).  
**Required regression tests:** Vitest payment/Wallee-related suites under `server/utils/__tests__/`; manual checkout happy + fail path.  
**Manual verification:** Create payment → complete/fail → admin list + customer view + appointment paid flag.

---

## HOTSPOT 7 — Stripe SaaS / trial gates

**Name:** Platform subscription & trial lock  
**Priority:** P0 · **CRITICAL**  
**Location:** `server/api/stripe/*`, `tenants` plan/trial fields, `middleware/trial.global.ts`, `middleware/website-only.global.ts`, `apps/simy` Stripe price env  
**Purpose:** Gate product access by trial/subscription; bill platform plans/addons/website.  
**Used by:** All `/admin|/staff|/customer` routes via global middleware; billing/upgrade pages.  
**Depends on:** Stripe webhooks, tenant columns, feature/website_only flags.  
**Blast Radius:** 🔴 HIGH  

**Why risky:** Wrong trial/plan sync locks paying tenants out or leaves churned tenants in. Global middleware amplifies any flag mistake.  
**Changes here require:** Impact Analysis; webhook + middleware matrix.  
**Required regression tests:** Manual trial expired → `/upgrade`; active plan → admin OK; website_only lock paths.  
**Manual verification:** At least one trial-expired and one subscribed tenant persona.

---

## HOTSPOT 8 — EventModal appointment hub

**Name:** EventModal (+ composable cluster)  
**Priority:** P1  
**Location:** `components/EventModal.vue`; `composables/useEventModalState.ts`, `useEventModalForm.ts`, `useEventModalHandlers.ts`, `useEventModalApi.ts`; related student/payment selectors  
**Purpose:** Primary admin/staff create/edit appointment UI (scheduling + pricing + payment hooks).  
**Used by:** ~57 EventModal references; dashboard/calendar flows.  
**Depends on:** appointments APIs, students, pricing, payments, categories, auth/tenant context.  
**Blast Radius:** 🔴 HIGH  

**Why risky:** Single UI hub for core ops — a state/race bug breaks create/edit for most tenants’ daily work.  
**Changes here require:** Targeted Impact Analysis; keep payment/pricing side effects explicit.  
**Required regression tests:** No dedicated EventModal E2E found — rely on manual + any unit coverage nearby (`NEEDS VERIFICATION`).  
**Manual verification:** Create, edit, cancel; with/without payment; student select; conflict handling; desktop.

---

## HOTSPOT 9 — Availability / booking engine

**Name:** Slots, recalc queue, public booking  
**Priority:** P1  
**Location:** `availability_slots`, `availability_recalc_queue`; `server/api/booking/*`; availability composables; crons `calculate-availability`, `process-recalc-queue`; staff hours / external calendars  
**Purpose:** Precompute bookable slots; power public + admin booking.  
**Used by:** Public booking funnel, EventModal availability, partner/services pages.  
**Depends on:** staff_working_hours, appointments, locations, anon RLS update patterns for reservations.  
**Blast Radius:** 🔴 HIGH  

**Why risky:** Wrong slots = overbooking or empty calendar (revenue + trust). Anon reserve policies are security-sensitive.  
**Changes here require:** Impact Analysis for schema/cron/API; load-test mindset for races.  
**Required regression tests:** Manual slot after hours change; reserve/expire; guest-book path.  
**Manual verification:** Public booking for a tenant slug; staff hours edit → slots update (cron or queue).

---

## HOTSPOT 10 — Route + server middleware

**Name:** Global and named middleware  
**Priority:** P1  
**Location:** Client: `middleware/auth.ts`, `admin.ts`, `superadmin.ts`, `trial.global.ts`, `website-only.global.ts`, `native-redirect.global.ts`, `affiliate-referral.global.ts`, `features.ts`, `validate-tenant.ts`; Server: `01.auth-cookie-to-header.ts`, `rate-limiting.ts`, `02.custom-domain.ts`, …  
**Purpose:** Enforce login/role/trial/website locks; promote cookies to Bearer; rate limit; custom domains.  
**Used by:** All matched routes / all API traffic.  
**Depends on:** Auth store, tenant flags, feature catalog (for features middleware).  
**Blast Radius:** 🔴 HIGH  

**Why risky:** Global middleware affects every protected navigation. Cookie→header is auth backbone. Several named middlewares have unclear runtime attachment (`features`, `validate-tenant` mostly no-op, missing `admin-only`) — **`NEEDS VERIFICATION`**.  
**Changes here require:** Impact Analysis for globals; map which pages declare named middleware.  
**Required regression tests:** E2E login; manual accountant restricted to accounting/payroll; website_only tenant lock.  
**Manual verification:** Unauthenticated redirect; wrong-role redirect; trial expired behavior.

---

## HOTSPOT 11 — Admin layout / nav shell

**Name:** Admin chrome  
**Priority:** P1  
**Location:** `layouts/admin.vue`; `pages/admin/*` (~63); feature-gated nav links  
**Purpose:** Shell for tenant operations; accountant/website-only variants.  
**Used by:** All admin pages using `layout: 'admin'`.  
**Depends on:** `useAuthStore`, `useFeatures`, branding, terminology.  
**Blast Radius:** 🟠 MEDIUM (layout-only) → 🔴 HIGH if nav/feature gates wrong  

**Why risky:** Broken layout blocks ops UI; wrong feature gate hides critical tools or shows unpaid features.  
**Changes here require:** Check featureCatalog alignment with APIs.  
**Required regression tests:** Smoke open key admin pages (users, calendar/dashboard, payments, settings).  
**Manual verification:** Admin vs accountant nav; website_only admin subset.

---

## HOTSPOT 12 — Terminology + branding

**Name:** Cross-app labels and tenant look  
**Priority:** P1  
**Location:** `composables/useTerminology.ts` (~158 files); `composables/useTenantBranding.ts` (~101); tenant plugins; `assets/css/tenant-branding.css`; `LoadingLogo`  
**Purpose:** Business-type wording + logos/colors/CSS variables.  
**Used by:** Most customer/admin UI.  
**Depends on:** `tenants` / branding APIs, business type.  
**Blast Radius:** 🔴 HIGH (breadth) — usually not security-critical  

**Why risky:** High fan-out: one API shape change breaks labels/colors everywhere. Less often data-loss, but high user-visible regression.  
**Changes here require:** Spot-check multiple business types if terminology logic changes.  
**Required regression tests:** Visual smoke; no dedicated suite required unless logic branches change.  
**Manual verification:** Two tenants with different branding; one admin + one booking page.

---

## HOTSPOT 13 — Pricing engine

**Name:** Price calculation  
**Priority:** P1  
**Location:** `composables/usePricing.ts`, `usePriceCalculation.ts`, `pricing_rules`, products/discounts integration, booking pricing APIs  
**Purpose:** Compute lesson/product totals for booking and EventModal.  
**Used by:** Booking, EventModal, payment creation paths.  
**Depends on:** products, categories, discounts, duration rules, tenant settings.  
**Blast Radius:** 🔴 HIGH (money accuracy)  

**Why risky:** Silent under/overcharge across multiple entry points.  
**Changes here require:** Impact Analysis; compare booking vs EventModal totals for same inputs.  
**Required regression tests:** Any pricing-related Vitest (travel fee etc. where present); manual amount checks.  
**Manual verification:** Standard lesson, discount, product add-on, credit application.

---

## HOTSPOT 14 — Cron auth + job platform

**Name:** Scheduled jobs  
**Priority:** P1  
**Location:** `server/utils/cron-auth.ts`; `server/api/cron/*` (~54); `vercel.json` crons  
**Purpose:** Availability, reminders, Wallee recovery, SARI/marketing/GBP/accounting jobs.  
**Used by:** Production schedule; domains above depend on job success.  
**Depends on:** `CRON_SECRET` / Vercel cron header; outbound providers.  
**Blast Radius:** 🔴 HIGH  

**Why risky:** Auth too loose → public job trigger; auth too strict/silent fail → stale slots, missed payments recovery, spam gaps.  
**Changes here require:** Verify cron auth; idempotency for send/payment jobs.  
**Required regression tests:** Reject unauthenticated cron call; dry-run critical job if safe.  
**Manual verification:** Check cron-status / logs after deploy for failed runs.

---

## HOTSPOT 15 — Platform super-admin

**Name:** Tenant-admin / platform console  
**Priority:** P1  
**Location:** `pages/tenant-admin/*`, `layouts/tenant-admin.vue`, `server/api/tenant-admin/`, `server/api/super-admin/`, impersonation/session helpers  
**Purpose:** Cross-tenant platform operations, websites, prospects.  
**Used by:** Platform operators (`super_admin`).  
**Depends on:** `middleware/superadmin.ts` (explicit on some pages only — **`NEEDS VERIFICATION`** for others), auth roles.  
**Blast Radius:** 🔴 HIGH (cross-tenant)  

**Why risky:** Privilege + cross-tenant; incomplete middleware coverage would rely on API checks alone. Impersonation is especially sensitive.  
**Changes here require:** Security review; confirm API `require*` on every mutation.  
**Required regression tests:** Non-superadmin denied; superadmin happy path.  
**Manual verification:** Access denied as tenant admin; allowed as super_admin; impersonation start/stop if changed.

---

## HOTSPOT 16 — Feature catalog / flags

**Name:** Feature gating  
**Priority:** P2  
**Location:** `utils/featureCatalog.ts`, `composables/useFeatures.ts`, `/api/features/*`, admin nav; `middleware/features.ts` (**attachment `NEEDS VERIFICATION`**)  
**Purpose:** Enable/disable product modules per tenant.  
**Used by:** Admin UI (~18 composable consumers + catalog-driven nav).  
**Depends on:** Tenant feature storage (`NEEDS VERIFICATION` exact table/columns if not obvious from composable).  
**Blast Radius:** 🟠 MEDIUM  

**Why risky:** Nav hidden but API open (or reverse) confuses authZ story.  
**Changes here require:** Align catalog ↔ layout ↔ API.  
**Required regression tests:** Toggle one feature; confirm page + API.  
**Manual verification:** Feature off → redirect/toast; feature on → works.

---

## HOTSPOT 17 — Cash / credits / vouchers

**Name:** Non-card payment instruments  
**Priority:** P2  
**Location:** cash_* tables/APIs; `student_credits` / `useStudentCredits`; vouchers/discounts composables + APIs; DB functions like `deduct_student_credit`  
**Purpose:** Record cash, apply wallet credits, redeem vouchers/discounts.  
**Used by:** Staff payment flows, EventModal, shop.  
**Depends on:** payments rows, balances, audit tables.  
**Blast Radius:** 🟠 MEDIUM → 🔴 HIGH for balance mutations  

**Why risky:** Balance drift and non-idempotent deducts.  
**Changes here require:** Transactionality check; Impact Analysis for credit RPCs.  
**Required regression tests:** Vitest student-credit suites.  
**Manual verification:** Apply credit → balance; cash confirm → receipt; voucher once-only.

---

## HOTSPOT 18 — Messaging pipeline

**Name:** Email / SMS / push / reminders  
**Priority:** P2  
**Location:** `server/utils/email.ts`, `sms.ts`, `push.ts`; `outbound_messages_queue`; reminder crons; `/api/email*`, `/api/sms`, `/api/push`  
**Purpose:** Transactional and reminder communications.  
**Used by:** Appointments, payments, onboarding, marketing-ish reports.  
**Depends on:** Resend, Twilio, Firebase; templates; cron auth.  
**Blast Radius:** 🟠 MEDIUM  

**Why risky:** Duplicate sends or silence; quota burn. Edge Functions may still exist in parallel (`NEEDS VERIFICATION`).  
**Changes here require:** Idempotency / stage checks for reminder crons.  
**Required regression tests:** Template unit tests if present; avoid live blast in prod.  
**Manual verification:** One appointment reminder path in staging; SMS only if explicitly needed.

---

## HOTSPOT 19 — Admin API surface

**Name:** `/api/admin/*`  
**Priority:** P2  
**Location:** `server/api/admin/` (~327 handlers)  
**Purpose:** Broad tenant administration backend.  
**Used by:** Admin pages/components.  
**Depends on:** Hotspots 1, 3, 4; domain tables.  
**Blast Radius:** 🟠 MEDIUM per endpoint → 🔴 HIGH for shared admin utils  

**Why risky:** Huge surface; inconsistent auth patterns possible across handlers (`ASSUMPTION`: most use requireAdmin*, not proven for all 327).  
**Changes here require:** Per-endpoint auth audit when touching shared admin helpers.  
**Required regression tests:** Targeted Vitest if utils change; manual page that calls the endpoint.  
**Manual verification:** Role denied for staff/client on admin-only mutation.

---

## HOTSPOT 20 — Shared UI primitives

**Name:** LoadingLogo, Toast, StudentSelector, PaymentComponent, GlobalReglementModal  
**Priority:** P2 (PaymentComponent/Reglement closer to P1 if payment/legal path)  
**Location:** `components/LoadingLogo.vue`, Toast usage via `stores/ui.ts`, `StudentSelector`, `PaymentComponent`, `components/global/*` / reglement modal, `app.vue` HelpModal/NativePushPrompt  
**Purpose:** Shared interaction chrome.  
**Used by:** Many pages (LoadingLogo ~25; Toast ~18; selectors fewer).  
**Depends on:** Branding, UI store, domain APIs for selectors/payments.  
**Blast Radius:** 🟢 LOW (pure presentational) → 🟠 MEDIUM (PaymentComponent / reglement gate)  

**Why risky:** Visual/UX regressions widely; PaymentComponent and reglement modal affect money/compliance flows.  
**Changes here require:** Visual smoke; if payment/reglement — treat as higher risk.  
**Required regression tests:** None mandatory for pure CSS; payment path needs manual checkout.  
**Manual verification:** Loading states on admin + customer; reglement accept flow if modal changed.

---

## Intentionally not in TOP 20 (still real)

Documented elsewhere but lower urgency for day-to-day “file X” decisions: Marketing/GBP/Ads, SARI (important when touching courses), website SSR `/s/*`, affiliate, imports, i18n extras, `types/supabase.ts` drift. Promote into hotspots when actively changing those domains.
