# Review-state observer (`<!-- simy-review-state -->`)

Verified from `main` after merge of `3b7fc0dd` (#368).

**When to use:** Interpreting the SIMY review-state PR comment; debugging why a PR is not `ready_for_human_merge`; changing observer triggers, schema, or publication safety; writing a future executor that must **not** treat the comment as authority.

Policy companion: always-on `.cursor/rules/ship-to-main.mdc` (Review state section). This runbook is the code-verified operational detail. Open draft [#168](https://github.com/Kilchi555/driving-team-app/pull/168) still describes removed auto-merge — do not fold this observer into that draft.

---

## Intent

#368 adds a **read-only observer** that publishes one machine-readable PR comment per observation. Humans (and any future controller) get a single cache of:

- required ruleset checks
- open Bugbot findings / review threads
- mergeability signals
- one `next_action`

It does **not** merge, approve, push, deploy, apply SQL, or call Supabase. `cache.may_merge`, `cache.may_automate`, and `executor.may_automate` are always `false`. `ready_for_human_merge` means only that **this observation** found conditions for a human merge decision at the observed `head_sha`.

---

## Contract

### Marker and schema

| Field | Value |
|-------|-------|
| HTML marker | `<!-- simy-review-state -->` |
| `schema_version` | `3` (`SUPPORTED_SCHEMA_VERSION`) |
| Trusted author | `github-actions[bot]` only — forged markers are ignored |
| Canonical selection | greatest `started_at`, then `observed_at`, then `evaluation_id` |
| Publication | **append** a new comment; never PATCH one observation body over another |
| Retirement | non-canonical comments lose the marker (body rewritten without `MARKER`) |

Consumers must reject stale `head_sha`, unknown/mismatched schema, malformed JSON, untrusted author, inconsistent `freshness`, or a comment that claims `ready_for_human_merge` / `rebase` without the matching executor flags.

### Workflow (`.github/workflows/review-state.yml`)

| Trigger | Role |
|---------|------|
| `pull_request` opened/synchronize/reopened/ready_for_review/converted_to_draft | Update that PR |
| `pull_request_review` submitted/edited/dismissed | Update that PR |
| `pull_request_review_comment` created/edited/deleted | Update that PR |
| `check_run` completed | Update only when the check name is in the watched set (required CI, CodeQL variants, Cursor Bugbot) |
| `schedule` `*/15 * * * *` | Refresh open PRs targeting `main` |
| `workflow_dispatch` | Same as schedule |

**Not a trigger:** `pull_request_review_thread` (GitHub Actions does not accept it). Resolving a thread does **not** by itself refresh the comment.

Permissions: `contents: read`, `pull-requests: write`, `checks: read`. No `contents: write`, deployments, or Supabase.

Concurrency sits on the **publish job** (`group: simy-review-state`, `cancel-in-progress: false`). A skipped `check_run` never enters the group. The job name «Publish review state» is not a watched check, so the workflow does not retrigger itself.

### Required checks and noise

Policy expectations (as of 2026-09-26 ruleset `Protect main — Required CI`):

1. Test and lint  
2. E2E login  
3. Dependency review  

These names are **never** copied over an empty, missing, unverified, or mismatched live ruleset. Fail-closed → no `ready_for_human_merge`.

Ignored noise (reported, not gating): `App | Default`, `App | Default | Archive - iOS`.

CodeQL: `codeql.gate` is always `not_required`. `codeql.clean` is true **only** when status is `pass`. `fail`, `unknown`, and missing are not clean.

### `next_action` precedence (high → low)

| Action | Meaning |
|--------|---------|
| `escalate` | Uncertain observation, ruleset fail-closed, unknown merge state, unresolved non-actionable threads, etc. Do not automate. |
| `fix` | Failed required check and/or actionable open Bugbot finding on this head. Re-read live head/checks/threads before any fix. |
| `wait` | Pending/cancelled required checks, or draft PR. Cancelled ≠ code fix. |
| `rebase` | Branch `BEHIND`/`DIRTY` **and** `blocking_reasons` + `actionable_findings` empty. Sync onto base only; not a content fix. |
| `ready_for_human_merge` | Human decision only — not permission to merge. |

`risk_hint` stays `unknown`.

### Freshness

| Condition | `freshness.guarantee` | `max_lag_minutes` |
|-----------|----------------------|-------------------|
| `.github/workflows/review-state.yml` present on **default branch** | `scheduled` | `15` |
| Otherwise | `none` | `null` |

Always: `live: false`, `covers_thread_resolution: false`, `event_driven: true`. Do not treat a missing guarantee as a 15-minute bound. Scheduled availability is read from the default branch, not from the PR head.

### Publication barriers

Before create:

1. Re-read live head — skip if ≠ observation `head_sha`
2. Refuse truncated comment pages (`MAX_LIST_PAGES`)
3. SIGINT/SIGTERM sets a halt flag checked before writes
4. In-process publication lock per PR
5. Round-trip: refuse publish if rendered JSON does not match `next_action` / schema

---

## Constraints & pitfalls

1. **Comment ≠ merge gate** — Required ruleset checks + human merge still apply. Green Cursor/Vercel/App Store rolls are not the gate.
2. **Stale head** — Ignore any comment whose `head_sha` is not the live PR head.
3. **Earlier start loses** — An observation that started earlier cannot become canonical even if it finishes later.
4. **Thread resolve lag** — Expect eventual refresh via review events, check completion, or the 15-minute schedule (only when guarantee is `scheduled`).
5. **Bugbot uncertainty** — If Bugbot/threads cannot be parsed, findings are withheld and the Bugbot block is marked uncertain; that is not a clean Bugbot result.
6. **Unknown required check** — Status `unknown` escalates; it is not treated as fail or ready.
7. **Do not recreate** `.github/workflows/auto-merge.yml` (#222). This observer is not a substitute.
8. **Open #167** proposes GREEN-only auto-merge restore — document behavior only after that merges (would also rewrite ship-to-main).

---

## Codepaths

| Path | Role |
|------|------|
| `.github/workflows/review-state.yml` | Triggers, permissions, job concurrency, watched check_run names |
| `scripts/review-state.mjs` | Evaluate, render, publish, retire; GitHub API client |
| `utils/__tests__/review-state.test.ts` | Decision matrix, Bugbot/threads, ruleset fail-closed, freshness, publisher barriers, workflow safety |
| `.cursor/rules/ship-to-main.mdc` | Always-on human/agent policy for the same observer |

Key exports: `evaluateReviewState`, `renderReviewComment`, `planPublication`, `selectCanonicalMarker`, `freshnessContract`, `resolveRulesetPolicy`, `readWorkflowOnDefaultBranch`.

---

## Verify

```bash
npx vitest run utils/__tests__/review-state.test.ts
```

Manual: open a PR into `main`, wait for «Review state» / «Publish review state», confirm a `<!-- simy-review-state -->` comment from `github-actions[bot]` with `schema_version: 3` and `cache.may_automate: false`.
