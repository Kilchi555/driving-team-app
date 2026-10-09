# Trial cache authorization (#337)

Verified against `main` tip including `9f72b453`.

## Intent

Stop `app-session-cache` (localStorage) from authorizing tenant access after a trial or paid subscription has expired. Subscription entitlements are server-authoritative for the current page load.

## Contract

- Gate decision helper: `decideTrialGate` in `utils/trial-gate.ts`.
- Inputs: `path`, `now`, `info` (`TenantTrialSnapshot | null`), `loggedInWithTenant`, `authority` (`TrialAuthority`: `idle` | `pending` | `server` | `unavailable`).
- Outcomes: `allow` | `upgrade` | `wait`.
- Public prefixes always allow: `/upgrade`, `/payment`, `/login`, `/register`, `/tenant-register`.
- Protected prefixes only: `/admin`, `/staff`, `/customer`.
- Logged-out visitors: `allow` (auth middleware handles login). Missing trial info must not be treated as expired.
- `authority` `pending` or `idle`: `wait`.
- `authority` not `server`, or `info` null: `upgrade` (fail closed). Never fall open on cache.
- `website_only`: `allow`.
- Paid plan (`!is_trial` and `subscription_plan` set and not `'trial'`): allow if no `current_period_end` or period not ended; else `upgrade`.
- Trial with `trial_ends_at` past `now`: `upgrade` except exact `/admin` and `/admin/users` (`TRIAL_EXPIRED_ALLOWED`).
- Server fetch: `resolveServerTrialAuthority({ cached, fetchServer })` — `cached` is intentionally unused (`void input.cached`). Success requires `typeof info.is_trial === 'boolean'` → `authority: 'server'`; otherwise `unavailable` with `info: null`.
- Persist helpers: `stripCachedSubscriptionProfile`, `sessionRestorePlan`, `buildPersistentSession` in `utils/session-persistence.ts`. New writes never include `trialInfo`. Restore strips nested `profile.tenant`. Legacy `PersistentSession.trialInfo` may still exist in older browsers and must be ignored.
- Live authority lives only in the Pinia store: `tenantTrialAuthority` / `tenantTrialInfo`, set by `applyServerTenantTrial` or `loadTenantTrialInfo` (`stores/auth.ts`). Refresh source: `GET /api/tenants/trial-status`.

## Pitfalls

- Older `app-session-cache` entries may still contain `trialInfo` or `profile.tenant`. Restoring them into `tenantTrialInfo` reopens the hole.
- `auth-restore.client.ts` used to return early on a valid Supabase session and skip the server trial refresh, leaving cached `is_trial` in place. It must still refresh server trial status for logged-in tenants.
- Middleware `trial.global.ts`: if `tenantTrialAuthority !== 'server'`, it `await`s `loadTenantTrialInfo()`. After that await, `wait` is treated like failure and navigates to `/upgrade`.
- `composables/useTrialFeatures.ts` still reads trial fields for UI chrome; it is not the access-control gate.
- Existing `docs/SESSION_PERSISTENCE.md` covers HMR/cache identity only; this runbook owns authorization.

## Codepaths

| Symbol / path | Role |
|---|---|
| `utils/trial-gate.ts` — `decideTrialGate`, `resolveServerTrialAuthority` | Gate contract |
| `utils/session-persistence.ts` — `stripCachedSubscriptionProfile`, `sessionRestorePlan`, `buildPersistentSession` | Cache write/restore hygiene |
| `middleware/trial.global.ts` | Client navigation enforcement |
| `stores/auth.ts` — `tenantTrialAuthority`, `loadTenantTrialInfo`, `applyServerTenantTrial` | In-memory server authority |
| `plugins/00-session-persist.client.ts`, `01-session-auto-save.client.ts`, `auth-restore.client.ts` | Restore/save without trial entitlement |
| `server/api/tenants/trial-status.get.ts` | Server snapshot |
| `utils/__tests__/trial-gate.test.ts` | Stale-cache / fail-closed coverage |

## Related (do not conflate)

- Open draft **#196** (`PUBLIC_REGISTER_CLIENT_ROLE` / staff invite) — registration role minting, not trial gating.
- Open draft **#339** / code **#338** welcome/onboarding authz — email/reminder authorization, not subscription gate.
- `docs/SESSION_PERSISTENCE.md` — session identity cache UX.
