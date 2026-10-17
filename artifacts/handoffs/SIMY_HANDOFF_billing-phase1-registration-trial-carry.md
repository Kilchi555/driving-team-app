# SIMY Billing Phase 1 — Draft PR Handoff

**Verdict: CONDITIONAL** (ready for human draft-PR review; not production-ready solely from unit tests)

**Date:** 2026-10-17  
**Draft PR:** https://github.com/Kilchi555/driving-team-app/pull/472  
**Branch:** `cursor/remove-wallee-stripe-trial-9780`

---

## Exact SHAs (verified this run)

| Ref | SHA |
|-----|-----|
| `origin/main` | `0ec08fababd8e8ef1b9251fa74d0ef388c7e3300` |
| PR #472 base (`main`) | `0ec08fababd8e8ef1b9251fa74d0ef388c7e3300` |
| PR #472 head (pre-Phase-1 commits on branch) | `30e1c4443bc5e50bf3f311c2ca41b25695ff5e24` |
| Phase 1 commit (current head) | `8449681d3e8b82bb914f00223470b198a3978e18` |

PR #472 was retained as the draft vehicle (already scoped to Wallee/Stripe trial removal). Phase 1 extends that draft rather than opening a successor.

---

## What Phase 1 implements

1. **Registration-trial carry-through** — when `is_trial === true` and `tenants.trial_ends_at` is a valid future timestamp (≥ Stripe 48h minimum), Checkout sets absolute `subscription_data.trial_end` (same with/without Wallee). Metadata: `trial_source=registration_carry`.
2. **Expired trial** — no Stripe trial; `trial_source=none`.
3. **Invalid / missing / too-soon trial end** — actionable 400; no silent invent/extend.
4. **Client-supplied trial dates ignored** — only server tenant row is used.
5. **Legacy soft-drain** — Wallee activate never calls `trial_end: 'now'`; webhook sync does not rewrite Stripe trial ends.
6. **Wallee welcome** — fires for `trialing` **or** `active` when `with_wallee=true`.
7. **Reminder stamp** — `wallee_trial_started_at` set once on with_wallee Checkout (not only legacy trialing).
8. **Internal Wallee-upgrade ops email** — idempotent on subscription id via `tenant_settings.last_wallee_upgrade_ops_email_sub_id`.
9. **Checkout success copy** — does not claim verified payment success.

**Out of scope (explicit):** payment-failure write lock — see follow-up section below.

---

## Files changed and why

| File | Reason |
|------|--------|
| `server/utils/registration-trial-checkout.ts` | Pure decision helper: carry / expire / reject / activate policy / ops-email idempotency |
| `server/api/stripe/create-checkout-session.post.ts` | Load `is_trial`/`trial_ends_at`; set absolute `trial_end` + metadata; map Stripe trial_end rejects |
| `server/api/admin/wallee-activate.post.ts` | Preserve Stripe trials on activate (no early end) |
| `server/api/stripe/webhook.post.ts` | Welcome for trialing\|active; stamp onboarding start once; idempotent ops email |
| `server/api/cron/send-wallee-reminders.get.ts` | Comment alignment with new stamp source |
| `server/api/stripe/sync-subscription.post.ts` | Document: session complete ≠ payment verified |
| `pages/payment/success.vue` | Accurate Checkout-completed messaging |
| `utils/saas-trial.ts` | Doc: carry-through + soft-drain policy |
| `server/utils/__tests__/registration-trial-checkout.test.ts` | Unit tests for decision + idempotency + activate policy |
| `server/utils/__tests__/create-checkout-session-wallee-trial.http.test.ts` | HTTP mocks: with/without Wallee, expire, reject, client override, 409 path, source guards |
| `server/utils/__tests__/wallee-activate-trial-preserve.http.test.ts` | Activate must not call `trial_end: now` for legacy or carry |

---

## Legacy vs new trial behavior

| Scenario | Behavior |
|----------|----------|
| New Checkout, `is_trial` + future `trial_ends_at` (≥48h) | Absolute Stripe `trial_end`; `trial_source=registration_carry` |
| New Checkout, Wallee selected | Same carry-through; **no** fixed 30-day Stripe trial; **no** complimentary SaaS for Wallee |
| New Checkout, registration trial expired | No Stripe trial; normal billing |
| New Checkout, missing/malformed/`trial_end` too soon | 400 with code; no invent/extend |
| Legacy Stripe trialing sub (no/`absent` `trial_source`) | Soft-drain: keep scheduled Stripe `trial_end` |
| Wallee activate on legacy trialing | **Do not** set `trial_end: now` |
| Wallee activate on `registration_carry` | **Do not** shorten/extend Stripe trial |
| Webhook subscription upsert | Does not mutate Stripe `trial_end`; stamps `wallee_trial_started_at` once if with_wallee |
| Ops email on webhook retry | Skipped when `tenant_settings` already stores same `sub.id` |

**Safe legacy fallback:** if metadata is absent or untrusted, treat as legacy and **never** shorten Stripe trial on activate. Do not bulk-normalize existing Stripe trial dates.

