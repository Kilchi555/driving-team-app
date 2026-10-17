/**
 * Website live-entitlement enforcement preparation (PR-2).
 *
 * Provides a server-side entry point that:
 * 1. reconciles observations into evidence, then
 * 2. calls {@link decideWebsiteLiveEntitlement}.
 *
 * IMPORTANT — enforcement is intentionally NOT wired:
 * - `WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED === false`
 * - Publish / wizard / slots / checkout / public-read routes must keep using
 *   legacy `websitePublishBlockedReason` / `authorizePublicWebsiteRead`.
 * - Do not call {@link assertWebsiteLiveEntitlementOrThrow} from those routes
 *   until a later PR explicitly authorizes activation.
 *
 * This module performs no Stripe API calls, no DB writes, and no env reads.
 * Callers that fetch Stripe must do so separately and pass observations in.
 */

import {
  reconcileWebsiteLiveEntitlement,
  WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED,
  type WebsiteEntitlementObservations,
  type WebsiteEntitlementReconcileResult,
} from '~/utils/website-entitlement-reconcile'
import type { WebsiteLiveEntitlementDecision } from '~/utils/website-billing'

export { WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED }

/**
 * Prepare a live-entitlement decision from observations.
 * Pure relative to I/O — does not mutate publication state.
 */
export function prepareWebsiteLiveEntitlementDecision(
  obs: WebsiteEntitlementObservations,
): WebsiteEntitlementReconcileResult {
  return reconcileWebsiteLiveEntitlement(obs)
}

export class WebsiteEntitlementRequiredError extends Error {
  readonly statusCode = 402
  readonly data: {
    code: 'website_entitlement_required'
    status: WebsiteLiveEntitlementDecision['status']
    reasons: WebsiteLiveEntitlementDecision['reasons']
    enforcement_wired: true
  }

  constructor(decision: WebsiteLiveEntitlementDecision) {
    super('Website entitlement required')
    this.name = 'WebsiteEntitlementRequiredError'
    this.data = {
      code: 'website_entitlement_required',
      status: decision.status,
      reasons: decision.reasons,
      enforcement_wired: true,
    }
  }
}

/**
 * Guard helper for a future enforcement PR.
 *
 * Throws only when `WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED` is true AND the
 * decision is not ENTITLED. With the current constant (`false`), this is a
 * no-op that still returns the reconcile result for diagnostics / dry-run.
 *
 * Do not enable the constant in this PR.
 */
export function assertWebsiteLiveEntitlementOrThrow(
  obs: WebsiteEntitlementObservations,
): {
  result: WebsiteEntitlementReconcileResult
  decision: WebsiteLiveEntitlementDecision
  enforced: boolean
} {
  const result = reconcileWebsiteLiveEntitlement(obs)
  const enforced = WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED === true

  if (enforced && result.decision.status !== 'ENTITLED') {
    throw new WebsiteEntitlementRequiredError(result.decision)
  }

  return { result, decision: result.decision, enforced }
}

/**
 * Proposed durable ledger (NOT applied in this PR — document only).
 *
 * A future migration may introduce something like:
 *
 * ```sql
 * create table if not exists public.website_entitlement_events (
 *   id uuid primary key default gen_random_uuid(),
 *   tenant_id uuid not null references public.tenants(id),
 *   stripe_event_id text not null unique,
 *   event_type text not null,
 *   observation jsonb not null,
 *   decision_status text not null,
 *   created_at timestamptz not null default now()
 * );
 * ```
 *
 * Purpose: idempotent webhook replay, refund/dispute audit, tenant-scoped
 * evidence history. Do not apply until product/security review authorizes it.
 */
export const WEBSITE_ENTITLEMENT_EVENTS_TABLE_PROPOSAL = 'website_entitlement_events' as const
