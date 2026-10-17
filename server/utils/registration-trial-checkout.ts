/**
 * Registration-trial carry-through for SaaS Checkout.
 *
 * tenants.trial_ends_at is authoritative when is_trial === true.
 * Never invent or extend dates. Never trust client-supplied trial ends.
 *
 * Stripe Checkout / Subscriptions reject trial_end timestamps that are too
 * soon (documented minimum: 48 hours). Short remaining trials → actionable
 * 4xx, not silent extension.
 */

export const STRIPE_MIN_TRIAL_END_SECONDS = 48 * 60 * 60

export type RegistrationTrialSource = 'registration_carry' | 'none'

export type RegistrationTrialCheckoutDecision =
  | {
      kind: 'carry'
      trialEndUnix: number
      trialEndsAtIso: string
      trialSource: 'registration_carry'
    }
  | {
      kind: 'expired_no_trial'
      trialSource: 'none'
    }
  | {
      kind: 'not_registration_trial'
      trialSource: 'none'
    }
  | {
      kind: 'reject'
      code: 'trial_end_missing' | 'trial_end_invalid' | 'trial_end_too_soon_for_stripe'
      statusMessage: string
    }

export type RegistrationTrialTenantSnapshot = {
  is_trial: boolean | null | undefined
  trial_ends_at: string | null | undefined
}

/**
 * Pure decision for Checkout subscription_data.trial_end.
 * `now` is injectable for tests.
 */
export function decideRegistrationTrialForCheckout(
  tenant: RegistrationTrialTenantSnapshot | null | undefined,
  now: Date = new Date(),
): RegistrationTrialCheckoutDecision {
  if (!tenant || tenant.is_trial !== true) {
    return { kind: 'not_registration_trial', trialSource: 'none' }
  }

  const raw = tenant.trial_ends_at
  if (raw == null || String(raw).trim() === '') {
    return {
      kind: 'reject',
      code: 'trial_end_missing',
      statusMessage:
        'Dein Probezeitraum ist unvollständig hinterlegt. Bitte Support kontaktieren (Code: trial_end_missing), bevor du upgradest.',
    }
  }

  const endMs = Date.parse(String(raw))
  if (!Number.isFinite(endMs)) {
    return {
      kind: 'reject',
      code: 'trial_end_invalid',
      statusMessage:
        'Dein Probezeitraum-Ende ist ungültig. Bitte Support kontaktieren (Code: trial_end_invalid), bevor du upgradest.',
    }
  }

  const nowMs = now.getTime()
  if (nowMs >= endMs) {
    return { kind: 'expired_no_trial', trialSource: 'none' }
  }

  const trialEndUnix = Math.floor(endMs / 1000)
  const nowUnix = Math.floor(nowMs / 1000)
  if (trialEndUnix - nowUnix < STRIPE_MIN_TRIAL_END_SECONDS) {
    return {
      kind: 'reject',
      code: 'trial_end_too_soon_for_stripe',
      statusMessage:
        'Dein Probezeitraum endet zu bald für die automatische Übernahme zu Stripe (mindestens 48 Stunden erforderlich). Bitte Support kontaktieren (Code: trial_end_too_soon_for_stripe).',
    }
  }

  return {
    kind: 'carry',
    trialEndUnix,
    trialEndsAtIso: new Date(endMs).toISOString(),
    trialSource: 'registration_carry',
  }
}

/** Metadata value distinguishing new carry-through from legacy Wallee Stripe trials. */
export const TRIAL_SOURCE_META_KEY = 'trial_source'

export function isRegistrationCarryTrialSource(
  metadata: Record<string, string> | null | undefined,
): boolean {
  return metadata?.trial_source === 'registration_carry'
}

/**
 * Legacy soft-drain: historical trialing subs without trial_source=registration_carry
 * keep their Stripe trial_end. Do not end them early on Wallee activation.
 */
export function shouldEndStripeTrialOnWalleeActivate(
  metadata: Record<string, string> | null | undefined,
): boolean {
  // Phase 1 binding: never shorten scheduled Stripe trials on activate —
  // neither registration_carry nor legacy (absent/untrusted metadata).
  void metadata
  return false
}

/** tenant_settings key for idempotent internal Wallee-upgrade ops email. */
export const WALLEE_UPGRADE_OPS_EMAIL_SETTING_KEY = 'last_wallee_upgrade_ops_email_sub_id'

/**
 * Send internal Wallee-upgrade ops email once per Stripe subscription id.
 * Retries / duplicate checkout.session.completed must not resend.
 */
export function shouldSendWalleeUpgradeOpsEmail(
  storedSubId: string | null | undefined,
  currentSubId: string,
): boolean {
  if (!currentSubId) return false
  return storedSubId !== currentSubId
}
