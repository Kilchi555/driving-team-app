/**
 * Website entitlement evidence reconciliation (PR-2).
 *
 * Pure, deterministic mapping from *observations* to the evidence objects
 * consumed by {@link decideWebsiteLiveEntitlement}.
 *
 * Trust model:
 * - Local `website_setup_paid_at` / `website_hosting_plan` are caches only.
 * - Stripe-shaped observations (checkout payment_status, subscription status,
 *   refunds, disputes) may support confirmed states when tenant ownership matches.
 * - Missing Stripe observations → `unknown` / UNVERIFIED path — never invent payment.
 * - This module does not call Stripe, the DB, or env. Callers supply observations.
 *
 * Enforcement is NOT activated here. Publish routes must keep using
 * `websitePublishBlockedReason` until a later authorized PR wires the gate.
 *
 * Care semantics: `host` and `care` remain alternative plans (existing model).
 * Additive Care is unresolved and must not be guessed.
 */

import {
  decideWebsiteLiveEntitlement,
  isWebsiteHostingPlan,
  type WebsiteHostingEvidence,
  type WebsiteHostingPlan,
  type WebsiteLiveEntitlementDecision,
  type WebsiteLiveEntitlementInput,
  type WebsiteSetupEvidence,
} from './website-billing'

export const WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED = false as const

export type WebsiteRefundObservation = {
  status: string
}

export type WebsiteDisputeObservation = {
  /** Stripe dispute status, e.g. needs_response, under_review, won, lost, warning_closed */
  status: string
}

export type WebsiteSetupCheckoutObservation = {
  payment_status: string
  /** Must be `website` for this observation to count as website setup evidence. */
  metadata_product?: string | null
  metadata_tenant_id?: string | null
  /**
   * Must be the boolean `true` to confirm setup was in scope.
   * Missing / null / false / other values never confirm setup payment.
   */
  include_setup?: boolean | null
}

export type WebsiteHostingSubscriptionObservation = {
  status: string
  /**
   * Must be exactly `website` (established product metadata rule).
   * Missing / empty / unknown → not valid website hosting evidence.
   */
  metadata_product?: string | null
  metadata_tenant_id?: string | null
  /**
   * Plan already resolved by the caller from price IDs or metadata.
   * Do not pass env-derived guesses from this pure module.
   */
  hosting_plan?: string | null
}

export type WebsiteEntitlementLocalCache = {
  website_only?: boolean | null
  website_setup_paid_at?: string | null
  website_hosting_plan?: string | null
  saas_subscription_active?: boolean | null
  saas_subscription_plan?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
}

/**
 * Bundle of observations for one tenant entitlement evaluation.
 * All Stripe fields are optional; absence means unverified, not unpaid.
 */
export type WebsiteEntitlementObservations = {
  /** Tenant under evaluation — required for ownership checks. */
  expected_tenant_id: string
  local?: WebsiteEntitlementLocalCache | null
  /** Tenant row currently bound to the Stripe customer, if known. */
  stripe_customer_bound_tenant_id?: string | null
  setup_checkout?: WebsiteSetupCheckoutObservation | null
  hosting_subscription?: WebsiteHostingSubscriptionObservation | null
  refunds?: WebsiteRefundObservation[] | null
  disputes?: WebsiteDisputeObservation[] | null
  manual_review_required?: boolean | null
  /**
   * Idempotent webhook replay: when the current event id was already processed,
   * callers may still re-evaluate from observations; this flag does not grant
   * entitlement by itself.
   */
  webhook_event_id?: string | null
  previously_processed_event_ids?: string[] | null
}

export type WebsiteOwnershipVerdict = 'matched' | 'unverified' | 'conflict'

export type WebsiteEntitlementReconcileResult = {
  ownership: WebsiteOwnershipVerdict
  setup_evidence: WebsiteSetupEvidence
  hosting_evidence: WebsiteHostingEvidence
  input: WebsiteLiveEntitlementInput
  decision: WebsiteLiveEntitlementDecision
  /** True when webhook_event_id is in previously_processed_event_ids. */
  replayed_event: boolean
  /** Always false in this PR — publish routes are not wired. */
  enforcement_wired: typeof WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED
}

function normalizeId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

/**
 * Tenant isolation check for Stripe-shaped metadata / customer binding.
 * Conflict never grants entitlement.
 */
export function evaluateWebsiteEvidenceOwnership(opts: {
  expected_tenant_id: string
  metadata_tenant_id?: string | null
  stripe_customer_bound_tenant_id?: string | null
}): WebsiteOwnershipVerdict {
  const expected = normalizeId(opts.expected_tenant_id)
  if (!expected) return 'conflict'

  const meta = normalizeId(opts.metadata_tenant_id)
  const bound = normalizeId(opts.stripe_customer_bound_tenant_id)

  if (meta && meta !== expected) return 'conflict'
  if (bound && bound !== expected) return 'conflict'
  if (!meta && !bound) return 'unverified'
  return 'matched'
}

