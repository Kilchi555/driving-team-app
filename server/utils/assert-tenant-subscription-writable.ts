/**
 * Server enforcement for SaaS subscription write access (PR-A).
 *
 * Call only with a trusted tenant ID (auth profile or already-authorized entity).
 * Never accept subscription fields or authoritative tenant identity from the body.
 *
 * Order in handlers: authenticate → authorize tenant → assert writable → mutate.
 */

import type { H3Event } from 'h3'
import { createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import {
  evaluateTenantSubscriptionWriteAccess,
  type TenantSubscriptionWriteReasonCode,
  type TenantSubscriptionWriteSnapshot,
} from '~/utils/tenant-subscription-write-access'

export const SAAS_SUBSCRIPTION_REQUIRED_CODE = 'saas_subscription_required' as const

export type AssertTenantSubscriptionWritableOpts = {
  /** Trusted tenant UUID — never from untrusted body as sole source of truth. */
  tenantId: string
  /** Optional clock override (tests). */
  now?: Date
  /** Route/action label for logs. */
  route?: string
  /** Authenticated user id when available (auth uid or profile id). */
  userId?: string | null
  /**
   * Explicit bypass for system/billing callers only.
   * Must never be derived from request body/query.
   */
  bypass?: 'system' | 'billing'
}

function throwSubscriptionRequired(reasonCode: TenantSubscriptionWriteReasonCode) {
  throw createError({
    statusCode: 402,
    statusMessage: 'Aktives Abo erforderlich. Bitte unter /upgrade einen Plan wählen.',
    data: {
      code: SAAS_SUBSCRIPTION_REQUIRED_CODE,
      reason: reasonCode,
    },
  })
}

function throwSubscriptionLookupFailed() {
  throw createError({
    statusCode: 503,
    statusMessage: 'Subscription status temporarily unavailable',
    data: {
      code: 'saas_subscription_lookup_failed',
    },
  })
}

/**
 * Loads tenant subscription fields and denies the request when writes are blocked.
 */
export async function assertTenantSubscriptionWritable(
  _event: H3Event | null,
  opts: AssertTenantSubscriptionWritableOpts,
): Promise<{ reasonCode: TenantSubscriptionWriteReasonCode }> {
  if (opts.bypass === 'system' || opts.bypass === 'billing') {
    return { reasonCode: 'writable' }
  }

  const tenantId = typeof opts.tenantId === 'string' ? opts.tenantId.trim() : ''
  if (!tenantId) {
    logger.warn('[saas-write-guard] missing trusted tenant id', {
      route: opts.route || null,
      userId: opts.userId || null,
    })
    throwSubscriptionRequired('missing_snapshot')
  }

  const now = opts.now ?? new Date()
  let snapshot: TenantSubscriptionWriteSnapshot | null = null

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('tenants')
      .select('is_trial, trial_ends_at, subscription_plan, current_period_end, website_only')
      .eq('id', tenantId)
      .maybeSingle()

    if (error) {
      logger.warn('[saas-write-guard] tenant snapshot lookup failed', {
        tenantId,
        route: opts.route || null,
        userId: opts.userId || null,
        // Do not log full error objects (may contain sensitive details).
        errCode: (error as { code?: string }).code || null,
      })
      throwSubscriptionLookupFailed()
    }

    if (!data) {
      logger.warn('[saas-write-guard] tenant snapshot missing', {
        tenantId,
        route: opts.route || null,
        userId: opts.userId || null,
      })
      throwSubscriptionRequired('missing_snapshot')
    }

    snapshot = {
      is_trial: data.is_trial,
      trial_ends_at: data.trial_ends_at ?? null,
      subscription_plan: data.subscription_plan ?? null,
      current_period_end: data.current_period_end ?? null,
      website_only: !!data.website_only,
    }
  } catch (err: any) {
    if (err?.statusCode === 402 || err?.statusCode === 503) throw err
    logger.warn('[saas-write-guard] unexpected lookup error', {
      tenantId,
      route: opts.route || null,
      userId: opts.userId || null,
    })
    throwSubscriptionLookupFailed()
  }

  const decision = evaluateTenantSubscriptionWriteAccess(snapshot, now)
  if (!decision.writable) {
    logger.info('[saas-write-guard] blocked mutation', {
      tenantId,
      userId: opts.userId || null,
      route: opts.route || null,
      reasonCode: decision.reasonCode,
    })
    throwSubscriptionRequired(decision.reasonCode)
  }

  return { reasonCode: decision.reasonCode }
}
