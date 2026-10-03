# Supabase Key Formats & Tenant Login Redirects

**When to use:** Password login 401s after rotating to `sb_publishable_` / `sb_secret_` keys; local/preview auth works with legacy JWT anon keys but breaks with new keys; logout or session recovery bounces `/{tenant-slug}` to generic `/login`.

Verified against source (Aug 2026).

---

## Intent

Supabase’s newer API keys must only be sent as the **`apikey`** header. Putting `sb_publishable_…` or `sb_secret_…` in `Authorization: Bearer …` returns **401**. Server helpers strip that Bearer when the key uses the new prefix so login and anon RLS clients keep working.

Separately, branded tenant login lives at `/{slug}` (e.g. `/driving-team`). Auth recovery and logout must treat those paths as public and prefer them over bare `/login`.

---

## Key helpers

| Helper | Env | Use |
|--------|-----|-----|
| `getSupabaseAnon()` | `SUPABASE_URL` + `SUPABASE_ANON_KEY` | Password login, MFA verify, RLS-respecting public reads |
| `getSupabaseAdmin()` | `SUPABASE_URL` + `SUPABASE_SECRET_KEY` (fallback `SUPABASE_SERVICE_ROLE_KEY`) | Service role / bypass RLS |

Both wrap `createClient` with `newKeyFetch()` when the key starts with `sb_publishable_` or `sb_secret_`: any `Authorization: Bearer sb_…` header is **deleted** before the request.

Legacy JWT-style anon/service keys are unchanged (Bearer may remain).

---

## Where login must use anon helper

- `server/api/auth/login.post.ts` — password sign-in via `getSupabaseAnon()`
- `server/api/auth/verify-mfa-login.post.ts`
- `server/utils/account-switch.ts` — public client for OTP verify after mint

Do **not** build a one-off Supabase client that always sets Bearer to `SUPABASE_ANON_KEY` if that value might be `sb_publishable_`.

Client interceptors (`plugins/02-supabase-auth-interceptor.client.ts`, `plugins/fetch-interceptor.client.ts`) follow the same rule for browser calls.

---

## Tenant login vs generic `/login`

| Utility | Behavior |
|---------|----------|
| `isTenantLoginPath(path)` | Single segment, not in `RESERVED_TOP_SEGMENTS` → branded login |
| `isPublicAuthPath(path)` | `/login`, register/reset, `/s/…`, public booking/shop, **or** tenant login |
| `getLoginPath` / `redirectToTenantLogin` | Prefer explicit slug → `last_tenant_slug` → slug already in URL → `/login` |

`plugins/01-session-recovery.client.ts` skips forced login redirect when `isPublicAuthPath` is true, so a cold load of `/{slug}` is not rewritten to `/login`.

Keep `RESERVED_TOP_SEGMENTS` in sync with real top-level pages and `pages/[slug].vue` reserved routes — a missing reserved name makes a real page look like a tenant slug.

---

## Pitfalls

1. **Preview/local with publishable keys** — first symptom is login 401; check whether code still forces Bearer.
2. **Rotating only Vercel `SUPABASE_ANON_KEY`** without redeploying code that strips Bearer breaks auth until helpers are used everywhere.
3. **Marketing `/fl` click logger** posts with both `apikey` and `Authorization: Bearer` using the anon key (`apps/simy/server/routes/fl.get.ts`). That path assumes a key format PostgREST accepts as Bearer **or** relies on `apikey` alone — if logging fails after a key rotation, verify the same new-key rule for that fetch.
4. **Logout** should land on `/{slug}` via `redirect-to-login` helpers, not always `/login`.

---

## Codepaths

- `server/utils/supabase-admin.ts` — `getSupabaseAnon`, `getSupabaseAdmin`, `newKeyFetch`
- `server/api/auth/login.post.ts`, `verify-mfa-login.post.ts`
- `utils/public-paths.ts` — `isTenantLoginPath`, `isPublicAuthPath`
- `utils/redirect-to-login.ts`
- `plugins/01-session-recovery.client.ts`, `02-supabase-auth-interceptor.client.ts`, `fetch-interceptor.client.ts`
- `stores/auth.ts` — client login / logout redirect helpers
