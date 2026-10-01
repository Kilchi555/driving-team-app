# Simy-test E2E safety gate (demo setup / teardown)

**When to use:** Running Apple Review or E2E isolation demo setup/teardown; understanding why a script exits before any Supabase client is created; relating this gate to the #312 simy-test env loader.

Verified against current `main` (Oct 2026). Landed: **#326** (`291ee311`).

**Not this:** `scripts/load-simy-test-env.mjs` / `with-simy-test-env.mjs` (#312) used by `npm run dev` and `npm run test:e2e`. Those load a machine-local env file and reject the **production** Supabase ref; they do **not** wrap the demo setup scripts below. Website preview tokens (#299) are unrelated.

Store-operator command deltas already live in `docs/APP_STORE_SUBMISSION.md` and `docs/ANDROID_PLAY_SUBMISSION.md`; this runbook is the engineering gate contract.

---

## Intent

Fail closed **before** `createClient` for demo tenant setup/teardown:

- Require target `simy-test` and the **exact** approved Supabase host
- Reject any `DEMO_PASSWORD` usage for setup
- Use dedicated E2E secrets; never print passwords
- Require explicit `--confirm` for destructive reseed/teardown

---

## Contract (current `main`)

Canonical module: `scripts/simy-e2e-safety.mjs`.

### Host / target gate (`evaluateSimyTestGate`)

| Check | Rule |
|-------|------|
| Target | `SIMY_ENV_TARGET` must be exactly `simy-test` |
| URL | `SUPABASE_URL` must parse as `https://kssqalisskhvorqwgy.supabase.co` (origin used for the client) |
| Rejects | Missing/malformed URL, `http:`, userinfo, non-443 port, any other hostname (including production `unyjaetebnaexaflpyoc` and suffix lookalikes) |

### Setup (`planSetupAction`)

| Script | Secret | Reseed |
|--------|--------|--------|
| `scripts/setup-apple-review-tenant.mjs` | `E2E_DEMO_PASSWORD` (≥ 12 chars) | Allowed only with `--reseed` **and** `--confirm` |
| `scripts/setup-e2e-isolation-tenant.mjs` | `E2E_ISOLATION_PASSWORD` (≥ 12 chars) | **Never** (`allowReseed: false`) |

Also required: `SUPABASE_SERVICE_ROLE_KEY`.  
If `DEMO_PASSWORD` is set at all → exit 1 (`DEMO_PASSWORD_REJECTED_MESSAGE`), even when the E2E secret is also set.

### Teardown (`planTeardownAction`)

`scripts/teardown-apple-review-tenant.mjs` requires `--confirm` **before** the host gate, then same target/host + service role checks.

### npm scripts

| Script | Command note |
|--------|--------------|
| `npm run demo:apple-review:setup` | `node scripts/setup-apple-review-tenant.mjs` — **no** `with-simy-test-env` wrap |
| `npm run demo:apple-review:teardown` | Does **not** bake in `--confirm`; use `npm run demo:apple-review:teardown -- --confirm` |
| `npm run demo:e2e-isolation:setup` | Isolation setup; reseed unsupported |

Export `SIMY_ENV_TARGET`, approved `SUPABASE_URL`, service role, and the E2E password yourself (or load via `.env` / `scripts/load-simy-test-env.sh`).

---

## Relation to #312 loader

| | #312 loader | #326 safety gate |
|---|-------------|------------------|
| Job | Load `~/.config/simy/simy-test.env` into `dev` / `test:e2e` | Block demo setup/teardown until simy-test + exact host + E2E secret |
| Host check | Rejects production ref; other `*.supabase.co` may pass | Requires exact `kssqalisskhvorqwgy.supabase.co` |
| Wired into | `npm run dev`, `npm run test:e2e` | Demo setup/teardown only |

---

## Pitfalls

1. **Demo npm scripts do not auto-load simy-test.env** — set env explicitly or the gate fails closed.
2. **`DEMO_PASSWORD=…` fails setup** even alongside `E2E_DEMO_PASSWORD` — unset `DEMO_PASSWORD`.
3. **Teardown without `--confirm` always fails** — the flag is not in the package.json script.
4. **Isolation has no reseed path** — `--reseed` is rejected.
5. **Passwords are never printed** — copy into App Store Connect / password manager by hand.
6. **Screenshot helpers may still accept `DEMO_PASSWORD` for login capture** — setup rotation docs point at `E2E_DEMO_PASSWORD`.
7. **Isolation E2E no longer falls back to a shared demo password** — CI needs `E2E_ISOLATION_PASSWORD`.

---

## Verify

```bash
npx vitest run utils/__tests__/simy-e2e-safety-gate.test.ts

# Gate precedes createClient in setup/teardown sources
rg -n "planSetupAction|planTeardownAction|createClient|DEMO_PASSWORD" \
  scripts/simy-e2e-safety.mjs \
  scripts/setup-apple-review-tenant.mjs \
  scripts/setup-e2e-isolation-tenant.mjs \
  scripts/teardown-apple-review-tenant.mjs
```

---

## Codepaths / surfaces

| Concern | Path / symbol |
|---------|---------------|
| Gate | `scripts/simy-e2e-safety.mjs` — `evaluateSimyTestGate`, `planSetupAction`, `planTeardownAction` |
| Apple Review setup | `scripts/setup-apple-review-tenant.mjs` |
| Isolation setup | `scripts/setup-e2e-isolation-tenant.mjs` |
| Teardown | `scripts/teardown-apple-review-tenant.mjs` |
| Tests | `utils/__tests__/simy-e2e-safety-gate.test.ts` |
| Operator docs | `docs/APP_STORE_SUBMISSION.md`, `docs/ANDROID_PLAY_SUBMISSION.md` |
| Env loader (related) | `scripts/load-simy-test-env.mjs`, `scripts/with-simy-test-env.mjs` |
