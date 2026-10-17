/**
 * SaaS free-trial length advertised on simy.ch.
 * Keep in sync with root `utils/saas-trial.ts` (main app registration).
 * Not a Wallee Checkout Stripe trial — paid-plan Checkout must not add one.
 */
export const SAAS_TRIAL_DAYS = 30
export const SAAS_TRIAL_LABEL = `${SAAS_TRIAL_DAYS} Tage`
