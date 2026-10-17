export const WEBSITE_SETUP_CHF = 490
/** Simy SaaS Starter — live calendar / booking. Not included in website-only. */
export const SIMY_STARTER_CHF = 49

export const WEBSITE_PRICE_ENV = {
  setup: 'STRIPE_PRICE_WEBSITE_SETUP',
  host: 'STRIPE_PRICE_WEBSITE_HOST',
  care: 'STRIPE_PRICE_WEBSITE_CARE',
} as const

export const WEBSITE_HOSTING_PLANS = ['host', 'care'] as const
export type WebsiteHostingPlan = (typeof WEBSITE_HOSTING_PLANS)[number]

export const WEBSITE_HOSTING_META: Record<WebsiteHostingPlan, { label: string; chf: number; envKey: string }> = {
  host: { label: 'Hosting', chf: 19, envKey: WEBSITE_PRICE_ENV.host },
  care: { label: 'Care', chf: 49, envKey: WEBSITE_PRICE_ENV.care },
}

export function isWebsiteHostingPlan(plan: string | null | undefined): plan is WebsiteHostingPlan {
  return plan === 'host' || plan === 'care'
}

export function websiteSubscriptionPlanId(hosting: WebsiteHostingPlan): 'website_host' | 'website_care' {
  return hosting === 'care' ? 'website_care' : 'website_host'
}

export type WebsiteBillingInfo = {
  website_only?: boolean | null
  website_hosting_plan?: string | null
  website_setup_paid_at?: string | null
  trial_ends_at?: string | null
}

export function isWebsiteHostingLocked(info: WebsiteBillingInfo | null | undefined): boolean {
  if (!info?.website_only) return false
  if (isWebsiteHostingPlan(info.website_hosting_plan)) return false
  if (!info.trial_ends_at) return false
  return Date.now() > new Date(info.trial_ends_at).getTime()
}

export function isWebsiteSetupPaid(info: WebsiteBillingInfo | null | undefined): boolean {
  return !!info?.website_setup_paid_at
}

/**
 * Legacy publish gate used by existing callers.
 *
 * IMPORTANT (PR-1 / enforcement deferred):
 * This adapter intentionally preserves pre-PR-1 behaviour so production
 * publication routes do not change. SaaS tenants (`website_only` falsy) are
 * still not blocked here. The policy-correct decision lives in
 * {@link decideWebsiteLiveEntitlement} and must be wired in a later PR.
 */
export function websitePublishBlockedReason(
  tenant: WebsiteBillingInfo | null | undefined,
): 'hosting' | 'setup' | null {
  if (!tenant?.website_only) return null
  if (!tenant.website_setup_paid_at) return 'setup'
  if (!isWebsiteHostingPlan(tenant.website_hosting_plan)) return 'hosting'
  return null
}

export function websitePublishBlockedMessage(reason: 'hosting' | 'setup'): string {
  return reason === 'hosting'
    ? 'Hosting-Abo erforderlich, bevor die Website live geht.'
    : 'Die einmalige Website-Gebühr ist fällig, bevor die Homepage live geht.'
}

/** When hosting is locked, only billing + profile stay open. */
export function isWebsiteLockedAllowedAdminPath(path: string): boolean {
  const p = path.split('?')[0] || path
  return p === '/admin/billing' || p.startsWith('/admin/billing/')
    || p === '/admin/profile' || p.startsWith('/admin/profile/')
}

// ── Central live-entitlement decision (PR-1: logic + tests only) ─────────────

/**
 * Policy-correct live entitlement statuses.
 * Callers must not treat local null fields as definitive non-payment.
 */
export const WEBSITE_LIVE_ENTITLEMENT_STATUSES = [
  'ENTITLED',
  'PAYMENT_REQUIRED',
  'UNVERIFIED',
  'MANUAL_REVIEW',
] as const
export type WebsiteLiveEntitlementStatus = (typeof WEBSITE_LIVE_ENTITLEMENT_STATUSES)[number]

export type WebsiteLiveEntitlementReasonCode =
  | 'setup_and_hosting_confirmed'
  | 'saas_subscription_not_website_entitlement'
  | 'setup_payment_required'
  | 'hosting_plan_required'
  | 'setup_unverified'
  | 'hosting_unverified'
  | 'hosting_inactive'
  | 'unknown_hosting_plan'
  | 'setup_refunded_or_disputed'
  | 'hosting_refunded_or_disputed'
  | 'conflicting_evidence'
  | 'malformed_evidence'
  | 'manual_review_required'
  | 'insufficient_evidence'

