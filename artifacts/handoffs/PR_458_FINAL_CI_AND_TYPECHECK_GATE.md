# PR 458 — final CI and typecheck gate

Observation timestamp: 2026-10-16T15:00:32Z

PR: https://github.com/Kilchi555/driving-team-app/pull/458
Branch: `cursor/custom-domain-routing-gate-5594`

Verdict: **BLOCKED**

No merge, approval, undraft, deployment, or database write occurred. Custom-domain routing was not enabled. Production behavior and live TLS remain **NOT VERIFIED**.

## State

| | SHA |
| --- | --- |
| PR head at the start of this read | `5173b40c5440d781b0f58f7d1d273de16eb5454c` |
| Sync commit | `7046c1304d444bb2b557b84b049a8f2d65427f71` |
| `origin/main` | `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121` |
| PR base | `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121` |

Live GitHub at that read: draft `true`, `mergeable` `MERGEABLE`, `mergeStateStatus` `UNSTABLE`, `reviewDecision` empty. UNSTABLE is the App Store status below, not a ruleset failure and not a conflict. The draft still blocks the merge button.

This file is committed with the `tsconfig.json` comma removal. Required-check successes on `5173b40c` do not apply to that later commit.

The worktree also had an unstaged one-line edit in `artifacts/handoffs/PR_458_SYNC_AND_REVALIDATION.md`. It was not part of this change and was not committed.

## Required CI on `5173b40c`

All three are bound to `head_sha` `5173b40c5440d781b0f58f7d1d273de16eb5454c`.

| Check | Conclusion | Completed |
| --- | --- | --- |
| Test and lint | success | 2026-10-16T14:49:48Z |
| E2E login | success | 2026-10-16T14:49:16Z |
| Dependency review | success | 2026-10-16T14:48:02Z |

Run `38918675648` contains Test and lint and E2E login. Run `38918675685` is Dependency review.

Not required on the same SHA:

- App | Default: failure, updated 2026-10-16T14:51:23Z, description `failed`. Archive - iOS: `action_required`, completed 2026-10-16T14:50:59Z. These are not ruleset checks and were not investigated as custom-domain defects.
- Vercel – simy-app, simy-website, and driving-team-website: `Canceled by Ignored Build Step`. That is not a successful application build. The tip commit only changed a handoff. A later human squash onto `main` is a different build path and was not run.
- CodeQL: success. Not a required ruleset check.

## Typecheck

The trailing comma is real and it is not from this branch. `git blame` attributes `tsconfig.json` lines 2–14 to `d74f51f55` (2025-06-28, “funktioniert wieder”). `origin/main` has the same comma. This PR did not introduce it.

`npx nuxi typecheck` calls `readTSConfig` from `pkg-types` (`node_modules/@nuxt/cli/dist/chunks/typecheck.mjs`). That calls `parseJSONC` without `allowTrailingComma`. `confbox` then runs `JSON.parse` after stripping comments only. A trailing comma is invalid for that parser. TypeScript’s own loader accepts the comma. The comma does not change `"strict": true`.

Minimal correction, applied: delete the comma so line 7 is `"strict": true`. No compiler option was loosened. `server/utils/__tests__/tsconfig-json.test.ts` asserts `JSON.parse` of `tsconfig.json` succeeds and `compilerOptions.strict` stays `true`.

Command, after that edit, heap 10 GB:

`NODE_OPTIONS=--max-old-space-size=10240 npx nuxi typecheck`

Result: the config parser got past `tsconfig.json`. `vue-tsc --noEmit` ran to completion and exited 2. Nuxt reported exit 1. It did not run out of memory. It did not pass.

`/tmp/nuxi-typecheck.txt` contains 4723 `error TS` lines. 2640 of those are `Cannot find name`. Examples in this PR’s files are Nuxt auto-imports, the same class of error as `logger` and `navigateTo` elsewhere in the tree:

- `server/middleware/02.custom-domain.ts`: `getRequestHeader`, `getRequestURL`
- `server/utils/custom-domain.ts`: `useRuntimeConfig`

`origin/main`’s custom-domain middleware also calls `getRequestHeader` without importing it. Those names were not fixed here, and strictness was not reduced. Clearing the 4723 errors is outside this pull request.

Project typecheck completed and failed. That is the typecheck blocker that remains.

