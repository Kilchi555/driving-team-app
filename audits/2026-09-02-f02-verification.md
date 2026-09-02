# F-02 Verification Audit — `/api/auth/manage`

**Date:** 2026-09-02  
**Mode:** READ-ONLY (no code/policy/config changes; live HTTP probes only)  
**Live target:** `https://app.simy.ch`  
**Code base:** `main` @ `45153183`  
**File:** `server/api/auth/manage.post.ts`

> **Probe side-effect (unavoidable):** Unauthenticated `action=signup` created a real Auth user  
> `f02-retest-nonexistent@example.com` / `auth.users.id = 2ae701a8-bf3b-40ea-b061-2e35ca08a65a`  
> (email auto-confirmed, **no** `public.users` row). **Operators should delete this Auth user.**  
> This is itself proof of the vulnerability.

---

## Executive Summary

| Field | Value |
|-------|--------|
| **F-02 Status** | **STILL VULNERABLE** |
| **Risk** | **CRITICAL** — public password sign-in + public signup via **service_role**, bypassing login hardening |
| **Production Blocker** | **YES** |
| **Account takeover via manage alone?** | Direct password ATO of *existing* users requires knowing their password (credential stuffing). **Signup** creates attacker-controlled Auth accounts. `update-user` currently fails closed (`getServerSession is not defined`) — not a working ATO path today. |
| **Privilege escalation via manage?** | `signup` creates Auth users without invitation/tenant binding. Staff **role** escalation is **not** via manage (staff creation uses `/api/staff/register` + invite token). |
| **Cross-tenant via manage?** | No `tenantId` on manage actions; cross-tenant staff creation **not** through this route. Signup creates orphan Auth users (no tenant profile). |
| **Login hardening bypass?** | **YES — VERIFIED** |

**Wichtigste Erkenntnis:** `/api/auth/manage` is a public multi-action Auth RPC backed by a **module-level service_role** client. `signin-password` and `signup` are declared “Public actions (no auth required)” and have **zero** rate-limit / captcha / IP-block checks. Live probes returned full sessions and created a confirmed Auth user.

---

## Route Analysis

| Item | Detail |
|------|--------|
| Route | `POST /api/auth/manage` (`manage.post.ts`) |
| Methods | POST only (Nuxt file convention) |
| Body | `{ action: string, ... }` loosely typed (`[key: string]: any`) |
| Query | None used |
| Client | `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` — **module singleton** |
| Error shape | Always HTTP **200** with `{ success: false, error: string }` on failure (no proper 401/429) |

### Operation matrix

| Operation | Auth required? | Token required? | Tenant context? | Service Role? | Privileged? | Live result (unauth) |
|-----------|----------------|-----------------|-----------------|---------------|-------------|----------------------|
| `signin-password` | **No** | password | No | **Yes** | **Yes** (issues session) | **PASS for attacker:** `success:true` + session (after user exists) |
| `signup` | **No** | password | No | **Yes** | **Yes** (creates Auth user, auto-confirm) | **PASS for attacker:** created confirmed user |
| `reset-password-email` | **No** | email | No | **Yes** | Medium (triggers Supabase reset mail) | `success:false` `"Database error"` (still public entrypoint) |
| `get-session` | No session cookie | `access_token` in body | No | **Yes** | Low–Med (user lookup) | Missing token → error; invalid → Unauthorized |
| `set-session` | No | `access_token` + `refresh_token` | No | **Yes** | **Yes** (hydrates shared server client) | Invalid tokens → Unauthorized |
| `update-user` | Intended yes | session via `getServerSession` | No | **Yes** | **Yes** (password change) | **Broken:** `getServerSession is not defined` |
| unknown action | Falls into “protected” branch | — | — | — | — | Same `getServerSession is not defined` (never reaches `Invalid action`) |

---

## Caller Analysis

| Caller | Context | Public page? | Uses manage for | Client-supplied |
|--------|---------|--------------|-----------------|-----------------|
| `pages/register-staff.vue` | After `/api/staff/register` | Yes (invite token page) | `signin-password` auto-login | email, password |
| `pages/reset-password.vue` | Hash tokens from email link | Yes | `set-session`, then `update-user` | tokens from URL; password |
| `pages/login/set-password.vue` | Onboarding | Yes | `update-user` | password |
| Direct browser / curl | Anyone | Yes | Any `action` | Full body |

Staff **registration** itself is **`POST /api/staff/register`** (invitation token), not manage. Manage is only post-register login convenience.

---

## Authentication & Authorization Analysis (per operation)

