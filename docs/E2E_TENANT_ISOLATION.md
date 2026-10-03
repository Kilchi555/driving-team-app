# E2E tenant isolation (Playwright)

## Intent

CI proves that the **Apple Review demo tenant** (`apple-review`) cannot read users or appointments belonging to a second seeded tenant (`e2e-isolation`). Complements the login smoke against the demo tenant.

## Architecture

```
scripts/setup-e2e-isolation-tenant.mjs
  → tenant slug e2e-isolation
  → users: e2e-isolation@…, …-staff@…, …-client@…
  → seeds a lesson appointment (needs lesson event type)

GitHub Actions (ci.yml) Playwright job
  E2E_DEMO_PASSWORD      → demo-admin@simy.ch / apple-review
  E2E_ISOLATION_PASSWORD → e2e-isolation@simy.ch
  E2E_BASE_URL=https://app.simy.ch

e2e/isolation.spec.ts
  1) Sign in as e2e-isolation → capture tenant_id + an appointment id
  2) Sign in as apple-review admin
  3) POST /api/admin/users { action: get-admins, tenant_id: isolation } → expect 403
  4) GET /api/staff/get-appointment?id=<isolation> → not ok; no success payload / data
  5) GET /api/calendar/get-appointments → must not contain isolation appointment id
```

## Setup (local / secrets)

```bash
# Requires SUPABASE_SERVICE_ROLE_KEY (and usually .env)
npm run demo:e2e-isolation:setup
# Prints a generated password unless DEMO_PASSWORD is set (≥12 chars)
```

Store the printed password as GitHub Actions secret **`E2E_ISOLATION_PASSWORD`**. Apple Review continues to use **`E2E_DEMO_PASSWORD`** (never commit either).

Re-run setup if the isolation tenant lacks appointments or the lesson event type seed drifts.

## Running tests

```bash
# Full suite (skips isolation when passwords unset)
E2E_DEMO_PASSWORD=… E2E_ISOLATION_PASSWORD=… E2E_BASE_URL=https://app.simy.ch npm run test:e2e

# Isolation only
E2E_DEMO_PASSWORD=… E2E_ISOLATION_PASSWORD=… npx playwright test e2e/isolation.spec.ts
```

In CI, missing passwords fail `beforeAll` (hard error). Locally, tests `test.skip` when passwords are absent.

## Assertion contract (important)

Cross-tenant `get-appointment` **must not return a successful appointment payload**.

- Acceptable HTTP statuses today: **403, 404, or 500** (production may 500 when `.single()` misses under tenant filter / PGRST116).
- Nitro may echo the requested UUID in an **error URL** — that is **not** treated as a data leak.
- Fail if `success === true`, if `data` is present, or if the body contains `e2e-isolation@simy.ch`.
- Listing another tenant’s admins via `get-admins` must be **403** and must not leak the isolation email.

## Pitfalls

1. **Only `E2E_DEMO_PASSWORD` set** → login specs may pass while isolation is skipped locally; CI requires both secrets.
2. **Stale isolation seed** → “no appointments” / missing `tenant_id` — re-run `demo:e2e-isolation:setup`.
3. **Tightening get-appointment to 404-only** — update the allowed status list in `e2e/isolation.spec.ts` together with the API change.
4. **Do not ship demo passwords** in client scripts (see security change that removed Apple Review password fallbacks from screenshot tooling).

## Codepaths

| Path | Role |
|------|------|
| `e2e/isolation.spec.ts` | Cross-tenant assertions |
| `e2e/login.spec.ts` | Apple Review login smoke |
| `e2e/auth.ts` | Shared sign-in helpers / password env |
| `scripts/setup-e2e-isolation-tenant.mjs` | Seed second tenant + appointment |
| `.github/workflows/ci.yml` | Playwright job secrets + `E2E_BASE_URL` |
| `server/api/staff/get-appointment.get.ts` | Tenant-scoped appointment read under test |
