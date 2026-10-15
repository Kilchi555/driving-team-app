# Review-state merge gate

Verdict: **CONDITIONAL PASS**

Observation: `2026-10-15T09:05:06Z`

Draft only. Not merged, not undrafted, not approved, and not deployed. No schedule run has executed the reviewed head. **RUNTIME VERIFICATION PENDING.**

| | |
|---|---|
| PR | https://github.com/Kilchi555/driving-team-app/pull/437 |
| Branch | `cursor/review-state-bounded-progress-4afd` |
| Reviewed head | `63afb35b71f3ad6af1f9f8d6c42dfbff359d81c6` |
| Base | `3b7fc0dd5fd047bf7aa6db1e4165d384450da52f` |
| State at observation | open, `isDraft=true`, `mergeable=MERGEABLE`, `mergeStateStatus=UNSTABLE` |
| Reviews | none (`reviewDecision` empty, 0 review threads) |
| CI run on the reviewed head | https://github.com/Kilchi555/driving-team-app/actions/runs/38706777032 |

This file is a later docs commit on the same branch. The gate above is for `63afb35b`. Required checks have to be green again on the commit that contains this file before a human merge.

## Required checks on `63afb35b`

Ruleset “Protect main — Required CI” requires Test and lint, E2E login, and Dependency review.

| Check | Result |
|---|---|
| Test and lint | success (272 files, 3067 tests; `utils/__tests__/review-state.test.ts` 83 tests) |
| E2E login | success |
| Dependency review | success |

App | Default was pending at the earlier read and was **FAILURE** at `2026-10-15T09:05:06Z`. It is not a required ruleset check. CodeQL, Bugbot, and Vercel are not required.

## Criteria

| Criterion | Result |
|---|---|
| Parent of the implementation commit is `3b7fc0dd` | met (`5b691a00`) |
| Cron, `timeout-minutes: 8`, and `cancel-in-progress: false` unchanged | met (workflow diff empty) |
| Shared workflow-file and ruleset reads once per process | met |
| Six-minute script budget; in-flight pull request, including retirement, finishes | met |
| Fair order from canonical `observed_at`; truncated lists sort last | met |
| Unchanged decision skips create and retirement | met |
| Changed decision still appends and retires | met |
| Extra or malformed trusted markers retire without a new create | met |
| One failure does not stop later pull requests | met |
| Secret-free summary log | met |
| Live schedule log of this head | not met |

## Facts

- The controller change is in `scripts/review-state.mjs` and `utils/__tests__/review-state.test.ts`.
- `withPublicationLock` is still an in-process lock. Cross-runner exclusion is the existing job concurrency group.
- Sparse `schedule` creation remains unproven. The cron was not edited.
- No post-merge schedule run exists, because the pull request is not merged.

## Human merge prerequisites

1. Keep the pull request draft until a person marks it ready.
2. Squash-merge only after Test and lint, E2E login, and Dependency review are green on the current head.
3. Leave PR #435 unmerged if the cron must stay. That branch removes the schedule.
4. After merge, wait for a natural `schedule` run. Do not dispatch one. Read its log before claiming the budget, order, or unchanged-skip behaved as intended.

## Not done

No merge, undraft, approval, workflow edit, cron edit, timeout edit, concurrency edit, dispatch, deploy, production database access, or Stripe change.
