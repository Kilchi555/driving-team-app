# F-02 Remediation — Public `/api/auth/manage` Auth Bypass

**Date:** 2026-09-02  
**Scope:** F-02 only (`signin-password`, `signup`, and related manage ops + callers)  
**Branch:** `cursor/f02-remediation-bb9a`  
**Status:** REMEDIATED in code (awaiting merge/deploy for live close)

---

## Root Cause

`server/api/auth/manage.post.ts` was a legacy catch-all that:

1. Instantiated a **module-level Supabase client with the service role key**.
2. Exposed **unauthenticated** operations:
   - `signin-password` → `auth.signInWithPassword` → full session (bypassed `/api/auth/login` rate limit, progressive limits, optional hCaptcha, IP blocklist, cookie session hardening).
   - `signup` → `auth.signUp` via service role path → **uncontrolled Auth user factory** (auto-confirm / metadata controllable by client).
   - `set-session`, `get-session`, `reset-password-email` similarly public.
3. “Protected” `update-user` called undefined `getServerSession` and used service-role `updateUser` incorrectly — broken auth gate, not a safe design.

Any unauthenticated client could therefore:

`POST /api/auth/manage { action: "signin-password" }` → session  
without the hardened login pipeline.

---

## Changes

| File | Change |
|------|--------|
| `server/api/auth/manage.post.ts` | Replaced with **410 Gone** stub; no Supabase client; no privileged ops |
| `pages/register-staff.vue` | Post-register auto-login → `POST /api/auth/login` |
| `pages/reset-password.vue` | Recovery `setSession` + password `updateUser` via **client** `getSupabase()` |
| `pages/login/set-password.vue` | Invite password set via client `updateUser` / `getUser` |
| `server/utils/__tests__/f02-auth-manage-remediation.test.ts` | Contract + handler tests (A/B) |
| `audits/2026-09-02-f02-remediation.md` | This report |

**Not changed (out of scope):** F-03…F-08, payment tokens, vouchers, RLS, Wallee, reminder logs.

---

## Removed / Blocked Operations

All former `/api/auth/manage` actions now return **HTTP 410** with `data.code = AUTH_MANAGE_RETIRED`:

- `signin-password`
- `signup`
- `reset-password-email`
- `get-session`
- `set-session`
- `update-user`

The route file is retained as an explicit retirement surface (clearer than a silent 404 for stale clients).

---

## Caller Migration

| Caller | Before | After |
|--------|--------|-------|
| `pages/register-staff.vue` | manage `signin-password` | `/api/auth/login` (hardened; sets auth cookies) |
| `pages/reset-password.vue` | manage `set-session` + `update-user` | Client Supabase recovery session + `updateUser` |
| `pages/login/set-password.vue` | manage `update-user` | Client `updateUser` with invite JWT |

Staff **registration** itself was already invitation-gated at `POST /api/staff/register` (tenant/role from `staff_invitations`, not client-supplied alone). Only the post-register login was migrated.

Preferred password reset UI remains `pages/password-reset.vue` → `/api/auth/validate-reset-token` + `/api/auth/reset-password` (token, expiry, single-use `used_at`, user binding server-side).

---

## Login Flow (legitimate)

```
Browser / native
  → POST /api/auth/login  (email, password, optional captchaToken, tenantId, rememberMe)
  → IP blocklist check
  → optional hCaptcha
  → rate limit (+ progressive history)
  → anon signInWithPassword
  → MFA branch if required
  → setAuthCookies (httpOnly)
  → success session
```

No alternate public password-signin API remains on `/api/auth/manage`.

---

## Signup Flow (secure paths)

| Flow | Endpoint | Authorization |
|------|----------|---------------|
| Customer | `/api/auth/register` / `register-client` | Server-controlled role/tenant from slug/tenant context (not manage signup) |
| Staff | `/api/staff/register` | Pending `invitationToken`; `tenant_id` + `role: 'staff'` from invitation row |

**Public `manage` signup is eliminated** (410). Product does not use manage for customer registration.

### Residual (documented, not fixed in F-02)

- `POST /api/auth/complete-registration` still accepts client `role` / `tenant_id` with whitelist `staff`/`admin` for an authenticated invitee — separate hardening follow-up if invite metadata can be forged.
- Client-side `signInWithPassword` remains in affiliate/shop and MFA/register helpers (not the manage bypass); see inventory below.

---

## Password Reset

1. **Primary:** `password-reset-request` → email/SMS with DB token → `password-reset.vue` → `reset-password` (validates token / expiry / `used_at` / binds to user; rejects bare `userId + newPassword`).
2. **Legacy hash recovery page** (`reset-password.vue`): browser establishes recovery session from URL hash tokens via anon client `setSession`, then `updateUser({ password })` — no service-role manage.

---

## Remaining `signInWithPassword` inventory (productive)

| Location | Role |
|----------|------|
| `server/api/auth/login.post.ts` | Hardened public login |
| `server/api/auth/verify-mfa-login.post.ts` | MFA completion |
| `server/api/auth/register.post.ts` | Post-register session |
| `server/api/auth/update-password-strength.post.ts` | Re-verify current password |
| `pages/shop.vue`, `pages/affiliate-dashboard.vue` | Client affiliate/shop login (localStorage session) |
| `plugins/02-supabase-auth-interceptor.client.ts` | Comment only |

**None** of these reintroduce the unauthenticated manage bypass.

---

## Security Tests

| ID | Scenario | Result |
|----|----------|--------|
| **A** | Unauth `signin-password` on manage | **PASS** (unit: 410 `AUTH_MANAGE_RETIRED`; source: no `signInWithPassword`) |
| **B** | Unauth `signup` on manage | **PASS** (unit: 410; no Auth user creation path in handler) |
| **C** | Credential stuffing on legitimate login | **PASS** (contract: rate limit + IP + captcha hooks present in `login.post.ts`); live multi-attempt against prod **NOT VERIFIED** in this run |
| **D** | Privilege escalation via manage signup (`role=admin/staff/super_admin`, foreign `tenant_id`) | **PASS** (manage signup blocked 410 — request never reaches Auth) |
| **E** | Cross-tenant staff create | **PASS** (contract: `/api/staff/register` uses `invitation.tenant_id`); live cross-tenant probe **NOT VERIFIED** |
| **F** | Password reset valid vs bad/expired/replayed token | **PASS** (contract: token/expiry/`used_at` in `reset-password.post.ts`); live token exercise **NOT VERIFIED** |
| **G** | Legitimate login still sets session cookies | **PASS** (contract: `setAuthCookies` in login); live E2E **NOT VERIFIED** (CI E2E login after merge) |

Live production probes against `app.simy.ch` before merge still hit the **old** manage handler; post-deploy re-test is a separate Verification run.

---

## Other findings observed (not fixed)

1. `complete-registration` role/tenant client fields (see above).
2. Affiliate/shop direct client `signInWithPassword` lacks the same server rate-limit path as `/api/auth/login` — separate finding.
3. Historical verification may have left orphan Auth users from public manage signup (e.g. `f02-retest-nonexistent@example.com`) — ops cleanup, not code.

---

## Verdict

**F-02 code remediation: COMPLETE for scope**  
**Production Blocker until merge + deploy:** YES (live still ships old manage until this PR merges to `main`)