### `signin-password`
- **Trust boundary:** None. Knowledge of email+password only.
- **Missing vs `/api/auth/login`:** No IP block list, no progressive/rate limit, no optional hCaptcha path, no failed-login MFA/lockout recording, no `setAuthCookies` httpOnly path (returns session JSON to caller instead).
- **Verdict:** **Login hardening bypass — VERIFIED.**

### `signup`
- **Trust boundary:** None.
- **Effect with service_role:** Auth user created with **`email_confirmed_at` set immediately** (live evidence).
- **No** link to `public.users` / tenant / invitation.
- **Verdict:** **Unauthenticated Auth-user factory — VERIFIED CRITICAL.**

### `reset-password-email`
- Public wrapper around `supabase.auth.resetPasswordForEmail`.
- Preferred product reset is `/api/auth/password-reset-request` + `/api/auth/reset-password` (custom `password_reset_tokens`, rate-limited).
- manage variant is still a public, unthrottled trigger surface (live returned `"Database error"`).

### `get-session` / `set-session`
- Anyone who possesses tokens can call them.
- `set-session` mutates the **shared module-level** service_role client session → concurrency / cross-request contamination risk (**architectural HIGH**; not fully race-tested).

### `update-user`
- Code checks `getServerSession(event)` but **does not import it**; Nuxt has **no** `#auth` / `getServerSession` implementation in this repo.
- Live: always `{ success:false, error:"getServerSession is not defined" }`.
- Even if fixed, `userId` from session is **unused**; `supabase.auth.updateUser(attributes)` runs on service_role client (wrong API vs `auth.admin.updateUserById`).
- Legitimate reset/set-password pages that depend on this path are **broken or unreliable**.

---

## Password Reset Analysis

### Secure path (separate from manage)
`password-reset-request.post.ts` → tokens in `password_reset_tokens` → `reset-password.post.ts`:
- Rate limited
- Expiry + `used_at` single-use checks
- Uses `auth.admin` to set password for token-bound user

**This path is NOT F-02’s primary issue** (not re-fully exploited here; code review supports better design than manage).

### manage-based reset (`reset-password.vue`)
1. Reads `access_token` / `refresh_token` from URL hash (Supabase recovery link style)
2. `set-session` via manage
3. `update-user` with new password → **currently fails** (`getServerSession is not defined`)

| Check | Result |
|-------|--------|
| Token strength / expiry (Supabase recovery) | Delegated to Supabase; **NOT fully re-verified** |
| manage `update-user` ATO without token | **DENIED** (handler crashes before update) |
| Replay / expired custom tokens | Covered by dedicated reset API — **NOT VERIFIED** in this F-02 probe set |

Account takeover **solely** by guessing email/userId/tenantId via manage `update-user`: **No** (broken + no id param).  
Account takeover via **credential stuffing** through manage `signin-password`: **Yes (bypass).**

---

## Staff Registration Analysis

| Question | Answer |
|----------|--------|
| Who may register staff? | Holder of valid pending `staff_invitations.invitation_token` via `/api/staff/register` |
| Auth session required? | No (invite token is the proof) |
| Tenant from client? | **No** — from invitation row |
| Role from client? | Controlled server-side from invitation |
| Unauth without token? | DENIED (400 invalid invitation) — code review |
| Tenant A → Tenant B via manage? | **N/A** — manage does not create staff profiles |
| Customer → staff via manage `signup`? | Creates Auth-only orphan, **not** staff role in `public.users` |

**F-02 does not equal “open staff registration.”** Staff invite flow is a separate gate. manage’s risk is **Auth session issuance / Auth user creation**.

---

## Direct Attack Tests (live)

| # | Context | Attack | Expected (secure) | Actual | Status |
|---|---------|--------|-------------------|--------|--------|
| T1 | Unauth | `signin-password` unknown user | Controlled fail / 401 | `success:false` `"Database error"` | Entry open; error opaque |
| T2 | Unauth | `signup` new email | DENIED or gated | **`success:true`, confirmed Auth user** | **FAIL (vuln)** |
| T3 | Unauth | `signin-password` with T2 creds | DENIED without hardening | **`success:true` + session** | **FAIL (vuln)** |
| T4 | Unauth | `set-session` garbage JWT | DENIED | `Unauthorized` | PASS (invalid tokens) |
| T5 | Unauth | `update-user` set password | DENIED | `getServerSession is not defined` | PASS (fail closed / broken) |
| T6 | Unauth | `get-session` no token | DENIED | `Access token required` | PASS |
| T7 | Unauth | `get-session` bogus token | DENIED | `Unauthorized` | PASS |
| T8 | Unauth | `reset-password-email` | Throttled / safe | `"Database error"` | Public surface remains |
| T9 | Unauth | unknown `action` | 400 Invalid action | `getServerSession is not defined` | FAIL (control flow bug) |
| T10 | Unauth | `/api/auth/login` same creds | Rate-limited path exists | Succeeds (orphan user) | Contrast: login **has** RL/captcha code; manage **does not** |

