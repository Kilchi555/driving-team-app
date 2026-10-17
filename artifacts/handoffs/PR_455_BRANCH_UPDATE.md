# PR 455 branch update

Verdict: the draft contains current `main`. Required checks passed on the merge. The pull request is a draft again.

## SHAs

- PR: https://github.com/Kilchi555/driving-team-app/pull/455
- Branch: `cursor/admin-payment-reset-59ff`
- Original head: `6dc37cb114a59aac4da8cd32e2cc436984092576`
- Base at the start of this update: `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e`
- Integration head: `bfe04444f46a1a11278102d4ad8dbd09ce098c3c`
- Live `main` after the merge: `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e`
- This note is committed on top of the integration head.

## Integration

Method: `git merge origin/main`. No rebase. No force-push. The merge commit parents are the original head and `e1248c0b`.

Conflicts: none. No payment, security, tenant, or migration file was edited by hand.

`main` was already an ancestor of the integration head. GitHub `mergeable_state` on that head was `blocked` because the pull request is a draft, not `behind`.

## Files from main

The merge brought in the three `main` commits without edits:

- `f1efbe6d` booking slot days
- `57543d57` invoice update allowlist
- `e1248c0b` company invoice route

Conflict-resolution files: none.

## Local tests before the push

`npm test` on the merge: 3180 vitest tests passed, including `payment-receipt-reset.db.test.ts` (11), plus 17 database-URL checks. `npm run lint` passed.

## Checks on the integration head

Ruleset `Protect main — Required CI` requires Test and lint, E2E login, and Dependency review. App Store checks are not in that list.

| Check | Result |
| --- | --- |
| Test and lint | pass, run `38902248048`, 3180 tests, including the 11 disposable-Postgres receipt-reset tests |
| E2E login | pass, same run, 5m36s |
| Dependency review | pass, run `38902247850` |
| CodeQL | pass, not required |
| App \| Default | fail, not required |
| App \| Default \| Archive - iOS | fail, not required |

## Draft

At 2026-10-16 12:41:23 UTC the account Kilchi555 marked the pull request ready. This update converted it back to draft. It was not merged.

## Remaining blockers

- Do not merge, deploy, apply the migration, or correct a live payment.
- App Store checks are still failing and are outside the ruleset.
- A later `main` commit would make the branch out of date again.
