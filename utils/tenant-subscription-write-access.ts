/**
 * Pure SaaS subscription write-access policy (PR-A).
 *
 * Aligns with decideTrialGate / trial-status field semantics for writable vs
 * blocked business mutations. Does NOT implement website publish entitlement.
 *
 * Expiry uses the same instant comparisons as decideTrialGate:
 * - Trial blocked when now > trial_ends_at
 * - Paid blocked when current_period_end is set and !(now < current_period_end)
 *   i.e. now >= current_period_end
 * - Paid plan with missing current_period_end remains writable (nav compatibility)
 * - website_only skips this SaaS write gate (same as nav bypass)
 * - No grace period
 */

export type TenantSubscriptionWriteSnapshot = {
  is_trial: boolean | null | undefined
  trial_ends_at?: string | null
  subscription_plan?: string | null
  current_period_end?: string | null
  website_only?: boolean | null
}

export const TENANT_SUBSCRIPTION_WRITE_REASON_CODES = [
  'writable',
  'website_only_bypass',
  'active_trial',
  'paid_active',
  'paid_period_missing_compat',
  'trial_expired',
  'paid_period_lapsed',
  'inconsistent_subscription_state',
  'missing_snapshot',
] as const

export type TenantSubscriptionWriteReasonCode =
  (typeof TENANT_SUBSCRIPTION_WRITE_REASON_CODES)[number]

export type TenantSubscriptionWriteDecision = {
  writable: boolean
  reasonCode: TenantSubscriptionWriteReasonCode
}

function isPaidPlan(plan: string | null | undefined): boolean {
  return !!plan && plan !== 'trial'
}

/**
 * Deterministic write-access evaluation for one clock instant.
 */
export function evaluateTenantSubscriptionWriteAccess(
  snapshot: TenantSubscriptionWriteSnapshot | null | undefined,
  now: Date,
): TenantSubscriptionWriteDecision {
  if (!snapshot || typeof snapshot !== 'object') {
    return { writable: false, reasonCode: 'missing_snapshot' }
  }

  if (snapshot.website_only === true) {
    return { writable: true, reasonCode: 'website_only_bypass' }
  }

  if (typeof snapshot.is_trial !== 'boolean') {
    return { writable: false, reasonCode: 'inconsistent_subscription_state' }
  }

  const plan = snapshot.subscription_plan ?? null

  // Paid plan path (matches decideTrialGate L52–55).
  if (!snapshot.is_trial && isPaidPlan(plan)) {
    if (!snapshot.current_period_end) {
      return { writable: true, reasonCode: 'paid_period_missing_compat' }
    }
    const periodEnd = new Date(snapshot.current_period_end)
    if (Number.isNaN(periodEnd.getTime())) {
      return { writable: false, reasonCode: 'inconsistent_subscription_state' }
    }
    if (now < periodEnd) {
      return { writable: true, reasonCode: 'paid_active' }
    }
    return { writable: false, reasonCode: 'paid_period_lapsed' }
  }

  // Trial path (matches decideTrialGate L58–66 for expiry instant).
  if (snapshot.is_trial) {
    if (!snapshot.trial_ends_at) {
      // Active trial with no end date — treat as writable (gate also allows).
      return { writable: true, reasonCode: 'active_trial' }
    }
    const trialEnd = new Date(snapshot.trial_ends_at)
    if (Number.isNaN(trialEnd.getTime())) {
      return { writable: false, reasonCode: 'inconsistent_subscription_state' }
    }
    if (now > trialEnd) {
      return { writable: false, reasonCode: 'trial_expired' }
    }
    return { writable: true, reasonCode: 'active_trial' }
  }

  // !is_trial but plan missing or 'trial' without a clear paid period.
  return { writable: false, reasonCode: 'inconsistent_subscription_state' }
}
