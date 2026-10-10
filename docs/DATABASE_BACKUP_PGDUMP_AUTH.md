# Daily Database Backup — `SUPABASE_DB_URL` preflight & pg_dump diagnosis

Verified from `main` after merge of `843d0b16` (#394).

**When to use:** Actions → Daily Database Backup fails at schema or full `pg_dump`; logs show structure preflight OK but dump still fails; password was rotated; URI looks malformed; need to tell auth failure apart from local-socket / connection errors without pasting secrets.

Open draft [#109](https://github.com/Kilchi555/driving-team-app/pull/109) `DATABASE_BACKUP.md` covers nightly R2 layout, GFS retention, and restore-test. This runbook is the **#394 auth/diagnosis layer** only — keep both after merge; do not fold into #109 until that draft rebases.

---

## Intent

Fail loudly and safely when `SUPABASE_DB_URL` cannot dump:

1. **Structure preflight** (boolean labels only) before any `pg_dump`.
2. Capture `pg_dump` stderr to a temp file, **classify** it, delete the file, emit fixed human messages — never reprint raw stderr (may contain hostnames).

Passing preflight is **not** proof of authentication or reachability.

---

## Contract

| Stage | Behavior |
|-------|----------|
| Checkout | Sparse checkout of `scripts/ci` only (needed for the Node preflight) |
| Preflight | `node scripts/ci/validate-supabase-db-url.mjs` with `SUPABASE_DB_URL` from Actions secrets |
| Preflight OK | Boolean lines (`secret_present=…`, `preflight_ok=true`) + note that auth/reachability are unproven |
| Preflight fail | `::error::` fixed messages + exit 1 — no URI/host/user/db/password echo |
| Dump | `pg_dump` stderr → `pg_dump_*.err` → `node … --classify-file` → category token → authored case messages → remove err file |
| Categories | `auth_failed` \| `local_socket` \| `connection_failed` \| `unknown` |

### Structure rules (URI-only)

Accepted schemes: `postgres://` or `postgresql://`. Keyword/value libpq conninfo is **rejected** (`not_uri`).

Required components (presence only — values never printed):

- hostname
- username
- non-empty password component
- database path segment

Also rejects malformed percent-escapes in the secret string.

### Classification signals (stderr, lowercased)

| Category | Match (simplified) |
|----------|--------------------|
| `auth_failed` | `password authentication failed` |
| `local_socket` | `/var/run/postgresql`, `.s.pgsql.`, or “server running locally…” |
| `connection_failed` | `connection to server` + `failed` |
| `unknown` | anything else / empty |

---

## Ops response (`auth_failed`)

Do **not** paste `SUPABASE_DB_URL` or passwords into chat/logs/PRs.

1. Supabase Dashboard → Project Settings → Database → confirm or reset DB password.
2. Copy connection URI (direct or Session-mode pooler). URL-encode special characters in the password.
3. Update GitHub Actions secret `SUPABASE_DB_URL`.
4. Re-run **workflow_dispatch** on Daily Database Backup (read-only dump + R2 upload).

Structure preflight can still pass with a wrong password — that is expected.

---

## Pitfalls

1. **Preflight green ≠ dump will work** — wrong password, network, or TLS still fail at `pg_dump`.
2. **Never echo the secret** — classifier and workflow delete captured stderr; do not add `cat pg_dump_*.err` debug steps.
3. **URI-only** — bare tokens / keyword conninfo fail preflight as `not_uri` / unparseable.
4. **Percent-encoding** — passwords with `@`, `#`, `/`, etc. must be URL-encoded or preflight/`URL` parse fails.
5. **Local socket** usually means the connection argument was not accepted as a URI — fix the secret shape, do not “fix” by pointing at localhost.
6. **npm scripts** — `npm run test:backup-uri-preflight` (and full `npm test`) run synthetic unit tests; they never contact a real DB.

---

## Smoke test

1. `npm run test:backup-uri-preflight` — green on synthetic hosts only.
2. Actions → Daily Database Backup → Run workflow.
3. On failure: confirm annotation category (`auth_failed` / `local_socket` / `connection_failed` / unknown) and that logs contain **no** hostname/user/db/password fragments.
4. After rotating the DB password, update the Actions secret, then re-dispatch until schema + full dump succeed.

---

## Codepaths

| Path | Role |
|------|------|
| `.github/workflows/database-backup.yml` | Nightly dump; preflight step; classified dump failures |
| `scripts/ci/validate-supabase-db-url.mjs` | `validateSupabaseDbUrl`, `classifyPgDumpError`, CLI preflight / `--classify-file` |
| `scripts/ci/validate-supabase-db-url.test.mjs` | Synthetic URI + classification tests (no network) |
| `package.json` → `test:backup-uri-preflight` | Isolated Node test runner for the script |

Related (open draft #109): full backup/R2/GFS/restore-test overview in `DATABASE_BACKUP.md` once that PR lands.
