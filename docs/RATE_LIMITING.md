# API rate limiting (milliseconds)

**When to use:** Clients get blocked after a few requests; `retryAfter` looks wrong; adding `checkRateLimit` to a new endpoint; logs warn that `windowMs` looks like seconds.

Verified against source (Sep 2026). Commit `e588ebd6` (#112).

---

## Intent

`checkRateLimit` persists attempts in Supabase (`rate_limit_logs`) with an in-memory cache and exponential backoff after consecutive blocks. All windows are **milliseconds**.

---

## Signature

```ts
checkRateLimit(
  key,              // usually IP
  operation,        // string name (preferred)
  maxRequests?,     // override
  windowMs?,        // milliseconds — prefer 3600 * 1000 for one hour
  email?,
  tenantId?,
)
```

Returns `{ allowed, remaining, limit, reset /* ms */, retryAfter /* seconds */ }`.

Legacy two-arg form `checkRateLimit(key, maxRequests, windowMs)` still works but logs a warning and scopes under operation `legacy_unscoped`.

---

## Built-in operations (`LIMITS`)

Examples (see `server/utils/rate-limiter.ts` for the full map):

| Operation | Default |
|-----------|---------|
| `register` | 5 / 1 min |
| `login` | 10 / 1 min |
| `password_reset` | 5 / 15 min |
| `booking_proposal` / `booking_inquiry` | 5 / hour |
| `cancel_customer` | 50 / hour |
| `process_payment` | 20 / 1 min |

Backoff multipliers after consecutive `blocked` rows (24h lookback): 1×, 2×, 5×, 15×, 60×, 240× the base window.

---

## Pitfalls

- **`windowMs` is ms, not seconds.** `3600` is 3.6s. Use `3600 * 1000` (or `60 * 60 * 1000`) for one hour. Values `> 0` and `< 1000` log a warning.
- Pass an **operation name** as the second argument. Bare numeric legacy calls share one bucket (`legacy_unscoped`).
- If Supabase credentials are missing, the limiter **allows** the request (fail open) and relies on process-local cache only when populated.
- `retryAfter` is `ceil(reset / 1000)` seconds for API clients; `reset` itself stays in milliseconds.
- SARI has a separate helper: `server/utils/sari-rate-limit.ts` (also ms-based after #112).

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/rate-limiter.ts` | Core limiter + `LIMITS` |
| `server/utils/__tests__/rate-limiter.test.ts` | Unit coverage |
| `server/utils/sari-rate-limit.ts` | SARI-specific limiter |
| Many `server/api/**/*.ts` | Call sites fixed to ms windows in #112 |