---

## Tests run

```text
npx vitest run \
  server/utils/__tests__/registration-trial-checkout.test.ts \
  server/utils/__tests__/create-checkout-session-wallee-trial.http.test.ts \
  server/utils/__tests__/wallee-activate-trial-preserve.http.test.ts
```

**Result:** 3 files, **21 passed**, 0 failed (2026-10-17).

### Requirement coverage map

| # | Requirement | Covered by |
|---|-------------|------------|
| 1 | Future trial + Wallee | HTTP: absolute `trial_end`, `with_wallee=true` |
| 2 | Future trial without Wallee | HTTP: parity absolute `trial_end` |
| 3 | Not reset to 30 days | HTTP: no `trial_period_days`; not ≈ now+30d |
| 4 | Expired → no Stripe trial | HTTP + unit |
| 5 | Missing/malformed blocks Checkout | HTTP + unit |
| 6 | Client trial dates ignored | HTTP body override ignored |
| 7 | Legacy trial unchanged in sync | Source: webhook upsert does not set Stripe `trial_end`; unit soft-drain policy |
| 8 | Activate does not shorten legacy | HTTP activate: `subscriptions.update` not called |
| 9 | Activate does not rewrite carry | HTTP activate with `registration_carry` |
| 10 | Webhook retry no duplicate ops email | Unit: `shouldSendWalleeUpgradeOpsEmail` |
| 11 | Checkout ≠ verified payment | Source: success.vue + sync-subscription comments |
| 12 | Unrelated upgrade path | HTTP: existing sub → 409 |

### Not run

- Full repo `npm test` / E2E login / Dependency review CI (will run on push).
- Live Stripe or Wallee API mutation (**not authorized**).
- Production email send (**not authorized**).
- Full webhook HTTP handler integration (ops email covered via extracted helper + source wiring).

---

## Stripe / Wallee assumptions still needing human verification

1. Stripe still enforces **≥ ~48 hours** for Checkout `trial_end` (documented minimum used in code). Confirm against current Stripe API docs / dashboard behavior.
2. `tenant_settings` unique constraint on `(tenant_id, setting_key)` for ops-email upsert (`onConflict: 'tenant_id,setting_key'`) — confirm matches live schema.
3. Historical legacy Wallee Stripe trials may lack `trial_source`; soft-drain assumes absence ⇒ preserve (binding decision). Spot-check a few production subscription IDs in Stripe Dashboard (read-only) before merge.
4. Welcome/ops emails fire on `checkout.session.completed` for `trialing|active` — confirm no duplicate welcome from other paths for the same upgrade.
5. Reminder cron still keys off `wallee_trial_started_at`; new active (non-trialing) Checkouts now receive the stamp — confirm reminder copy remains accurate for non-trialing tenants.

---

## Production safety confirmation

- **No** production database writes
- **No** production migrations applied
- **No** Stripe subscription trial dates bulk-updated
- **No** live emails sent to customers or internal recipients
- **No** merge to `main`, **no** deploy
- Draft PR status preserved

---

## Remaining risks / blockers

1. **CI not yet green on this Phase 1 commit** — human merge waits for required checks (Test and lint, E2E login, Dependency review).
2. **Ops email is new behavior** — first real send happens after production webhook traffic; ensure Resend/`info@simy.ch` is intended.
3. **Short remaining trials (<48h)** reject Checkout — support process needed (not silent extend).
4. **Payment-failure write lock** still open — Phase 1 does **not** fix overdue payment write access.
5. Impact Analysis: change touches billing/webhooks → elevated risk; treat as **CRITICAL** for human merge gates even though Phase 1 scope is bounded.

---

## Follow-up specification: payment-failure write lock

**Separate draft PR — do not merge into Phase 1.**

### Goal

A verified failed or overdue payment must block protected tenant **writes** even when `current_period_end` is still in the future. Pending Checkout must not grant paid access without verification. Restore access only on a verified, correctly matched successful payment event (or an explicitly documented authorization rule).

### Requirements

1. Inventory every tenant mutation endpoint; identify which already use the centralized SaaS write-access guard (PR-A / #470).
2. Extend the guard so verified `past_due` / failed payment state denies writes (not only expired `current_period_end`).
3. Pending / unverified Checkout session must not unlock paid writes.
4. Handle duplicate and out-of-order Stripe webhooks safely (idempotent state machine).
5. Preserve explicitly permitted read-only access and documented exceptions.
6. Tests: failure lock, pending Checkout, recovery on verified payment, stale webhook, and **legacy trial preservation** interaction.

### Non-goals for that follow-up

- Bulk Stripe trial date changes
- Phase 1 trial carry-through rewrites

---

## Final verdict

**CONDITIONAL** — Phase 1 code and automated unit/HTTP tests pass locally; draft PR is the correct review gate. Human must confirm CI, Stripe 48h constraint, `tenant_settings` conflict target, and ops-email recipient before Ready-to-Ship. **Do not merge or deploy from this agent run.**
