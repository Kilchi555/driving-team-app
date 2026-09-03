# System Map

> Architecture overview of **driving-team-app** for senior developers.  
> Derived from the repository only. Uncertain items are tagged `NEEDS VERIFICATION` or `ASSUMPTION`.

---

## 1. What this system is

Multi-tenant SaaS for driving schools (and related training businesses) branded as **Simy** (`app.simy.ch`).

Primary stack:

- **Nuxt 3** (Vue 3) SPA by default (`routeRules`: `ssr: false` for most routes)
- **SSR island** for public tenant websites under `/s/[subdomain]/**` (ISR)
- **Nitro** server API (~1077 handlers under `server/api/`)
- **Supabase** (Auth + Postgres + Storage)
- **Pinia** for client state
- **Capacitor** Android/iOS wrappers
- Deployed on **Vercel** (crons in `vercel.json`)

Sibling packages (separate apps, same monorepo):

- `apps/simy` — marketing site + Stripe price/contact APIs  
- `apps/website` — DrivingTeam-style marketing/content site  

---

## 2. Major systems

```
┌─────────────────────────────────────────────────────────────────┐
│                        Clients                                  │
│  Browser SPA  ·  Capacitor apps  ·  Public /s sites (SSR)       │
│  Booking embeds  ·  Custom domains                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     Nuxt / Nitro                                │
│  pages/ layouts/ components/ composables/ stores/ plugins/      │
│  middleware (route)          server/middleware                  │
│  server/api/*                server/utils/*                     │
│  payment-providers/          cron handlers                      │
└──────────────┬─────────────────────────────┬────────────────────┘
               │                             │
               ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│  Supabase                │   │  External providers              │
│  Auth · Postgres · RLS   │   │  Wallee · Stripe · Resend        │
│  Storage · (Edge fns?)   │   │  Twilio · Firebase · Google*     │
│                          │   │  Meta · SARI · AI · Unsplash     │
└──────────────────────────┘   └──────────────────────────────────┘
```

### Module map (product domains)

| System | Responsibility | Primary code areas |
|--------|----------------|--------------------|
| **Identity & tenancy** | Login, MFA, passkeys, roles, tenant context | `server/api/auth`, `stores/auth`, `users`/`tenants` |
| **Scheduling** | Appointments, calendar, availability | `appointments`, `availability_*`, `EventModal`, booking APIs, crons |
| **Commerce** | Lessons/shop/course payments, cash, credits, vouchers | `payments`, Wallee, credits, discounts |
| **Courses** | VKU/PGS/etc., waitlists, enrollment | `courses`, SARI sync |
| **Invoicing & accounting** | Invoices, dunning, ledger/VAT | `invoices`, accounting_* utils/tests |
| **Customer portal** | Self-service appointments/payments/docs | `pages/customer*`, `server/api/customer` |
| **Admin console** | Tenant ops (~63 admin pages) | `pages/admin`, `server/api/admin` |
| **Platform console** | Super-admin, websites, prospects | `pages/tenant-admin`, `server/api/tenant-admin`, `super-admin` |
| **Website builder** | Tenant public sites | `website_*` APIs/components, `/s/*` |
| **Marketing** | Campaigns, Ads/GA4/GSC/Meta sync | `server/api/marketing`, marketing crons |
| **GBP** | Google Business Profile | `server/api/gbp`, GBP crons |
| **Messaging** | Email/SMS/push/reminders | email/sms/push utils, `outbound_messages_queue` |
| **Billing (SaaS)** | Trial/subscription for tenants | Stripe APIs, `tenants` plan fields, `trial.global` middleware |

---

## 3. Data flow (general)

```
UI action
  → composable / store
    → $fetch(/api/...)
      → server middleware (cookie→Bearer, rate limit, …)
        → getAuthenticatedUser (JWT verify + users profile + tenant flags)
          → getSupabaseAdmin() [service role, app must filter tenant_id]
            OR JWT-scoped Supabase client [RLS applies]
          → Postgres read/write
          → optional: provider call (Wallee/Stripe/Resend/Twilio/…)
          → optional: enqueue outbound_messages / availability_recalc
        ← JSON response
  ← UI update / toast / redirect
```

