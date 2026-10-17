/**
 * SaaS free-trial length for new Simy tenant registrations.
 * Marketing copy on simy.ch should match this number.
 *
 * This is the only complimentary SaaS period. Paid-plan Checkout must NOT
 * add Stripe `subscription_data.trial_period_days` for Wallee onboarding —
 * Wallee setup is independent of SaaS billing. Legacy Stripe trials created
 * under the former Wallee Checkout policy may still exist until they end
 * naturally or wallee-activate sets trial_end to now.
 */
export const SAAS_TRIAL_DAYS = 30

/** German label used in emails and UI, e.g. "30 Tage" */
export const SAAS_TRIAL_LABEL = `${SAAS_TRIAL_DAYS} Tage`
