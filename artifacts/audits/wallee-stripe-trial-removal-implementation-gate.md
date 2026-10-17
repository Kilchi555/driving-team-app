# Implementation Gate — Remove Wallee Checkout Stripe Trial

**Gate verdict: SAFE (approved narrow scope)**  
**Change risk: CRITICAL** (Stripe SaaS + Wallee onboarding copy; P0 hotspot 7)  
**Observed (UTC):** `2026-10-17T14:31:08Z`  
**Base:** `origin/main` @ `0ec08fab`

## Intent

Stop granting a **second** 30-day Stripe subscription trial when Checkout selects Wallee while Wallee is inactive. Keep registration `SAAS_TRIAL_DAYS`. Do not mutate existing Stripe subscriptions or production data.

## In scope

- Remove `subscription_data.trial_period_days: 30` and free-until-Wallee Checkout `custom_text` from `create-checkout-session.post.ts`
- Preserve `with_wallee` metadata and success URL `wallee_setup=1`
- German copy: `upgrade.vue`, `payment/success.vue`, `WalleeOnboardingWidget.vue`
- Welcome + reminder email wording; legacy trialing reminder may still reference Stripe trial days when present
- Keep `wallee-activate` early `trial_end: 'now'` for legacy
- Comment in `utils/saas-trial.ts`
- Automated Checkout param tests

## Out of scope / forbidden

- Ending or modifying existing Stripe trials
- Production SQL, migrations, deploy, merge
- Entitlement / write-gate policy changes
- Lesson-payment / credential handling changes
- Repurposing `trial_ends_at`

## Prior evidence

`artifacts/audits/wallee-extra-30-day-grace-removal-plan.md` — READY FOR IMPLEMENTATION.

## Test floor

Vitest covering Checkout with/without Wallee (no `trial_period_days`); SAAS_TRIAL_DAYS unchanged; lint on `server/utils/__tests__`.

## Residual

Existing `trialing` + `with_wallee` tenants: soft drain (no API mutation in this PR). Human follow-up decision required.