**CRITICAL**: Large parts of the backend use the **service-role admin client**. Tenant isolation then depends on **application filters** (`profile.tenant_id`), not only RLS. Changing query scoping is a multi-tenant risk.

---

## 4. Authentication flow

```
1. User submits credentials on pages/login(.vue)|login/[tenant]
2. POST /api/auth/login
   - rate limit + blocked_ip_addresses
   - Supabase email/password (+ captcha / MFA / passkey variants)
3. setAuthCookies → httpOnly sb-auth-token + sb-refresh-token
4. Client: useAuthStore loads profile via GET /api/auth/current-user
5. Subsequent API calls:
   - Browser sends cookies
   - server/middleware/01.auth-cookie-to-header copies to Authorization Bearer
   - getAuthenticatedUser validates with Supabase Auth and loads users row
6. Route middleware enforces UX gates (auth/admin/superadmin)
7. Session recovery plugins handle HMR / Capacitor split-session cases
```

Additional paths:

- **Passkeys** — `/api/auth/passkey/*` + WebAuthn tables  
- **MFA** — email codes / methods tables  
- **Account switch / impersonation** — `account-switch` utils + grant tables  
- **Affiliate magic link** — uses Supabase storage session (cookie path skipped)  

Documented client persistence notes: `docs/SESSION_PERSISTENCE.md` (profile cache ≠ tokens).

---

## 5. Authorization flow

```
Request
├─ Layer A: Nuxt route middleware (auth / admin / superadmin / trial / website-only)
├─ Layer B: API helpers
│    requireAdminProfile(['admin','staff','super_admin'] default)
│    requireAdminOnly → admin | super_admin
│    accountant grants → accounting/payroll paths
├─ Layer C: Feature flags (featureCatalog / useFeatures)
└─ Layer D: Postgres RLS (when JWT client used)
     tenant_id membership · self rows · super_admin · anon booking exceptions
```

Role model (Pinia): `admin` | `staff` | `client` | `super_admin` | `accountant`.

`NEEDS VERIFICATION`: Full DB enum and whether `tenant_admin` / `customer` / `student` are aliases only.

---

## 6. Multi-tenant flow

```
Tenant identity
  tenants.id  ←── users.tenant_id
              ←── nearly all business rows.tenant_id

Resolution
  • URL slug (/login/[tenant], /booking…, /partner/[slug], …)
  • Authenticated profile.tenant_id
  • Branding APIs + plugins (useTenant / useTenantBranding)
  • website_only flag narrows product surface (middleware)

Isolation rules
  • App code must scope by tenant_id on admin-client queries  CRITICAL
  • RLS tenant subquery for JWT clients  CRITICAL
  • super_admin + platform Stripe billing can cross/manage tenants
  • company_id is NOT the tenant boundary (billing address entity)
```

---

## 7. Central product data flows

### 7.1 Appointment lifecycle

```
Staff hours / external calendars / appointment changes
  → availability_recalc_queue
  → cron calculate-availability / process-recalc-queue
  → availability_slots

Booking or EventModal
  → reserve slot / create appointment
  → optional payment (cash | credit | Wallee | invoice)
  → notifications (email/SMS/push)
  → status workflow (confirm / complete / evaluate / cancel)
```

### 7.2 Payment lifecycle (tenant checkout)

```
Price calculation (products, discounts, credits, vouchers)
  → create payment row
  → if online: Wallee transaction (tenant credentials)
  → webhook / recovery cron updates status
  → may book accounting, send receipt, clear pendencies
```

`ASSUMPTION` based on `payment-providers/factory.ts`: tenant online checkout path is Wallee-first; Stripe provider class exists but is not selected by that factory for lesson checkout.