/**
 * Authoritative setup-payment evidence supplied by a reconciler (not invented here).
 * Local `website_setup_paid_at` alone is never sufficient for ENTITLED.
 */
export type WebsiteSetupEvidence =
  | { state: 'unknown' }
  | { state: 'confirmed_paid'; paidAt?: string | null }
  | { state: 'confirmed_unpaid' }
  | { state: 'refunded' }
  | { state: 'chargeback' }
  | { state: 'disputed' }
  | { state: 'conflicting' }
  | { state: 'malformed' }

/**
 * Authoritative hosting/Care evidence.
 *
 * Assumption (existing product model, unchanged commercially in this PR):
 * `host` and `care` are alternative values of `website_hosting_plan`.
 * Care replaces Host rather than stacking on top of it. If product later
 * defines Care as additive, callers must pass an explicit review state
 * instead of guessing.
 */
export type WebsiteHostingEvidence =
  | { state: 'unknown' }
  | { state: 'active'; plan: WebsiteHostingPlan }
  | { state: 'inactive' }
  | { state: 'canceled' }
  | { state: 'expired' }
  | { state: 'unknown_plan'; plan: string }
  | { state: 'refunded' }
  | { state: 'chargeback' }
  | { state: 'disputed' }
  | { state: 'conflicting' }
  | { state: 'malformed' }

export type WebsiteLiveEntitlementInput = {
  /** Must never exempt a tenant from website entitlement. */
  website_only?: boolean | null
  /** Local cache only — insufficient alone for ENTITLED. */
  website_setup_paid_at?: string | null
  /** Local cache only — insufficient alone for ENTITLED. */
  website_hosting_plan?: string | null
  /** SaaS plan indicators — never yield ENTITLED by themselves. */
  saas_subscription_active?: boolean | null
  saas_subscription_plan?: string | null
  setup_evidence?: WebsiteSetupEvidence | null
  hosting_evidence?: WebsiteHostingEvidence | null
  /** Ops/product explicit review flag. */
  manual_review_required?: boolean | null
}

export type WebsiteLiveEntitlementDecision = {
  status: WebsiteLiveEntitlementStatus
  reasons: WebsiteLiveEntitlementReasonCode[]
  setup: 'confirmed' | 'unpaid' | 'unverified' | 'review'
  hosting: 'confirmed' | 'unpaid' | 'unverified' | 'review'
  /** True only when status === ENTITLED. */
  mayPublishLive: boolean
}

type ComponentOutcome = 'confirmed' | 'unpaid' | 'unverified' | 'review'

function normalizeSetupEvidence(
  evidence: WebsiteSetupEvidence | null | undefined,
): WebsiteSetupEvidence {
  if (!evidence || typeof evidence !== 'object' || !('state' in evidence)) {
    return { state: 'unknown' }
  }
  return evidence
}

function normalizeHostingEvidence(
  evidence: WebsiteHostingEvidence | null | undefined,
): WebsiteHostingEvidence {
  if (!evidence || typeof evidence !== 'object' || !('state' in evidence)) {
    return { state: 'unknown' }
  }
  return evidence
}

function evaluateSetup(evidence: WebsiteSetupEvidence): {
  outcome: ComponentOutcome
  reasons: WebsiteLiveEntitlementReasonCode[]
} {
  switch (evidence.state) {
    case 'confirmed_paid':
      return { outcome: 'confirmed', reasons: [] }
    case 'confirmed_unpaid':
      return { outcome: 'unpaid', reasons: ['setup_payment_required'] }
    case 'refunded':
    case 'chargeback':
    case 'disputed':
      return { outcome: 'review', reasons: ['setup_refunded_or_disputed'] }
    case 'conflicting':
      return { outcome: 'review', reasons: ['conflicting_evidence'] }
    case 'malformed':
      return { outcome: 'review', reasons: ['malformed_evidence'] }
    case 'unknown':
    default:
      return { outcome: 'unverified', reasons: ['setup_unverified'] }
  }
}

