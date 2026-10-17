# Remove Additional Wallee Stripe Trial — Draft PR Handoff

**Status:** Draft PR opened. **Not** merged. **No** production mutations, migrations, or deployments.

| Field | Value |
|-------|-------|
| Observed at (UTC) | `2026-10-17T14:33:08Z` |
| Branch | `cursor/remove-wallee-stripe-trial-9780` |
| Implementation commit | `44210dbe3ff2621e4ec3773bd2e395bcd0c81d55` |
| Tip (includes this handoff) | `33b649d9d714fe271e8ab29aadc19a92748af10e` (advances with docs-only commits) |
| Base | `main` (`0ec08fab…` at branch creation) |
| Draft PR | [#472](https://github.com/Kilchi555/driving-team-app/pull/472) |

---

## Behavior removed

- Checkout no longer sets `subscription_data.trial_period_days: 30` when Wallee is selected and inactive.
- Checkout no longer shows custom text promising free SaaS until Wallee is active.

## Behavior preserved

- Registration trial via `SAAS_TRIAL_DAYS` (30) unchanged.
- `with_wallee` metadata and `wallee_setup=1` success URL preserved.
- `wallee-activate` still ends **legacy** Stripe `trialing` with `trial_end: 'now'`.
- Webhook still upserts legacy trialing + `wallee_trial_started_at`.
- No Stripe API calls to modify existing subscriptions.
- No DB migrations; no production tenant/Stripe/Wallee mutations.

## Files changed

- `server/api/stripe/create-checkout-session.post.ts`
- `server/api/stripe/webhook.post.ts` (welcome email copy)
- `server/api/cron/send-wallee-reminders.get.ts` (reminders; legacy note only)
- `pages/upgrade.vue`, `pages/payment/success.vue`
- `components/admin/WalleeOnboardingWidget.vue`
- `utils/saas-trial.ts`, `apps/simy/utils/saas-trial.ts`
- `server/utils/__tests__/create-checkout-session-wallee-trial.http.test.ts`
- Gate + prior plan audits under `artifacts/audits/`

## Frontend / email copy

German copy updated so Wallee setup does **not** promise an extra free SaaS period; SaaS billing follows plan/contract period independently.

Reminders for tenants with `wallee_trial_started_at` may still mention a **legacy** Stripe probezeitraum ending independently — not a new grace grant.

## Tests executed

```text
npx vitest run create-checkout-session-wallee-trial.http.test.ts
  + tenant-subscription-write-access + assert-tenant-subscription-writable
→ 32 passed, exit 0

npm run lint  # eslint server/utils/__tests__/**/*.ts
→ exit 0
```

**Not executed:** full `npm test`, Playwright/E2E, live Stripe test-mode Checkout against Stripe API, typecheck suite (no project-wide typecheck claimed), production verification.

## Stripe test-mode findings

Unit mocks only: Checkout session params asserted without calling live Stripe. Incomplete/active/trialing **live** outcomes **not** verified in Stripe test mode in this run.

## Existing tenants follow-up (human decision)

Default for this PR: **soft drain** — do not end existing `trialing` + `with_wallee` subscriptions. Separate task if product wants hard `trial_end: now`.

## Remaining risks

- Customers who expected free billing until Wallee live will be charged per plan sooner after this ships — copy updated to set expectation.
- Reminder cron still keyed off `wallee_trial_started_at` (legacy cohort); new Checkouts may not set that field (only when webhook sees trialing+with_wallee).
- Live Checkout collection behavior without trial should be smoke-tested in Stripe test mode before undraft/merge.

## Next human actions

1. Review draft PR.  
2. Optional: Stripe test-mode Checkout with Wallee on/off.  
3. Decide soft vs hard for in-flight legacy trials.  
4. Undraft / merge only after required CI green (human).