### 7.3 SaaS subscription lifecycle

```
Trial on tenants.* fields
  → trial.global middleware may force /upgrade
  → Stripe Checkout / Customer Portal (/api/stripe/*)
  → webhook syncs plan / period on tenants
```

### 7.4 Course + SARI

```
Course catalog (manual and/or SARI sync cron)
  → enrollment + payment
  → course_registrations / participants
  → optional SARI student sync
  → reminders / waitlists
```

### 7.5 Messaging pipeline

```
Domain event or cron
  → template render
  → outbound_messages_queue and/or direct send
  → Resend (email) / Twilio (SMS) / Firebase (push)
  → logs (sms_logs, reminder_logs, …)
```

---

## 8. Frontend architecture notes

- **Page-heavy** admin UI with large shared modals (`EventModal`) rather than many small route fragments.  
- **Auto-imports** for `composables/` and `utils/` (`nuxt.config`).  
- **i18n**: `@nuxtjs/i18n` locales `de/en/fr/it` in config; additional JSON files exist under `locales/` (`NEEDS VERIFICATION` if loaded dynamically).  
- **Design system**: `@nuxt/ui` + tenant CSS variables (`assets/css/tenant-branding.css`).  
- **Validation**: not centralized on client; server validators + selective Zod.

---

## 9. External integrations (by concern)

| Concern | Providers |
|---------|-----------|
| Auth datastore | Supabase Auth |
| Money (lessons) | Wallee (+ cash/credit/voucher/invoice in-app) |
| Money (SaaS) | Stripe |
| Email | Resend (+ possibly legacy Edge Functions) |
| SMS | Twilio |
| Push | Firebase |
| Maps / geo | Google Maps / Distance Matrix / Places |
| Local listings | Google Business Profile |
| Ads / analytics sync | Google Ads, GA4, GSC, Meta CAPI |
| Regulatory courses (CH) | SARI SOAP |
| AI assists | OpenAI / Anthropic |
| Hosting/ops | Vercel (domains, crons, log drain) |

---

## 10. Security-sensitive surfaces · CRITICAL

1. Service-role usage without tenant filters  
2. RLS policy changes on `users`, `appointments`, `payments`, `availability_slots`  
3. Auth cookie / JWT handling and account-switch cookies  
4. Public anon policies for booking/payment insert paths  
5. Wallee/Stripe webhooks (signature verification, idempotency)  
6. Cron endpoints (`CRON_SECRET` / Vercel cron header)  
7. Impersonation / accountant grants  
8. Secrets in `tenant_secrets` / encryption keys  

Existing audits/docs in repo: `docs/RLS_SECURITY_AUDIT.md`, `docs/SERVICE_ROLE_SECURITY_AUDIT.md`, `docs/ACCESS_AND_SECRETS_POLICY.md`, PCI docs.

---

## 11. Test & ship posture

- **Required CI on `main`**: Test and lint (Vitest + lint) + E2E login (Playwright) — see `.cursor/rules/ship-to-main.mdc`.  
- Unit tests concentrate on **server utils** (especially accounting/payments/validators), not full HTTP handler coverage.  
- E2E currently emphasizes **login** and **isolation**.

---

## 12. How to orient quickly in the repo

| Question | Start here |
|----------|------------|
| Who is logged in / role? | `stores/auth.ts`, `server/utils/auth.ts` |
| Tenant branding? | `composables/useTenantBranding.ts`, tenant plugins |
| Create a lesson? | `components/EventModal.vue`, `server/api/appointments`, `booking` |
| Take a payment? | `server/api/payments`, `wallee`, `payment-providers` |
| Schema / RLS docs? | `docs/DATABASE_TABLES.csv`, `docs/RLS_POLICIES.csv`, `migrations/` |
| Scheduled work? | `vercel.json` + `server/api/cron/` |
| Feature gating? | `utils/featureCatalog.ts`, `composables/useFeatures.ts` |
