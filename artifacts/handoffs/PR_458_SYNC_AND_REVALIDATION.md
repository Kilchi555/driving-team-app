# PR 458 — sync and revalidation

Observation timestamp: 2026-10-16T14:46:24Z

PR: https://github.com/Kilchi555/driving-team-app/pull/458
Branch: `cursor/custom-domain-routing-gate-5594`
Draft: still draft. Not merged, not approved, not undrafted.

Production behavior and live TLS remain **NOT VERIFIED**. No migration was applied. No deployment and no database write occurred.

## SHAs

| | SHA |
| --- | --- |
| PR head before sync | `2721135b4c4142dec9045ed1ad9b5d8bc31f6fa9` |
| Remediation commit (present) | `447ec0ea771e16609ec676afa95c5add433b3a10` |
| Parent of the remediation commit | `093855604d68e8eeebab82ce49105d025ed27eea` |
| `origin/main` before and after | `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121` |
| PR base before sync | `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e` |
| Sync commit | `7046c1304d444bb2b557b84b049a8f2d65427f71` |
| PR base after GitHub refreshed | `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121` |

The known remediation commit and the known main SHA matched the remote before the branch was changed. `447ec0ea` is the parent of `2721135b`. `ecf9694` is an ancestor of the sync commit. The working tree had no staged or unstaged tracked edits. Untracked local handoff files were left unstaged.

## Sync

Method: `git merge origin/main` (ort). Not a rebase, not a force-push, and not a merge of the pull request into `main`.

`git merge-tree --write-tree --name-only origin/main 2721135b` exited 0 before the merge. The merge itself reported no conflicts.

Sync commit parents:

- `2721135b4c4142dec9045ed1ad9b5d8bc31f6fa9`
- `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121`

Files brought in from `main` are the legal-page sanitizer change from #457. `server/utils/custom-domain.ts`, `server/middleware/02.custom-domain.ts`, and `sql_migrations/20261016_protect_website_custom_domain_evidence.sql` are unchanged between `2721135b` and `7046c130`.

`hasAuthoritativeTlsEvidence()` still returns false. Stored `tls.ok`, DNS, and Vercel project `verified` are not certificate evidence. Custom-host routing stays disabled.

After the push, GitHub reported `mergeable: MERGEABLE`, `mergeStateStatus: BLOCKED`, `isDraft: true`. BLOCKED here is the open draft with unfinished required checks, not a conflict.

Report commit that first added this file: `af9fb3c66a269e65f4e5d8e2c9c000bc8e9996e3`.
Required-check rows for `7046c130` are not evidence for `af9fb3c6` or for any commit after it.

## Tests and lint on the sync tree

Commands, run on `7046c130` at 2026-10-16T14:44:27Z:

`npx vitest run server/utils/__tests__/custom-domain-routing-gate.test.ts server/utils/__tests__/custom-domain-app-host.test.ts`

2 files, 24 tests, passed.

`npx eslint server/utils/__tests__/custom-domain-routing-gate.test.ts server/utils/__tests__/custom-domain-app-host.test.ts --max-warnings 0`

Exit 0.

## Required CI on `7046c130`

Read at 2026-10-16T14:45:09Z and confirmed again immediately after. Checks on `09385560` are not used.

Second read of the same SHA, 2026-10-16T14:46:24Z:

| Check | head_sha | Status | Conclusion |
| --- | --- | --- | --- |
| Test and lint | `7046c1304d444bb2b557b84b049a8f2d65427f71` | completed 2026-10-16T14:46:16Z | success |
| E2E login | `7046c1304d444bb2b557b84b049a8f2d65427f71` | in_progress | not finished |
| Dependency review | `7046c1304d444bb2b557b84b049a8f2d65427f71` | completed 2026-10-16T14:45:09Z | success |

On the report commit `af9fb3c6`, at that same read, Dependency review was `in_progress` with no conclusion. Test and lint and E2E login had not reported a completed run on `af9fb3c6`. Those `7046c130` successes do not count for `af9fb3c6`.

Run for Test and lint and E2E login: `38918279076`. Dependency review run: `38918279084`.

Not required, same SHA:

- Vercel – simy-app: pending, “Vercel is deploying your app” (preview, not production)
- Vercel – simy-website: success, “Canceled by Ignored Build Step” (not a successful build)
- Vercel – driving-team-website: success, “Canceled by Ignored Build Step” (not a successful build)
- App | Default: pending, queued (not a ruleset check)
- CodeQL Analyze (javascript-typescript): in_progress (not a ruleset check)