function hasSucceededRefund(refunds: WebsiteRefundObservation[] | null | undefined): boolean {
  if (!Array.isArray(refunds) || refunds.length === 0) return false
  return refunds.some((r) => {
    const s = String(r?.status || '').toLowerCase()
    return s === 'succeeded' || s === 'paid'
  })
}

function classifyDispute(
  disputes: WebsiteDisputeObservation[] | null | undefined,
): 'none' | 'open' | 'lost' | 'won' {
  if (!Array.isArray(disputes) || disputes.length === 0) return 'none'
  let sawOpen = false
  let sawWon = false
  for (const d of disputes) {
    const s = String(d?.status || '').toLowerCase()
    if (s === 'lost') return 'lost'
    if (s === 'won' || s === 'warning_closed') {
      sawWon = true
      continue
    }
    if (
      s === 'needs_response'
      || s === 'under_review'
      || s === 'warning_needs_response'
      || s === 'warning_under_review'
      || s === 'charge_refunded'
    ) {
      sawOpen = true
    }
  }
  if (sawOpen) return 'open'
  if (sawWon) return 'won'
  // Unknown dispute status → treat as open/review rather than ignore
  return 'open'
}

function isWebsiteProduct(product: string | null | undefined): boolean {
  return product === 'website'
}

/**
 * Map setup observations → WebsiteSetupEvidence.
 * Local timestamps never produce confirmed_paid by themselves.
 */
export function reconcileWebsiteSetupEvidence(
  obs: WebsiteEntitlementObservations,
): WebsiteSetupEvidence {
  if (!obs || typeof obs !== 'object' || !normalizeId(obs.expected_tenant_id)) {
    return { state: 'malformed' }
  }

  const ownership = evaluateWebsiteEvidenceOwnership({
    expected_tenant_id: obs.expected_tenant_id,
    metadata_tenant_id: obs.setup_checkout?.metadata_tenant_id,
    stripe_customer_bound_tenant_id: obs.stripe_customer_bound_tenant_id,
  })
  if (ownership === 'conflict') return { state: 'conflicting' }

  if (hasSucceededRefund(obs.refunds)) return { state: 'refunded' }

  const dispute = classifyDispute(obs.disputes)
  if (dispute === 'lost') return { state: 'chargeback' }
  if (dispute === 'open') return { state: 'disputed' }

  const checkout = obs.setup_checkout
  const localPaidAt = obs.local?.website_setup_paid_at ?? null

  if (checkout && typeof checkout === 'object' && checkout.payment_status != null) {
    if (!isWebsiteProduct(checkout.metadata_product ?? null)) {
      // Non-website checkout must not confirm website setup.
      if (localPaidAt) return { state: 'conflicting' }
      return { state: 'unknown' }
    }
    if (ownership !== 'matched') {
      // Stripe observation present but ownership not established → incomplete.
      return { state: 'unknown' }
    }

    // Fail-closed: only an explicit boolean true confirms setup was in scope.
    // Missing, null, false, or non-boolean values never confirm setup payment.
    const includeSetup = checkout.include_setup === true
    const paymentStatus = String(checkout.payment_status).toLowerCase()

    if (paymentStatus === 'paid') {
      if (!includeSetup) {
        // Hosting-only / ambiguous checkout does not prove setup payment.
        return { state: 'unknown' }
      }
      return { state: 'confirmed_paid', paidAt: localPaidAt }
    }

    if (paymentStatus === 'no_payment_required') {
      // CHF 490 setup is never treated as paid from a $0 / no_payment_required
      // status without a separate, explicitly authorized product rule (none today).
      return { state: 'unknown' }
    }

    if (paymentStatus === 'unpaid') {
      if (localPaidAt) return { state: 'conflicting' }
      // Unpaid is authoritative non-payment only when setup was explicitly in scope.
      if (!includeSetup) return { state: 'unknown' }
      return { state: 'confirmed_unpaid' }
    }

    // Unexpected payment_status
    return { state: 'malformed' }
  }

  // No Stripe setup observation: local cache is insufficient.
  void localPaidAt
  return { state: 'unknown' }
}

/**
 * Map hosting observations → WebsiteHostingEvidence.
 * Local plan fields never produce `active` by themselves.
 */