function evaluateHosting(evidence: WebsiteHostingEvidence): {
  outcome: ComponentOutcome
  reasons: WebsiteLiveEntitlementReasonCode[]
} {
  switch (evidence.state) {
    case 'active':
      if (!isWebsiteHostingPlan(evidence.plan)) {
        return { outcome: 'review', reasons: ['unknown_hosting_plan'] }
      }
      return { outcome: 'confirmed', reasons: [] }
    case 'inactive':
    case 'canceled':
    case 'expired':
      return { outcome: 'unpaid', reasons: ['hosting_inactive', 'hosting_plan_required'] }
    case 'unknown_plan':
      return { outcome: 'review', reasons: ['unknown_hosting_plan'] }
    case 'refunded':
    case 'chargeback':
    case 'disputed':
      return { outcome: 'review', reasons: ['hosting_refunded_or_disputed'] }
    case 'conflicting':
      return { outcome: 'review', reasons: ['conflicting_evidence'] }
    case 'malformed':
      return { outcome: 'review', reasons: ['malformed_evidence'] }
    case 'unknown':
    default:
      return { outcome: 'unverified', reasons: ['hosting_unverified'] }
  }
}

/**
 * Central, deterministic, side-effect-free live-website entitlement decision.
 *
 * Applies to all tenant types. Does not read env, network, DB, or Stripe.
 * Production publish routes must keep using {@link websitePublishBlockedReason}
 * until a later enforcement PR wires this decision explicitly.
 */
export function decideWebsiteLiveEntitlement(
  input: WebsiteLiveEntitlementInput | null | undefined,
): WebsiteLiveEntitlementDecision {
  const src = input && typeof input === 'object' ? input : {}
  const reasons: WebsiteLiveEntitlementReasonCode[] = []

  if (src.manual_review_required) {
    return {
      status: 'MANUAL_REVIEW',
      reasons: ['manual_review_required'],
      setup: 'review',
      hosting: 'review',
      mayPublishLive: false,
    }
  }

  const setupEval = evaluateSetup(normalizeSetupEvidence(src.setup_evidence))
  const hostingEval = evaluateHosting(normalizeHostingEvidence(src.hosting_evidence))
  reasons.push(...setupEval.reasons, ...hostingEval.reasons)

  // SaaS signals never grant live entitlement by themselves.
  const saasOnlyClaim =
    !!src.saas_subscription_active
    || (!!src.saas_subscription_plan && src.saas_subscription_plan !== 'trial')
  if (
    saasOnlyClaim
    && setupEval.outcome !== 'confirmed'
    && hostingEval.outcome !== 'confirmed'
  ) {
    reasons.push('saas_subscription_not_website_entitlement')
  }

  // website_only is intentionally unused for the decision (no exemption).
  void src.website_only
  // Local cache fields are never authoritative entitlement evidence.
  void src.website_setup_paid_at
  void src.website_hosting_plan

  if (setupEval.outcome === 'confirmed' && hostingEval.outcome === 'confirmed') {
    return {
      status: 'ENTITLED',
      reasons: ['setup_and_hosting_confirmed'],
      setup: 'confirmed',
      hosting: 'confirmed',
      mayPublishLive: true,
    }
  }

  if (setupEval.outcome === 'review' || hostingEval.outcome === 'review') {
    const unique = Array.from(new Set(reasons.length ? reasons : (['manual_review_required'] as WebsiteLiveEntitlementReasonCode[])))
    return {
      status: 'MANUAL_REVIEW',
      reasons: unique,
      setup: setupEval.outcome,
      hosting: hostingEval.outcome,
      mayPublishLive: false,
    }
  }

  // Authoritative unpaid on either component, and nothing unverified left → PAYMENT_REQUIRED.
  const anyUnpaid = setupEval.outcome === 'unpaid' || hostingEval.outcome === 'unpaid'
  const anyUnverified = setupEval.outcome === 'unverified' || hostingEval.outcome === 'unverified'

  if (anyUnpaid && !anyUnverified) {
    const unique = Array.from(new Set(reasons.length ? reasons : (['insufficient_evidence'] as WebsiteLiveEntitlementReasonCode[])))
    return {
      status: 'PAYMENT_REQUIRED',
      reasons: unique,
      setup: setupEval.outcome,
      hosting: hostingEval.outcome,
      mayPublishLive: false,
    }
  }

  // Missing/incomplete evidence (including local-null-only cases) → UNVERIFIED.
  const unique = Array.from(
    new Set(
      reasons.length
        ? reasons
        : (['insufficient_evidence'] as WebsiteLiveEntitlementReasonCode[]),
    ),
  )
  return {
    status: 'UNVERIFIED',
    reasons: unique,
    setup: setupEval.outcome,
    hosting: hostingEval.outcome,
    mayPublishLive: false,
  }
}
