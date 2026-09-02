# Wallee webhook replay guards

**When to use:** Webhook returns `{ ignored: … }` with no payment update; duplicate FULFILL deliveries flood logs; a delayed Wallee retry never lands; debug/recovery calls need to bypass time checks.

Verified against source (Sep 2026). Commit `dc74b919` (#110). Companion recovery flow: [`WALLEE_PAYMENT_RECOVERY.md`](./WALLEE_PAYMENT_RECOVERY.md).

---

## Intent

Wallee does **not** sign webhook bodies. The handler already re-fetches the transaction from the Wallee API before mutating payments. Replay helpers only:

1. Skip expensive duplicate work when the same `entityId` + `state` already succeeded.
2. Reject impossible future clocks on external deliveries.
3. **Never** hard-drop a stale first delivery — Wallee’s own delayed retries must still process.

---

## Contract

| Constant | Value | Meaning |
|----------|-------|---------|
| `WALLEE_WEBHOOK_MAX_AGE_MS` | 15 minutes | Timestamps older than this are `stale` |
| `WALLEE_WEBHOOK_MAX_FUTURE_MS` | 5 minutes | Timestamps further ahead are `future` |

`classifyWalleeWebhookTimestamp(raw, now)` → `ok` | `stale` | `future` | `missing`.

Accepts ISO strings, unix **seconds**, or unix **milliseconds** (`raw < 1e12` → seconds).

`shouldShortCircuitWalleeWebhook({ timeClass, alreadyProcessedSameState, isInternal })`:

| Condition | Result |
|-----------|--------|
| Same `transaction_id` + `wallee_state` (+ optional `space_id`) already has `webhook_logs.success = true` | `{ skip: true, reason: 'already_processed' }` |
| External request with `timeClass === 'future'` | `{ skip: true, reason: 'future_timestamp' }` |
| `stale` and **not** already processed | Process (log a warning) |
| Internal secret request (`isInternal`) | Time never blocks |

Skipped webhooks still return HTTP success: `{ success: true, ignored: '<reason>' }`.

---

## Surfaces

- `POST /api/wallee/webhook` — production ingress
- `POST /api/debug/webhook-test` — internal / recovery callers (time short-circuit disabled)

Duplicate detection queries `webhook_logs` **before** the expensive handler runs.

---

## Pitfalls

- **Do not** add “older than 15 minutes → drop”. That was deliberately rejected: first delivery of a new state after a delay must still update the payment. Recovery cron covers stuck `pending` rows separately.
- Duplicate skip keys on **successful** logs only. A failed prior attempt for the same state is retried.
- Future timestamps are ignored only for **external** traffic. Super-admin / cron-style internal tests must keep working with synthetic clocks.
- Unsigned body ≠ “trust the payload”. Always re-fetch from Wallee before payment mutations (existing Layer 4); replay guards are not a signature substitute.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/wallee-webhook-replay.ts` | Parse / classify / short-circuit |
| `server/utils/__tests__/wallee-webhook-replay.test.ts` | Unit coverage |
| `server/api/wallee/webhook.post.ts` | Layer-0 check before handler body |
| `server/api/debug/webhook-test.post.ts` | Internal path |
| `docs/WALLEE_PAYMENT_RECOVERY.md` | Logging, pending recovery cron, SQL |
