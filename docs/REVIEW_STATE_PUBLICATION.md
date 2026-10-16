# Review-state publication (idempotent update / skip)

**When to use:** Debug duplicate `<!-- simy-review-state -->` comments or notification storms; change publish/create/update/skip behavior; restore or reason about the `*/15` schedule; interpret the 2026-10-15 incident after #435/#439.

Verified against `main` after `15c5a64a` (#435) and `254a2d95` (#439).

**Supersedes** the **append-only publication** claim in open draft [#433](https://github.com/Kilchi555/driving-team-app/pull/433) (`REVIEW_STATE_OBSERVER`) and the pre-#435 sentence in older copies of `ship-to-main.mdc`. Observer semantics (cache ≠ authority, required checks, `next_action`, freshness) still belong in that runbook once rebased onto this publication model — do not fold auto-merge drafts (#168 / #167) here.

Incident log: [`incidents/2026-10-15_review-state-notification-storm.md`](./incidents/2026-10-15_review-state-notification-storm.md) (historical; resolution note at the end).

Policy companion: `.cursor/rules/ship-to-main.mdc` (Review state — publication paragraph).

---

## Intent

#368 published a new observation comment on every run (append-only). With schedule fan-out across open `base=main` PRs, that caused mass `createComment` traffic and notification storms (e.g. Actions run `38666954356`).

#435 keeps the observer read-only for product systems, but changes **publication**:

1. **Update in place** when a trusted canonical marker exists and the semantic observation changed
2. **Skip** (no write) when the semantic observation is unchanged
3. **Create** only when no trusted marker exists
4. Retire non-canonical trusted markers (strip `MARKER` from body)

#439 restores `schedule: cron '*/15 * * * *'` on `main` once update/skip is safe — containment is the idempotent publisher, not a permanent cron removal.

---

## Contract

### `planPublication` (`scripts/review-state.mjs`)

| Outcome | When |
|---------|------|
| `skip` `stale-head` / `cancelled` / `comments-truncated` | Live head ≠ observation, halt/cancel, or comment list truncated (`MAX_LIST_PAGES`) |
| `skip` `already-current` | Canonical `evaluation_id` already equals this observation |
| `skip` `stale-snapshot` | Canonical is newer/equal by `started_at` / observation compare |
| `skip` `unchanged` | Canonical exists and `observationsSemanticallyEqual` (timestamps / `evaluation_id` excluded from the stable payload) |
| `update` | Canonical trusted marker exists; semantic payload changed → `PATCH` that comment id |
| `create` | No trusted marker → `POST` once; retire any leftover marked ids |

Trusted author for markers: `github-actions[bot]` only. Canonical selection among trusted markers remains greatest `started_at`, then `observed_at`, then `evaluation_id`.

### Workflow (`.github/workflows/review-state.yml`)

| Item | Current `main` |
|------|----------------|
| Schedule | `*/15 * * * *` restored (#439) |
| `workflow_dispatch` | Same fan-out as schedule (update/skip/create; still API-heavy across open PRs) |
| Concurrency | Job-scoped `simy-review-state`, `cancel-in-progress: false` |
| Product side effects | None (no merge, deploy, Supabase) |

Header comments on the workflow file document the storm root cause and the update/skip contract.

### GitHub write retries

Transient `429` / `502` / `503` / `504` use bounded backoff (`retryDelayMs`, respects `Retry-After` capped at 60s). `403` is not retried as success-path publish.

---

## Constraints & pitfalls

1. **Append-only is obsolete** — Do not reintroduce unconditional `createComment` per run; that recreates the storm under schedule fan-out.
2. **Unchanged ≠ silent forever** — Semantic equality ignores `started_at` / `observed_at` / `evaluation_id`. Clock-only refreshes should skip; real check/thread/`next_action` changes still update.
3. **Schedule is safe only with update/skip** — Removing the cron was temporary containment during #435; after merge, #439 restored it. Disabling the workflow is still the emergency brake.
4. **Comment edits can still notify** — Quieter than creates, but some notification settings still surface edits.
5. **Open #433** — Rebase its Publication row from “append” to this contract before merge; until then treat this file as canonical for publish behavior.
6. **Still not a merge gate** — Update-in-place does not grant `cache.may_merge` / `executor.may_automate`.

---

## Codepaths

| Path | Role |
|------|------|
| `.github/workflows/review-state.yml` | Triggers including restored schedule; permissions; publish job concurrency |
| `scripts/review-state.mjs` | `planPublication`, `observationsSemanticallyEqual`, `publishObservation`, GitHub create/update/retire + retries |
| `utils/__tests__/review-state.test.ts` | Create-once, update-in-place, unchanged skip, 429 backoff, schedule detection |
| `docs/incidents/2026-10-15_review-state-notification-storm.md` | Incident timeline + post-merge resolution |
| `.cursor/rules/ship-to-main.mdc` | Always-on policy: update/skip/create (not append-only) |

---

## Quick verify

```bash
npx vitest run utils/__tests__/review-state.test.ts
```

Optional ops check after workflow changes: `workflow_dispatch` on a quiet PR should **skip** or **update** one trusted marker — not create a second.
