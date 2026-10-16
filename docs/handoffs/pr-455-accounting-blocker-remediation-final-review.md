# PR 455 — Final integration and merge-readiness review

Observation time: 2026-10-16T15:02:57Z.

`.cursor/rules/agent-handoff.mdc` is not in this branch and not on `origin/main`. This note follows the requested handoff contents, the earlier receipt-reset handoffs, and `.cursor/rules/ship-to-main.mdc`.

## Verdict

`CONDITIONAL PASS — SPECIFIC CHECKS REMAIN`

Local integration, lint, and tests passed on a clean tree. Required GitHub checks on the final head are not recorded in this commit because they did not exist yet. A human merge review waits until those live checks are green on the branch tip. This verdict does not authorize undrafting, merging, deployment, applying the migration, or correcting the live CHF 186 receipt.

## Heads

| Ref | SHA / state |
| --- | --- |
| Branch | `cursor/admin-payment-reset-59ff` |
| Head before this merge | `7b9ca64e7fdcfc773fdbe09634beaa80c818bff8` |
| Remediation code | `66177ac2322ae42fca5c03036ff65523da943ac3` |
| Prior handoff | `126f244c7afde433092094076e15473845d40912` |
| Merge commit | `fbbbea83e5bdf6b295a06f636038b8cafa0bfb86` |
| `origin/main` | `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121` |
| Previous merge base | `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e` |
| PR 455 before the merge | OPEN, draft, `MERGEABLE`, `BEHIND` |
| GitHub base branch tip before the merge | `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121` |

The merge commit's parents are `7b9ca64e7fdcfc773fdbe09634beaa80c818bff8` and `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121`. After the merge, `origin/main` is an ancestor of the branch. This document is committed on top of the merge. Working tree was clean before the merge and before the test run.

## Main commits integrated

One commit, and no others:

- `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121` — `fix(website): keep public legal pages available when HTML sanitizing fails (#457)`

Files in that commit:

- `pages/s/[subdomain]/datenschutz.vue`
- `pages/s/[subdomain]/impressum.vue`
- `server/api/public/website/[subdomain]/legal.get.ts`
- `utils/sanitize-tenant-html.ts`
- `server/utils/__tests__/p1-upload-vhtml-hours.test.ts` (sanitizer name assertion only)
- `server/utils/__tests__/website-legal-pages.http.test.ts`
- `server/utils/__tests__/website-legal-sanitizer-fallback.http.test.ts`
- three legal-pages handoffs under `artifacts/handoffs/`

No path overlaps the receipt-reset remediation. The merge was a normal merge commit. No rebase, no force-push, no conflict.

`git diff 7b9ca64e7fdcfc773fdbe09634beaa80c818bff8 fbbbea83e5bdf6b295a06f636038b8cafa0bfb86` is empty for:

- `migrations/20261016_admin_reset_mistaken_receipt.sql`
- `server/utils/payment-receipt-reset.ts`
- `server/utils/payment-receipt-reset-load.ts`
- `server/utils/payment-receipt-reset-http.ts`
- `components/admin/PaymentReceiptResetDialog.vue`
- the receipt-reset unit test, disposable-Postgres test, and schema fixture

Credit guards, idempotency payment binding, the already-applied return, `service_role` execute grant, and tenant checks are the remediation versions. The merge did not change them.

## Diff summary

The merge added 10 files, 1269 insertions and 32 deletions, all from #457.

The pull request against `origin/main` remains the receipt-reset feature: the admin dialog, preview and commit endpoints, planner, loader, migration, accounting exclusion of the marked storno, invoice history net, disposable-Postgres tests, and the handoffs. Three-dot diff `origin/main...HEAD` before this document: 28 files, 4310 insertions, 104 deletions.

## Tests

PostgreSQL 16.15 on this machine, database `simy_receipt_reset`, host `127.0.0.1:5432`. Disposable local cluster. The tests apply the migration only there. No production or staging database was contacted.

Focused, on merge commit `fbbbea83e5bdf6b295a06f636038b8cafa0bfb86`, clean tree:

```
npm run lint
npx eslint server/utils/payment-receipt-reset.ts server/utils/payment-receipt-reset-load.ts server/utils/payment-receipt-reset-http.ts --max-warnings 0
RECEIPT_RESET_TEST_DATABASE_URL=postgres://simy_receipt:simy_receipt@127.0.0.1:5432/simy_receipt_reset \
  npx vitest run server/utils/__tests__/payment-receipt-reset.test.ts server/utils/__tests__/payment-receipt-reset.db.test.ts
```

Lint exit 0. Focused Vitest: 30 passed (13 planner/SQL/dialog, 17 disposable Postgres).

Full suite, same SHA, clean tree:

```
RECEIPT_RESET_TEST_DATABASE_URL=postgres://simy_receipt:simy_receipt@127.0.0.1:5432/simy_receipt_reset npm test
```

Vitest: 3211 passed, 0 failed, 282 files. Node `scripts/ci/validate-supabase-db-url.test.mjs`: 17 passed, 0 failed. Exit 0. The increase from the earlier 3189 tests is the legal-pages coverage that arrived with #457; those tests ran and passed in this suite. No test was skipped to hide a failure. The earlier dirty-tree failure of `course-invoice-phase1-schema.test.ts` test 29 did not recur.

## Required remote CI

Not observed for this commit at authoring time. Do not read local tests as GitHub checks.

Expected required contexts, from ruleset `Protect main — Required CI` as used by this repository: **Test and lint**, **E2E login**, **Dependency review**. App Store checks are not merge gates. Confirm the live ruleset before treating any check list as complete.

## Limitations

- Wallet and Staff-POS credit still fail closed. There is no partial reversal. `student_credits.balance_rappen` is not scanned.
- A reset applied before the credit guard can replay as `already_applied` and does not remove leftover credit.
- The migration is not applied anywhere except the disposable test database.
- The live CHF 186 receipt was not corrected.
- This pull request stays a draft.

## Confirmation

No production or staging Supabase write. No migration applied outside disposable local Postgres. No live receipt correction. No merge, undraft, approval, deploy, or workflow dispatch. `main` was not pushed.

## Next human action

Read the live required checks on the branch tip. If they are green, review the draft. Merging, marking ready, applying the migration, and correcting a live receipt stay separate human decisions.