## Security revalidation

Commands on this tree, 2026-10-16T14:57:37Z:

`npx vitest run server/utils/__tests__/custom-domain-routing-gate.test.ts server/utils/__tests__/custom-domain-app-host.test.ts server/utils/__tests__/tsconfig-json.test.ts`

3 files, 25 tests, passed.

`npx eslint` on those three files with `--max-warnings 0` exited 0.

Confirmed in source:

- `hasAuthoritativeTlsEvidence()` returns false (`server/utils/custom-domain.ts`). There is still no certificate reader.
- `hasPositiveTlsEvidence` does not read stored `tls.ok`. `vercel.verified` stays inside platform evidence and is not a certificate.
- `isCustomDomainRoutingEnabled` requires `hasAuthoritativeTlsEvidence()`, so stored `tls.ok` cannot activate routing. Freshness is also required and is not sufficient. Missing, invalid, future, and older-than-60-minute `checked_at` fail the tests.
- A database error becomes `not_found`. The middleware throws HTTP 404. There is no `CACHE_MS` and no `new Map` in `server/middleware/02.custom-domain.ts`.
- `app.simy.ch/s/{tenant}` stays on the app route. An unknown custom host is `not_found`.
- URL builders call `customDomainOrigin`, which uses the same closed predicate: `website-billing.ts`, `website-ensure-home.ts`, `website-ensure-seo-pages.ts`, `wizard-save.post.ts`, `slots-save.post.ts`, `addon/generate.post.ts`, `billing-status.get.ts`, plus the SEO and public website callers.

## Database migration human gate

`sql_migrations/20261016_protect_website_custom_domain_evidence.sql` was not applied. It is not live policy.

Before a person applies it:

1. Read live table and column privileges on `website_tenants` for `anon`, `authenticated`, and `service_role`. A table-level `UPDATE` grant makes a column `REVOKE` ineffective. This plan uses a trigger instead, and it does not revoke table `UPDATE`, because the tenant UI updates `website_status`.
2. Read a real tenant JWT and confirm `request.jwt.claim.role` is `authenticated` (and `anon` for the anonymous key). The trigger allows the write when that setting is missing. If tenant sessions do not set it, the trigger does not protect the columns.
3. Read the role claim used by `getSupabaseAdmin()` (`SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`, including an `sb_secret_` key sent only as `apikey`). Claim, verify, and delete must still be able to write the columns. They must not arrive as `anon` or `authenticated`.
4. After a staging apply, prove a staff/admin update of `website_status` still works, a staff/admin update of `custom_domain_verification`, `custom_domain_verified`, `custom_domain_status`, or `custom_domain_verified_at` fails with `42501`, and a service-role claim/verify update still succeeds.
5. Rollback is `DROP TRIGGER website_tenants_protect_custom_domain_evidence ON public.website_tenants` and `DROP FUNCTION public.protect_website_custom_domain_evidence()`. Take that from a database backup or a staging rehearsal first. Do not apply it to production from this pull request.
6. `custom_domain` is not covered. `users.id` was not changed. The existing policy still matches `users.id = auth.uid()`, and whether production rows match was not read.

Until that staging proof exists, a matching tenant session may still write the JSON. The routing predicate still ignores `tls.ok`.

## TLS infrastructure dependency

Do not enable routing in this pull request. These pieces do not exist:

- A server-side reader of certificate status for the exact hostname, from the certificate issuer or a Vercel TLS/certificate API. `vercel.verified`, `dns.ok`, and `tls.ok` are not that reader.
- Binding of that result to the tenant row and the requested host, with failure, mismatch, expiry, and revocation all fail-closed.
- A scheduled job that re-reads DNS and platform state at least every 60 minutes and writes `checked_at` only from that job. Verify-on-demand is the only DNS read today.
- Tests that expired, missing, mismatched, and unavailable evidence do not route. The current tests cover the closed predicate. They are not a live certificate check.

## Blockers

1. `vue-tsc --noEmit` completed and failed with 4723 errors. The trailing-comma parse error is fixed. The remaining errors were not cleared.
2. Required checks must be read again on the commit that contains the `tsconfig.json` change. The successes on `5173b40c` are not that commit.

SQL application and the TLS reader remain separate human gates. They were not performed.