export function reconcileWebsiteHostingEvidence(
  obs: WebsiteEntitlementObservations,
): WebsiteHostingEvidence {
  if (!obs || typeof obs !== 'object' || !normalizeId(obs.expected_tenant_id)) {
    return { state: 'malformed' }
  }

  const ownership = evaluateWebsiteEvidenceOwnership({
    expected_tenant_id: obs.expected_tenant_id,
    metadata_tenant_id: obs.hosting_subscription?.metadata_tenant_id,
    stripe_customer_bound_tenant_id: obs.stripe_customer_bound_tenant_id,
  })
  if (ownership === 'conflict') return { state: 'conflicting' }

  if (hasSucceededRefund(obs.refunds) && obs.hosting_subscription) {
    // Succeeded refunds against an observed hosting charge → review, not active.
    return { state: 'refunded' }
  }

  const dispute = classifyDispute(obs.disputes)
  if (dispute === 'lost' && obs.hosting_subscription) return { state: 'chargeback' }
  if (dispute === 'open' && obs.hosting_subscription) return { state: 'disputed' }

  const sub = obs.hosting_subscription
  const localPlan = obs.local?.website_hosting_plan ?? null

  if (sub && typeof sub === 'object' && sub.status != null) {
    // Fail-closed product identity: only the established checkout/webhook rule
    // `metadata.product === 'website'` qualifies. Missing, empty, or unknown
    // values are not active website hosting. This pure module does not invent
    // price-ID or Stripe product-ID lookups (caller must resolve those first).
    if (!isWebsiteProduct(sub.metadata_product ?? null)) {
      const raw = sub.metadata_product
      const explicitOther =
        raw != null && String(raw).trim() !== '' && !isWebsiteProduct(raw)
      if (explicitOther && localPlan) return { state: 'conflicting' }
      return { state: 'unknown' }
    }
    if (ownership !== 'matched') {
      return { state: 'unknown' }
    }

    const status = String(sub.status).toLowerCase()
    const planRaw = sub.hosting_plan ?? null

    if (status === 'canceled' || status === 'incomplete_expired') {
      return { state: 'canceled' }
    }
    if (status === 'unpaid' || status === 'past_due' || status === 'incomplete' || status === 'paused') {
      return { state: 'inactive' }
    }
    if (status === 'active') {
      if (planRaw == null || planRaw === '') {
        return { state: 'malformed' }
      }
      if (!isWebsiteHostingPlan(planRaw)) {
        return { state: 'unknown_plan', plan: String(planRaw) }
      }
      return { state: 'active', plan: planRaw as WebsiteHostingPlan }
    }
    if (status === 'trialing') {
      // Website hosting trial / preview clock is an unresolved product decision.
      // Do not invent entitlement from trialing.
      return { state: 'conflicting' }
    }
    // Unknown Stripe subscription status
    return { state: 'malformed' }
  }

  // No Stripe hosting observation: local plan cache is insufficient.
  if (localPlan != null && localPlan !== '' && !isWebsiteHostingPlan(localPlan)) {
    return { state: 'unknown_plan', plan: String(localPlan) }
  }
  void localPlan
  return { state: 'unknown' }
}

/**
 * Build entitlement input + decision from observations.
 * Side-effect free. Does not enforce publication.
 */
export function reconcileWebsiteLiveEntitlement(
  obs: WebsiteEntitlementObservations,
): WebsiteEntitlementReconcileResult {
  const replayed_event = Boolean(
    obs?.webhook_event_id
    && Array.isArray(obs.previously_processed_event_ids)
    && obs.previously_processed_event_ids.includes(obs.webhook_event_id),
  )

  const ownershipSetup = evaluateWebsiteEvidenceOwnership({
    expected_tenant_id: obs?.expected_tenant_id || '',
    metadata_tenant_id: obs?.setup_checkout?.metadata_tenant_id,
    stripe_customer_bound_tenant_id: obs?.stripe_customer_bound_tenant_id,
  })
  const ownershipHost = evaluateWebsiteEvidenceOwnership({
    expected_tenant_id: obs?.expected_tenant_id || '',
    metadata_tenant_id: obs?.hosting_subscription?.metadata_tenant_id,
    stripe_customer_bound_tenant_id: obs?.stripe_customer_bound_tenant_id,
  })
  const ownership: WebsiteOwnershipVerdict =
    ownershipSetup === 'conflict' || ownershipHost === 'conflict'
      ? 'conflict'
      : ownershipSetup === 'matched' || ownershipHost === 'matched'
        ? 'matched'
        : 'unverified'

  const setup_evidence = reconcileWebsiteSetupEvidence(obs)
  const hosting_evidence = reconcileWebsiteHostingEvidence(obs)

  const input: WebsiteLiveEntitlementInput = {
    website_only: obs?.local?.website_only ?? null,
    website_setup_paid_at: obs?.local?.website_setup_paid_at ?? null,
    website_hosting_plan: obs?.local?.website_hosting_plan ?? null,
    saas_subscription_active: obs?.local?.saas_subscription_active ?? null,
    saas_subscription_plan: obs?.local?.saas_subscription_plan ?? null,
    setup_evidence,
    hosting_evidence,
    manual_review_required: obs?.manual_review_required ?? null,
  }

  const decision = decideWebsiteLiveEntitlement(input)

  return {
    ownership,
    setup_evidence,
    hosting_evidence,
    input,
    decision,
    replayed_event,
    enforcement_wired: WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED,
  }
}
