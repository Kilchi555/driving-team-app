# Resend lazy init (Nuxt startup)

**When to use:** `npm run dev` / Nitro fails before any request when `RESEND_API_KEY` is unset; adding or refactoring transactional email handlers; deciding whether to call `new Resend(...)` at module scope.

Verified against current `main` (Sep 2026). Landed fix: **#295** (`b14456a1`) on `server/api/booking/send-price-calculation.post.ts`. Related follow-up (not merged): **#283** adds a 503 when the key is missing plus an import-time unit test.

---

## Intent

Nuxt/Nitro loads API route modules during server startup (and on first scan). Any **top-level** `new Resend(process.env.RESEND_API_KEY)` runs at import time. Without a key, that can abort the whole process before a single request is handled — including routes that never send mail.

Email sends must stay request-scoped (or behind a lazy getter). Missing keys must not block boot.

## Contract (current `main`)

| Rule | Detail |
|------|--------|
| Do **not** construct Resend at module top level | No `const resend = new Resend(...)` outside a handler / function body |
| Prefer shared helpers | `sendEmail` / `sendTenantEmail` in `server/utils/email.ts` (lazy `getResend()`) |
| Handler-local construction is OK | `new Resend(...)` **inside** `defineEventHandler` after validation |
| Import of the class is OK | `import { Resend } from 'resend'` or `await import('resend')` does not construct |
| Env | `RESEND_API_KEY` required only when a codepath actually sends; platform From fallback uses `RESEND_FROM_EMAIL` (default `noreply@simy.ch`) via `email.ts` |

### Preferred pattern

```ts
// server/utils/email.ts (already on main)
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not configured')
    _resend = new Resend(key)
  }
  return _resend
}
```

Call `sendEmail` / `sendTenantEmail` from handlers instead of constructing Resend ad hoc when tenant From / domain verification matters.

### What #295 changed

Before: module scope in `send-price-calculation.post.ts`:

```ts
const resend = new Resend(process.env.RESEND_API_KEY) // runs on import → can kill boot
```

After: construction moved into the handler body, immediately before `resend.emails.send(...)`. Importing the route module no longer constructs Resend.

## Pitfalls

1. **Reintroducing module-scope `new Resend`** in any `server/api/**` (or website twin under `apps/website/server/api/**`) — boot breaks again for local/CI without the secret.
2. **Assuming “import is free” equals “construction is free”** — static `import { Resend }` is fine; top-level `new Resend` is not.
3. **Missing key after #295** — this route still does `new Resend(process.env.RESEND_API_KEY)` inside the handler. A real send without a key fails at send time (typically **500** via the catch). Open **#283** would return **503** `"E-Mail-Dienst ist nicht konfiguriert"` and skip constructing Resend when the key is absent — document that behavior only after it merges.
4. **Bypassing `email.ts`** — direct Resend usage skips tenant `from_email` / `resend_domain_verified` handling and the platform From fallback.
5. **Same class of bug for other SDKs** — module-scope `createClient(...)` still exists in a few routes (e.g. `server/api/auth/register.post.ts`, `server/api/admin/manage.post.ts`). Prefer request-time factories like `getSupabaseAdmin()` / `getSupabaseAnon()` from `server/utils/supabase-admin.ts`. Broader Nitro lazy-client work is tracked in open drafts (**#284**, **#293**); do not treat those as landed.

## Local / CI without Resend

- Dev server should **start** without `RESEND_API_KEY` after #295.
- Endpoints that send mail still need the key (or they error on the request).
- Do not put real production Resend keys in the repo; see `docs/ACCESS_AND_SECRETS_POLICY.md`.

## Verify

```bash
# Module import must not call the Resend constructor (pattern from open #283):
# with RESEND_API_KEY unset, importing the route should not construct Resend.
rg -n "^(const|let) .*new Resend" server/api apps/website/server/api || true

# Shared helper stays lazy:
rg -n "function getResend|_resend = new Resend" server/utils/email.ts

# Smoke: start Nuxt without the key (expect boot success; do not hit send endpoints)
# RESEND_API_KEY= npm run dev
```

After merging **#283**, also run:

```bash
npx vitest run server/utils/__tests__/send-price-calculation.http.test.ts
```

## Codepaths / surfaces

| Path | Role |
|------|------|
| `server/api/booking/send-price-calculation.post.ts` | Public price-calc email; Resend constructed **inside** handler (#295) |
| `server/utils/email.ts` | Canonical lazy `getResend()` + `sendEmail` / `sendTenantEmail` |
| `server/api/emails/send-booking-proposal.post.ts` | Dynamic `import('resend')` inside handler |
| `server/api/auth/password-reset-request.post.ts` | Checks key, then constructs inside handler |
| `server/api/admin/reset-user-password.post.ts` | Same pattern |
| `server/api/admin/wallee-activate.post.ts` | Dynamic import + construct inside handler |
| `server/api/tenants/wallee-onboarding-request.post.ts` | Dynamic import + construct inside handler |
| `apps/website/server/api/**` (`contact`, `leadmagnet/subscribe`, `booking/send-price-calculation`, `courses/register`) | Website app: construct inside handlers (already request-scoped) |
| `docs/ACCESS_AND_SECRETS_POLICY.md` | Resend key rotation / no secrets in git |
| `vercel.json` | Docs branches `cursor/engineering-documentation-updates-*` skip Vercel deploys |
