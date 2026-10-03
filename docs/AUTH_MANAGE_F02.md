# Auth manage retirement and invite URL session (F-02)

**When to use:** Debugging 410 on `/api/auth/manage`; invite / password-reset pages that bind the wrong user; reviewing `detectSessionInUrl` or PKCE soft-ok behavior.

Verified against source (Sep 2026). Commits `fd8683f3` (#135), `72c562e2` (#139), `5540cb81` (#140). Detail audits: `audits/2026-09-02-f02-remediation.md`, `audits/2026-09-03-f02-retest.md`.

---

## Intent

`/api/auth/manage` used to expose unauthenticated service-role auth operations (`signin-password`, `signup`, `set-session`, …). That bypassed hardened login controls. F-02 **permanently retires** the route (HTTP **410**) and hardens invite/recovery URL consumption so a leftover cookie session cannot soft-succeed as the invitee.

---

## Retired endpoint

| Item | Contract |
|------|----------|
| Route | `POST /api/auth/manage` |
| Status | Always **410** `AUTH_MANAGE_RETIRED` |
| Body | Optional `action` / `operation` — logged, then rejected |
| Retired actions | `signin-password`, `signup`, `reset-password-email`, `get-session`, `set-session`, `update-user` |

### Legitimate replacements

| Need | Use |
|------|-----|
| Login | `POST /api/auth/login` |
| Customer signup | `POST /api/auth/register` or `/api/auth/register-client` |
| Staff signup | `POST /api/staff/register` (invitation-gated) |
| Password reset request / complete | `POST /api/auth/password-reset-request` + `/api/auth/reset-password` |
| Session / password after invite | Client Supabase Auth with the **user JWT** from the invite URL |

Do not reintroduce a public manage facade that accepts arbitrary Auth Admin actions.

---

## Invite / recovery URL hygiene

Supabase browser clients set **`detectSessionInUrl: false`** so the SDK does not auto-consume URL tokens. Pages (`login/set-password`, `reset-password`, `register-staff`) own the exchange and must fail closed.

| Helper (`utils/auth-url-session.ts`) | Role |
|--------------------------------------|------|
| `stripSensitiveAuthParams` | Drop `code`, tokens, `error_*` from the address bar; clear hash |
| `sessionFingerprint` | `{ userId, accessToken }` snapshot before/after consume |
| `shouldSoftSucceedAuthUrlStep` | Soft-ok rules (below) |
| `clearServerAuthBeforeUrlConsume` | `POST /api/auth/logout` + refresh-cache reset — **does not** `signOut` (that would kill PKCE verifier / other devices) |

### Soft-succeed rules (fail closed)

1. No `authError` → success (setSession / exchange / verifyOtp replaced the client session).
2. Hash/implicit (`expectedAccessToken` set) → success **only** if session access token matches that URL token.
3. PKCE/OTP → success **only** if there was a session **before** and it was **replaced** (different userId or accessToken). A session that merely “appeared” from cookies is **not** enough.

On failure, callers must throw so `getUser` never binds the password form to a leftover login.

---

## Pitfalls

- **Do not call** `/api/auth/manage` from new UI or scripts — expect 410 forever.
- **Do not enable** `detectSessionInUrl: true` without re-auditing invite soft-ok; URL consume must stay page-owned.
- **Do not soft-ok** on “session exists after error” alone — leftover refresh can look like success.
- Clearing leftovers: use `clearServerAuthBeforeUrlConsume`, not global `signOut`, before `exchangeCodeForSession`.

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/auth/manage.post.ts` | Permanent 410 + `RETIRED_AUTH_MANAGE_ACTIONS` |
| `utils/auth-url-session.ts` | Soft-ok + URL strip helpers |
| `utils/supabase.ts` | `detectSessionInUrl: false` on browser clients |
| `pages/login/set-password.vue` | Invite password set |
| `pages/reset-password.vue` | Recovery password set |
| `pages/register-staff.vue` | Staff invite completion |
| `utils/__tests__/auth-url-session.test.ts` | Unit coverage |
| `server/utils/__tests__/f02-auth-manage-remediation.test.ts` | Retired-route coverage |
| `audits/2026-09-02-f02-remediation.md` | Full remediation report |
