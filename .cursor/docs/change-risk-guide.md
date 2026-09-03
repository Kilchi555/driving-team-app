# Change Risk Guide

> Decision aid: pick a risk tier **before** coding.  
> Pair with `.cursor/rules/impact-analysis.mdc` and `.cursor/docs/architecture-hotspots.md`.  
> Do not invent coverage — if unclear, write **`NEEDS VERIFICATION`**.

---

## Quick rule

| If your change touches… | Start at tier |
|-------------------------|---------------|
| Copy, isolated page CSS, single admin display page with no shared imports | **LOW** |
| One domain API + its page, no auth/tenant/payment shared utils | **MEDIUM** |
| Shared composable/store/component, EventModal, booking, pricing, crons, admin layout/nav | **HIGH** |
| Auth, cookies, RLS, `tenant_id` filtering, Supabase admin client, Wallee/Stripe money, role gates, secrets | **CRITICAL** |

When in doubt, escalate one tier.

---

## LOW RISK

**What usually qualifies**

- Single-page UI copy / layout tweaks that do **not** alter shared components in `components/` root hubs  
- New page that only consumes existing APIs without changing them  
- Localized CSS under a page that does not change `tenant-branding.css` or global assets  
- Docs-only / Cursor rules / comments  
- Narrow util with no auth/payment imports and few call sites (verify with search)

**Typical blast radius:** 🟢 LOW  

**Minimum checks**

- Manual open of the touched page (desktop; mobile if UI)  
- Lint for the changed files  

**Usually not required**

- Full Impact Analysis document  
- E2E suite  
- DB/RLS review  

**Escalate if:** the file is imported by many others, or sits under hotspots 1–15.

---

## MEDIUM RISK

**What usually qualifies**

- One domain feature (e.g. a single admin CRUD endpoint + page) with clear tenant scoping already present  
- Composable used by a handful of pages (not terminology/branding/auth/EventModal)  
- Messaging template text / single reminder cron tweak without auth or queue semantics changes  
- Feature-flag catalog entry that only gates nav (still verify API)  
- Types that mirror existing fields without schema change  

**Typical blast radius:** 🟠 MEDIUM  

**Required before merge**

1. Short dependency skim (direct callers + 1 level)  
2. **Targeted regression**
   - Vitest if a `server/utils` pure function changed and tests exist  
   - Manual path for the user role that uses the feature  
3. Confirm `tenant_id` filter still present on any new/admin-client query  

**Escalate to HIGH if:** shared pricing, availability, payments, middleware, or EventModal involved.

---

## HIGH RISK

**What usually qualifies**

- `EventModal` or `useEventModal*`  
- Availability / booking APIs, slot schema, recalc crons  
- Pricing calculation  
- `useTerminology` / `useTenantBranding` / admin layout shell  
- Cron auth or multi-domain cron behavior  
- Broad `server/api/admin` shared helpers  
- Cash/credits/voucher balance logic  
- Super-admin pages/APIs (even without RLS change)  
- Global or widely named middleware (non-auth cookie layer still careful)

**Typical blast radius:** 🔴 HIGH  

**Required before coding**

- Complete **Impact Analysis** (see impact-analysis rule) — do not start implementation first  

**Required before merge**

- Listed regression tests from the relevant hotspot  
- Manual verification matrix (roles × main page)  
- For booking/availability: public booking smoke + staff hours → slots  
- For pricing/payments-adjacent: amount check on two entry points if both exist (booking + EventModal)  

**CI:** Ensure **Test and lint** still green; run E2E login if auth-adjacent UI changed.

---

## CRITICAL

**What never ships without security / database / E2E scrutiny**

| Change type | Why critical | Mandatory checks |
|-------------|--------------|------------------|
| `server/utils/auth.ts`, cookies, auth plugins/store session machine | Global authz/authn | Playwright login + isolation; role matrix manual |
| Role strings / `requireAdmin*` / accountant / impersonation | Privilege escalation | Deny tests for weaker roles; security review |
| RLS policies / SECURITY DEFINER RPCs | DB-level exposure | Staging policy verify; anon + authenticated + staff cases; **NEEDS VERIFICATION** live policy set |
| New or changed `getSupabaseAdmin()` queries | RLS bypass | Explicit `tenant_id` filter review; isolation E2E |
| `users` / `tenants` schema affecting identity | Cascades everywhere | Migration review; login; branding; trial flags |
| Wallee payment create/webhook/recovery | Money loss/desync | Payment Vitest + manual pay success/fail; webhook idempotency |
| Stripe webhook / trial middleware / plan fields | Tenant lockout or free access | Trial + subscribed + website_only personas |
| Secrets / runtimeConfig / cron auth loosening | Breach or open crons | Secrets policy; cron reject without secret |
| Anon RLS on booking/payments | Public data/money surface | Explicit security review |

**Process floor**

1. Impact Analysis with **BREAKING / HIGH RISK** marked  
2. Security-minded review (RLS + tenant + auth)  
3. Database review if schema/policy/RPC  
4. E2E login **and** isolation  
5. Domain manual money/booking checks as applicable  
6. Recommendation must be `IMPLEMENT WITH CAUTION` or better — never skip analysis  

**Do not** merge CRITICAL changes because only Vercel preview “looks fine”.

---

## Mapping: change → tests (cheat sheet)

| You changed… | Run / do |
|--------------|----------|
| Auth / session / cookies | `e2e/login.spec.ts`, `e2e/isolation.spec.ts`; manual roles |
| Any `tenant_id` query / RLS | Isolation E2E + two-tenant manual |
| Wallee / payments utils | Vitest payment suites; manual checkout |
| Credits / cash | Vitest credit suites; balance manual |
| Accounting utils | Existing accounting Vitest cluster |
| EventModal / appointments UI | Manual create/edit/pay; desktop |
| Booking / availability / crons | Public booking smoke; slot recalc; cron auth reject |
| Stripe / trial middleware | Upgrade lock + subscribed access |
| Terminology / branding only | Visual smoke two tenants |
| Single admin page | Manual that page + matching role deny |
| Docs / Cursor rules only | None (LOW) |

---

## Red flags (auto-escalate)

- File is in the TOP 15 of `architecture-hotspots.md`  
- Import breadth is large (search shows dozens of consumers)  
- Change touches both frontend and `server/utils/auth` or supabase-admin  
- Migration in `migrations/` or `sql_migrations/`  
- Webhook or cron path  
- “Temporary” skip of tenant filter or RLS  

If any red flag applies → **HIGH** minimum; security/money/tenant → **CRITICAL**.

---

## Gaps to remember

- Most of ~1077 API handlers lack dedicated tests — **manual verification matters**.  
- RLS automation is thin — do not assume CI proves policies.  
- Middleware attachment for some named middlewares is **`NEEDS VERIFICATION`**.  
- `types/supabase.ts` may lag live schema — **`NEEDS VERIFICATION`**.
