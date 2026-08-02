/**
 * SaaS free-trial length for new Simy tenant registrations.
 * Marketing copy on simy.ch should match this number.
 *
 * Do NOT confuse with Stripe `trial_period_days` for Wallee onboarding
 * (billing pause after upgrade) — that is a separate product concept.
 */
export const SAAS_TRIAL_DAYS = 30

/** German label used in emails and UI, e.g. "30 Tage" */
export const SAAS_TRIAL_LABEL = `${SAAS_TRIAL_DAYS} Tage`
