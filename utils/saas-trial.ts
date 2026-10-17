/**
 * SaaS free-trial length for new Simy tenant registrations.
 * Marketing copy on simy.ch should match this number.
 *
 * Paid-plan Checkout carries remaining `tenants.trial_ends_at` as absolute
 * Stripe `subscription_data.trial_end` (same with/without Wallee). Never add
 * fixed `trial_period_days` for Wallee. Legacy Stripe trials from the former
 * Wallee Checkout policy keep their scheduled ends (soft-drain); activation
 * must not shorten them.
 */
export const SAAS_TRIAL_DAYS = 30

/** German label used in emails and UI, e.g. "30 Tage" */
export const SAAS_TRIAL_LABEL = `${SAAS_TRIAL_DAYS} Tage`
