# Daily database backup & weekly restore test

**When to use:** Backup job failed; R2 folders look wrong; restore-test picked `storage/` instead of a date; rclone version step broke; tenant-admin backup UI shows empty runs; need GFS retention rules.

Verified against source (Aug 2026). Commits `3f6b7741` (#101), `a1c7fa6b` (#106).

---

## Intent

Every night dump Postgres to Cloudflare R2 (schema SQL + compressed custom dump), optionally sync Supabase Storage, retain with Grandfather-Father-Son rules, and every Monday prove the latest dump restores into a throwaway Postgres 17 with non-empty `public.users`.

Super-admins monitor status in `/tenant-admin/backup` (R2 folders, Actions runs, last restore report).

---

## Surfaces

| Workflow | Schedule (UTC) | Purpose |
|----------|----------------|---------|
| `.github/workflows/database-backup.yml` | `0 2 * * *` + `workflow_dispatch` | Dump → R2 → storage sync → GFS purge |
| `.github/workflows/backup-restore-test.yml` | `0 3 * * 1` + `workflow_dispatch` | Download latest date dump → `pg_restore` → row checks |

Both workflows: `permissions: contents: read`, pinned **rclone 1.69.3**, PostgreSQL **17** client.

---

## Secrets / env

| Secret | Used for |
|--------|----------|
| `SUPABASE_DB_URL` | `pg_dump` (schema + custom) |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ENDPOINT` / `R2_BUCKET` | R2 upload + restore download |
| `SUPABASE_S3_ACCESS_KEY_ID` / `SUPABASE_S3_SECRET_ACCESS_KEY` | Optional Storage → R2 sync (skipped if access key empty) |

rclone config is written under `umask 077` to `$HOME/.config/rclone/rclone.conf` (remotes `r2` and, for backup, `supabase`).

### Pinning rclone

Use env name **`PINNED_RCLONE_VERSION`** (e.g. `1.69.3`), **not** `RCLONE_VERSION`. GitHub Actions / rclone treat `RCLONE_VERSION` as a CLI flag override and break `rclone version` / install steps.

---

## Artifact layout in R2

```
r2:$R2_BUCKET/
  YYYY-MM-DD/schema.sql
  YYYY-MM-DD/backup.dump
  storage/…                 # incremental Supabase Storage mirror (not a DB date)
```

GFS retention (date folders only):

- Last **7** days (daily)
- Mondays for last **28** days (weekly)
- 1st of month for last **365** days (monthly)
- **1 January** forever (yearly / compliance)

Non-`YYYY-MM-DD` dirs (e.g. `storage/`) are ignored by retention and by the restore-test “latest” picker.

---

## Restore-test contract

1. List R2 dirs with `grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}/$'` then `sort -r` — never take lexical max of all dirs (`storage` sorts after dates).
2. `rclone copyto` can exit **0** with an empty file (“nothing to transfer”) — require `[ -s backup.dump ]`.
3. Pre-create Supabase-ish roles/schemas (`anon`, `authenticated`, `service_role`, `auth.uid()`, …) so RLS policies parse.
4. `pg_restore --no-owner --no-privileges --disable-triggers` — extension/role errors expected; success = `public.users` count **> 0**.
5. Sample non-sensitive columns from users / tenants / appointments / payments / courses for the restore report the admin UI reads.

---

## Pitfalls

1. **`RCLONE_VERSION` collision** — always `PINNED_RCLONE_VERSION`.
2. **Latest = `storage/`** — fixed by date-only filter; if you reintroduce “sort all dirs”, restore-test downloads nothing useful.
3. **Storage sync is best-effort** — missing S3 keys skip with exit 0; DB dump still required.
4. **Not a full disaster-recovery playbook** — this validates dump integrity in CI Postgres, not a cutover to a new Supabase project.
5. **CODEOWNERS** — backup workflow changes should be reviewed by owners listed in `.github/CODEOWNERS`.

---

## Smoke test

1. Actions → Daily Database Backup → Run workflow → new `YYYY-MM-DD/` with both files in R2.
2. Actions → Weekly Backup Restore Test → green; report shows `users` count > 0.
3. `/tenant-admin/backup` lists the new folder and recent workflow runs.
4. Confirm workflow YAML still uses `PINNED_RCLONE_VERSION`, not `RCLONE_VERSION`.

---

## Codepaths

| Path | Role |
|------|------|
| `.github/workflows/database-backup.yml` | Nightly dump + R2 + GFS |
| `.github/workflows/backup-restore-test.yml` | Monday restore proof |
| `pages/tenant-admin/backup.vue` | Super-admin status UI |
| `.github/CODEOWNERS` | Review ownership for workflows |

Related: RLS wave SQL under `migrations/20260826_rls_wave*.sql` must be in git so a real restore can **replay** lockdown after dump restore — see those migration headers (server uses `service_role`; client policies tightened in waves 3/4).