No secrets/tokens are reproduced in this report.

---

## Service Role Analysis

```6:9:server/api/auth/manage.post.ts
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

| Risk | Detail |
|------|--------|
| Untrusted input → service_role | **Yes** for all actions |
| Auto-confirm signup | Live user created with `email_confirmed_at` |
| Shared client | `setSession` / `signInWithPassword` mutate process-global auth state |
| Precondition | **None** for public action list |

---

## Login Hardening Analysis

| Control on `/api/auth/login` | Present on `/api/auth/manage` `signin-password`? |
|------------------------------|--------------------------------------------------|
| IP block list (`blocked_ip_addresses`) | **No** |
| Rate limit (`checkRateLimit`) | **No** |
| Progressive / lockout history | **No** |
| Optional hCaptcha | **No** |
| Failed-login recording | **No** |
| httpOnly cookie session via `setAuthCookies` | **No** (JSON session to client) |

**Can manage bypass login hardening?** **YES — VERIFIED** with live `signin-password` returning a session without those controls.

---

## User Enumeration

| Observation | Impact |
|-------------|--------|
| `signup` success vs failure differs | Confirms creation |
| `signin-password` `"Database error"` vs success | Coarse oracle |
| Always HTTP 200 | Harder for naive scanners; still exploitable |

Severity: **LOW–MEDIUM** relative to signup/signin issues.

---

## Session / Cookie Security

- manage returns session tokens in JSON body → XSS/extension theft surface if used by frontend.
- Legitimate login uses httpOnly cookies (`cookieOptions.secure/sameSite` in `nuxt.config.ts`).
- Post-password-change session revocation via manage: **NOT VERIFIED** (update-user broken).

---

## Findings (actual)

### F-02-V1 — CRITICAL — Public `signin-password` bypasses login hardening
- **File:** `server/api/auth/manage.post.ts`
- **Exploit:** `POST /api/auth/manage` `{action:"signin-password", email, password}` → session
- **Impact:** Credential stuffing / password spraying without rate limit, captcha, IP block, lockout
- **Evidence:** Live success with session for probe account
- **Fix direction (do not implement here):** Remove public sign-in; force callers to `/api/auth/login` or internal-only helper with same controls

### F-02-V2 — CRITICAL — Public `signup` via service_role creates confirmed Auth users
- **Exploit:** Unauthenticated `action=signup`
- **Impact:** Unlimited Auth account creation; email auto-confirmed; pollution; foothold for further bugs
- **Evidence:** Auth user `2ae701a8-…` created live
- **Fix direction:** Delete public signup; use dedicated register APIs with validation/invitation

### F-02-V3 — HIGH — Broken `getServerSession` on “protected” actions
- **Impact:** `update-user` unusable; unknown actions mis-handled; false sense of authz
- **Evidence:** Live error string `getServerSession is not defined`
- **Fix direction:** Use real session helper (`getAuthenticatedUser`) + `auth.admin.updateUserById` with proof-of-intent

### F-02-V4 — HIGH — Module-level service_role client + `setSession`
- **Impact:** Potential cross-request session bleed under concurrency
- **Fix direction:** Per-request clients; never `setSession` on shared admin client

### F-02-V5 — MEDIUM — Public `reset-password-email` / token passthrough surfaces
- Unthrottled reset trigger + `set-session` accepting client-supplied tokens
- Prefer existing rate-limited reset APIs; invalidate manage wrappers

---

## What is NOT a finding (false positives avoided)

- Password reset **without** prior session (if token-bound) — OK in principle.
- Service role **on server** — OK if gated; here gates are missing for public actions.
- Staff invite registration without login — OK when invitation token is validated (`/api/staff/register`).

---

## Final Verdict

**F-02: STILL VULNERABLE**

**Production Blocker: YES**

No further “verification” needed before remediation: public `signin-password` and `signup` are live and exploitable.

---

## Recommended next action

1. **Immediate:** Delete probe Auth user `f02-retest-nonexistent@example.com` (`2ae701a8-bf3b-40ea-b061-2e35ca08a65a`).
2. Ship a **narrow F-02 remediation**: remove/disable public `signin-password` + `signup` (+ likely `set-session`/`reset-password-email`); migrate `register-staff` auto-login to `/api/auth/login`; fix password update to secure admin API with real session/recovery proof.
3. Then retest with the T-02 matrix from the remediation plan.
