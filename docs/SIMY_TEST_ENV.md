# Shared simy-test credentials (#312)

**When to use:** First setup of `npm run dev` / Playwright on a new machine or worktree; debugging why Supabase keys did not load; understanding why CI/Vercel never read `~/.config/simy/simy-test.env`.

Verified against current `main` (Sep 2026). Landed: **#312** (`dc9c44af`).

---

## Intent

Every local worktree should share **one** machine-local credentials file for the **simy-test** Supabase project and local E2E passwords. The file lives **outside** every git worktree so credentials are not copied between clones and never committed.

`npm run dev` and `npm run test:e2e` wrap the real command with `scripts/with-simy-test-env.mjs`, which loads that file (when safe) and then execs Nuxt or Playwright.

CI, Vercel, production builds, Vitest, and Nuxt `build`/`generate`/`preview` **never** load the file.

---

## Contract (current `main`)

| Rule | Detail |
|------|--------|
| Default path | `~/.config/simy/simy-test.env` |
| Override path | `SIMY_TEST_ENV_FILE` (absolute path outside any worktree) |
| Disable load | `SIMY_LOAD_TEST_ENV=0` |
| Required marker | `SIMY_ENV_TARGET=simy-test` (not applied into `process.env`) |
| Allowed keys only | Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`. E2E: `E2E_BASE_URL`, `E2E_DEMO_PASSWORD`, `E2E_ISOLATION_PASSWORD`, `E2E_STAFF_EMAIL`, `E2E_WORKING_HOUR_EXCEPTIONS` |
| Profiles | `nuxt-dev` → Supabase keys; `e2e` → E2E keys; `all` → both |
| Outside worktree | Real path must not sit under any `git worktree list` root (or cwd repo). In-repo files are **fatal** |
| No production Supabase | Host must be `https://<ref>.supabase.co` and `<ref>` must **not** be `unyjaetebnaexaflpyoc` |
| E2E base URL | Only `localhost` / `127.0.0.1` / `::1`, or a host containing `simy-test`. `app.simy.ch` is rejected |
| Explicit env wins | If any Supabase (or any of `E2E_DEMO_PASSWORD` / `E2E_ISOLATION_PASSWORD` / `E2E_BASE_URL`) is already set, that group is **not** overwritten |
| Secrets never logged | Warnings mention key **names** and paths only |
| Idempotency | After a successful wrap, `SIMY_TEST_ENV_CHECKED=1` skips a second load in the same process tree |

### Setup

```bash
mkdir -p ~/.config/simy
cp config/simy-test.env.example ~/.config/simy/simy-test.env
chmod 600 ~/.config/simy/simy-test.env
# Fill only simy-test values. Do not paste production keys.
```

Then from any worktree on this commit:

```bash
npm run dev          # profile nuxt-dev
npm run test:e2e     # profile e2e
scripts/load-simy-test-env.sh --profile all -- <command>
node scripts/load-simy-test-env.mjs --check --profile all
```

`.gitignore` blocks `simy-test.env` inside the repo; the example under `config/` is the only template that ships.

---

## Pitfalls

1. **Putting the file inside a worktree** — loader refuses and exits fatal (`skipped: inside-repo`). Use `~/.config/simy/…`, not `./simy-test.env`.
2. **Production Supabase URL in the file** — fatal (`production-supabase`). The production project ref is hard-coded as a deny list.
3. **Extra keys** (Stripe, Wallee, Resend, Twilio, Vercel, arbitrary names) — fatal (`unexpected-keys`). Keep the allowlist only.
4. **Assuming CI uses the file** — `CI` / `VERCEL` / `NODE_ENV=production` / `VITEST` / npm lifecycle `build|generate|preview|postinstall|smoke-test` skip load. Wire secrets in the host environment instead.
5. **Playwright fallback without a loaded base URL** — `playwright.config.ts` still defaults `E2E_BASE_URL` to `https://app.simy.ch` when unset. Local E2E without a valid simy-test file (or explicit env) can point at production. Prefer a populated file or an explicit local `E2E_BASE_URL`.
6. **Incomplete Supabase set** — `nuxt-dev` / `all` require `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and either `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`. Missing → fatal.
7. **World-readable mode** — group/other read bits emit a warning; `chmod 600` is recommended, not required for load.
8. **`force` in unit tests only** — `loadSimyTestEnv({ force: true })` bypasses CI/Vercel guards for Vitest coverage. Do not use `force` from app scripts.

---

## Verify

```bash
# Unit coverage for guards, allowlist, production deny, profiles
npx vitest run utils/__tests__/load-simy-test-env.test.ts

# Dry-check without printing secret values (JSON: file, skipped, applied names, missing)
node scripts/load-simy-test-env.mjs --check --profile all

# Confirm the example is the template and the real file is ignored
test -f config/simy-test.env.example
rg -n 'simy-test\.env' .gitignore
```

Expect: vitest green; `--check` reports `outsideRepo: true` and either applied key names or a clear `skipped` / `missing` reason — never secret values.

---

## Codepaths / surfaces

| Path | Role |
|------|------|
| `~/.config/simy/simy-test.env` | Machine-local credentials (not in git) |
| `config/simy-test.env.example` | Template + comments |
| `scripts/load-simy-test-env.mjs` | Parse, guard, apply; `--check` CLI |
| `scripts/with-simy-test-env.mjs` | Load then `spawn` command |
| `scripts/load-simy-test-env.sh` | Thin bash wrapper → `with-simy-test-env.mjs` |
| `package.json` `dev` / `test:e2e` | Wrap Nuxt / Playwright with profiles |
| `playwright.config.ts` | Loads `e2e` profile at config import; fatal on reject |
| `utils/__tests__/load-simy-test-env.test.ts` | Regression for guards and allowlist |
| `.gitignore` | `simy-test.env` must never be committed |
| `docs/ACCESS_AND_SECRETS_POLICY.md` | Org policy: no plaintext secrets in the repo |

Related but separate: Cloud Agent / Vercel preview host docs are not this loader. Production runtime secrets stay in Vercel/host env, never in `~/.config/simy/simy-test.env`.
