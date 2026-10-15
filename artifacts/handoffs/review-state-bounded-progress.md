# Review-state bounded processing

Verdict: **CONDITIONAL PASS**

Draft only. Not merged and not deployed.

| | |
|---|---|
| Base SHA | `3b7fc0dd5fd047bf7aa6db1e4165d384450da52f` |
| Branch | `cursor/review-state-bounded-progress-4afd` |
| Head SHA | `5b691a0080c8fff61a6aafbc5a7677eef1c8d5bf` |
| PR | https://github.com/Kilchi555/driving-team-app/pull/437 |

The parent of the head commit is the base SHA. Cron, `timeout-minutes`, and `cancel-in-progress: false` are unchanged.

## What the change does

- `scripts/review-state.mjs` reads the default-branch workflow file and the ruleset catalog once per process. `rulesetFor(baseRef)` still selects per base.
- A six-minute script budget stops the loop before the next pull request. The pull request already started, including retirement, is finished by that call. GitHub’s eight-minute job limit is unchanged.
- Order is the canonical marker `observed_at` on the pull request: never processed, then oldest, then lower pull-request number. Truncated comment lists sort last.
- Unchanged semantic observations skip write (keep #435 update-in-place / unchanged skip). A real decision change updates the trusted canonical marker in place; it does not append a second marker. Duplicate or malformed trusted markers are retired when the canonical decision still matches.
- Non-auth PR failures do not stop later pull requests and are not counted as processed. 401/403/429 still stop the remaining set. The summary log sets `complete=false` when work remains or a pull request failed.

## Tests

- `./node_modules/.bin/vitest run utils/__tests__/review-state.test.ts` — exit 0, 93 passed (prep merge onto main)
- `npx eslint --max-warnings 0 scripts/review-state.mjs utils/__tests__/review-state.test.ts` — exit 0
- `git diff --check` — exit 0

## Residual

- Sparse `schedule` creation is still unproven. The cron was not changed.
- `withPublicationLock` is per Node process. Cross-runner exclusion is still only the existing job concurrency group.
- One pull request that itself runs longer than the time left in the eight-minute job can still be killed. Observed work was about five seconds per pull request; the budget leaves about two minutes after the script stops starting new ones.
- No live schedule run has executed this commit yet.