The pull request is not ready for a human merge. Two required checks were still running, and this report commit needs its own runs.

## Typecheck

Project typecheck did **not** complete.

`npx nuxi typecheck` on this tree exited 1 before checking files:

`Expected double-quoted property name in JSON at position 168 (line 8 column 3)`

`tsconfig.json` line 8 is `"strict": true,` with a trailing comma. `JSON.parse` rejects that comma. Nuxt’s typecheck loader uses that parser (`pkg-types` / `confbox`). The file was not edited.

Separate proposal, not applied: delete the comma so line 8 is `"strict": true`. TypeScript itself accepts the comma. This task does not change the file.

`vue-tsc --noEmit` was not completed on this machine. An earlier run with `--max-old-space-size=6144` aborted exit 134 (heap out of memory) and printed no type errors. That run was before this sync. `tsconfig.json` did not change in the sync, and this task did not repeat the out-of-memory run. A finished project typecheck is still **NOT VERIFIED**.

## SQL application gate

File: `sql_migrations/20261016_protect_website_custom_domain_evidence.sql`

Status: unapplied plan. Not run against staging or production.

A person may apply it only after checking the live database. These assumptions are not proven:

1. Tenant Data API sessions set `request.jwt.claim.role` to `authenticated`, and anonymous sessions set `anon`. The trigger reads that setting, not `auth.role()` and not `users.id`. If a real tenant JWT leaves the setting empty, the function returns `NEW` and does not block the column change.
2. Claim, verify, and delete, which use `getSupabaseAdmin()` (`SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`), do not arrive as `anon` or `authenticated`. New `sb_secret_` keys are sent as `apikey` with the bearer stripped (`server/utils/supabase-admin.ts`). Whether that path sets `request.jwt.claim.role` to `service_role` was not read. The trigger allows a missing role so those server writes are not rejected by assumption. That same missing-role path is the hole in assumption 1.
3. Table privileges on `website_tenants` for `anon`, `authenticated`, and `service_role` were not read. A column `REVOKE` was not used because a table-level `UPDATE` grant, if present, would still allow the column write. The tenant UI updates `website_status` through the user client, so table `UPDATE` was not revoked in this plan.
4. The existing policy `"Users can update their own website tenant"` matches `users.id = auth.uid()` for `staff` and `admin` (`migrations/001_create_website_tables.sql`). Whether production rows satisfy that was not read. The trigger does not change `users.id` or `auth_user_id`.
5. After apply, a staff or admin JWT that changes only `website_status` must still succeed, and the same JWT must fail when it changes `custom_domain_verification`, `custom_domain_verified`, `custom_domain_status`, or `custom_domain_verified_at`. A service-role claim/verify update must still succeed.
6. `custom_domain` itself is not in the trigger. A tenant who can update the row could still change the hostname. Routing would remain off because the predicate does not trust that write. Closing that column is a separate decision.
7. The function is in `public` and is not `SECURITY DEFINER`. Default `EXECUTE` grants on new public functions were not inspected. Applying the file should include a check that `anon` and `authenticated` cannot use it as a bypass. Direct execution is not the trigger path.

Until this SQL is applied and those checks pass, a matching tenant session may still write the JSON. The application predicate still ignores `tls.ok`, so that write does not enable routing.

## Future TLS and DNS gate

Do not implement this inside the current routing predicate.

Missing authoritative TLS reader:

- No code reads a certificate or a Vercel TLS/certificate API.
- `vercelVerifyDomain` is project-domain ownership verification.
- `hasAuthoritativeTlsEvidence()` returns false on purpose.
- Do not store or trust `custom_domain_verification.tls.ok`.
- Do not treat `dns.ok` or `vercel.verified` as a certificate.

Missing scheduled reconciliation:

- `checkDnsPointsToVercel` runs only when a tenant calls `server/api/website/custom-domain/verify.post.ts`.
- Nothing re-reads DNS or platform state on a timer.
- `checked_at` older than 60 minutes, missing, invalid, or in the future already fails closed.
- A fresh `checked_at` does not prove DNS is still valid.

Routing may be considered only after both a server-side certificate reader and a server-side refresh of DNS and platform evidence exist, and after the SQL gate above has been applied and checked. This task did not add either reader.

## What did not happen

- The pull request was not merged, approved, or marked ready.
- No workflow was dispatched by hand. The push started the checks listed above.
- No migration was applied.
- No production or staging database, DNS, Vercel domain, or certificate change was made.
- Custom-domain routing was not enabled.
