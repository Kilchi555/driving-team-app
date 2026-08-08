/**
 * Sync-then-act helpers for Wallee payments.
 *
 * Prevents double charges by never creating a second open transaction while
 * an existing one is still PENDING/CONFIRMED/PROCESSING/AUTHORIZED, and by
 * never blindly releasing processing→pending without reading Wallee first.
 */

import { Wallee } from 'wallee'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getWalleeConfigForTenant, getWalleeConfigBySpace, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { logger } from '~/utils/logger'

export const WALLEE_STATUS_MAPPING: Record<string, string> = {
  PENDING: 'pending',
  CONFIRMED: 'processing',
  PROCESSING: 'processing',
  AUTHORIZED: 'authorized',
  FULFILL: 'completed',
  COMPLETED: 'completed',
  SUCCESSFUL: 'completed',
  FAILED: 'failed',
  CANCELED: 'cancelled',
  DECLINE: 'failed',
  VOIDED: 'cancelled'
}

export const WALLEE_COMPLETED_STATES = new Set(['FULFILL', 'COMPLETED', 'SUCCESSFUL'])
export const WALLEE_AUTHORIZED_STATES = new Set(['AUTHORIZED'])
export const WALLEE_OPEN_STATES = new Set(['PENDING', 'CONFIRMED', 'PROCESSING'])
export const WALLEE_TERMINAL_FAILURE_STATES = new Set(['FAILED', 'CANCELED', 'DECLINE', 'VOIDED'])

export type WalleeSyncDecision =
  | 'mark_completed'
  | 'mark_authorized'
  | 'keep_open'
  | 'release_pending'
  | 'no_transaction'
  | 'unknown'

export interface WalleeSyncResult {
  decision: WalleeSyncDecision
  walleeState: string | null
  mappedStatus: string | null
  spaceId: number | null
  paymentUrl?: string | null
}

function mapState(state: string | null | undefined): string | null {
  if (!state) return null
  return WALLEE_STATUS_MAPPING[state] || 'pending'
}

function decideFromState(state: string | null | undefined): WalleeSyncDecision {
  if (!state) return 'unknown'
  if (WALLEE_COMPLETED_STATES.has(state)) return 'mark_completed'
  if (WALLEE_AUTHORIZED_STATES.has(state)) return 'mark_authorized'
  if (WALLEE_TERMINAL_FAILURE_STATES.has(state)) return 'release_pending'
  if (WALLEE_OPEN_STATES.has(state)) return 'keep_open'
  return 'unknown'
}

async function getTransactionService(tenantId: string, spaceIdHint?: number | null) {
  const walleeConfig = spaceIdHint
    ? await getWalleeConfigBySpace(tenantId, spaceIdHint)
    : await getWalleeConfigForTenant(tenantId)
  const sdkConfig = getWalleeSDKConfig(walleeConfig.spaceId, walleeConfig.userId, walleeConfig.apiSecret)
  return {
    spaceId: walleeConfig.spaceId,
    transactionService: new Wallee.api.TransactionService(sdkConfig),
    paymentPageService: new Wallee.api.TransactionPaymentPageService(sdkConfig)
  }
}

export async function readWalleeTransactionState(opts: {
  tenantId: string
  walleeTransactionId: string
  walleeSpaceId?: number | null
  includePaymentUrl?: boolean
}): Promise<WalleeSyncResult> {
  try {
    const { spaceId, transactionService, paymentPageService } = await getTransactionService(
      opts.tenantId,
      opts.walleeSpaceId
    )
    const response = await transactionService.read(spaceId, parseInt(opts.walleeTransactionId, 10))
    const tx = (response as any)?.body || response
    const walleeState = tx?.state ? String(tx.state) : null
    const decision = walleeState ? decideFromState(walleeState) : 'unknown'

    let paymentUrl: string | null | undefined
    if (opts.includePaymentUrl && decision === 'keep_open' && walleeState) {
      try {
        const urlResponse = await paymentPageService.paymentPageUrl(spaceId, parseInt(opts.walleeTransactionId, 10))
        const url = (urlResponse as any)?.body || urlResponse
        paymentUrl = typeof url === 'string' ? url : null
      } catch {
        paymentUrl = `https://app-wallee.com/payment/transaction/pay?spaceId=${spaceId}&transactionId=${opts.walleeTransactionId}`
      }
    }

    return {
      decision,
      walleeState,
      mappedStatus: mapState(walleeState),
      spaceId,
      paymentUrl
    }
  } catch (err: any) {
    logger.warn('⚠️ readWalleeTransactionState failed:', {
      tenantId: opts.tenantId,
      walleeTransactionId: opts.walleeTransactionId,
      error: err?.message
    })
    return {
      decision: 'unknown',
      walleeState: null,
      mappedStatus: null,
      spaceId: opts.walleeSpaceId ?? null
    }
  }
}

/**
 * Apply sync decision to a payment row.
 * - mark_completed / mark_authorized: update DB
 * - release_pending: processing/failed → pending
 * - keep_open / unknown: leave status alone (safe default)
 */
export async function applyWalleeSyncDecision(opts: {
  paymentId: string
  currentStatus: string
  decision: WalleeSyncDecision
  walleeState?: string | null
}): Promise<{ changed: boolean; newStatus: string }> {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  if (opts.decision === 'mark_completed') {
    const { error } = await supabase
      .from('payments')
      .update({
        payment_status: 'completed',
        paid_at: now,
        updated_at: now,
        ...(opts.walleeState ? { wallee_transaction_state: opts.walleeState } : {})
      })
      .eq('id', opts.paymentId)
      .neq('payment_status', 'completed')
    if (error) throw error
    return { changed: true, newStatus: 'completed' }
  }

  if (opts.decision === 'mark_authorized') {
    const { data: current } = await supabase
      .from('payments')
      .select('payment_status')
      .eq('id', opts.paymentId)
      .maybeSingle()
    if (current?.payment_status === 'completed' || current?.payment_status === 'authorized') {
      return { changed: false, newStatus: current.payment_status }
    }
    const { error } = await supabase
      .from('payments')
      .update({
        payment_status: 'authorized',
        updated_at: now,
        ...(opts.walleeState ? { wallee_transaction_state: opts.walleeState } : {})
      })
      .eq('id', opts.paymentId)
    if (error) throw error
    return { changed: true, newStatus: 'authorized' }
  }

  if (opts.decision === 'release_pending') {
    if (!['processing', 'failed'].includes(opts.currentStatus)) {
      return { changed: false, newStatus: opts.currentStatus }
    }
    const { error } = await supabase
      .from('payments')
      .update({
        payment_status: 'pending',
        updated_at: now,
        ...(opts.walleeState ? { wallee_transaction_state: opts.walleeState } : {})
      })
      .eq('id', opts.paymentId)
      .in('payment_status', ['processing', 'failed'])
    if (error) throw error
    return { changed: true, newStatus: 'pending' }
  }

  // keep_open / unknown / no_transaction — do not mutate toward pending blindly
  return { changed: false, newStatus: opts.currentStatus }
}

/**
 * Sync one payment with Wallee and apply the safe decision.
 * If there is no wallee_transaction_id, releasing to pending is allowed
 * (checkout never reached Wallee).
 */
export async function syncAndResolvePayment(payment: {
  id: string
  tenant_id: string
  payment_status: string
  wallee_transaction_id?: string | null
  wallee_space_id?: number | null
}): Promise<{
  decision: WalleeSyncDecision
  walleeState: string | null
  newStatus: string
  changed: boolean
  paymentUrl?: string | null
}> {
  if (!payment.wallee_transaction_id) {
    if (payment.payment_status === 'processing') {
      const applied = await applyWalleeSyncDecision({
        paymentId: payment.id,
        currentStatus: payment.payment_status,
        decision: 'release_pending'
      })
      return {
        decision: 'no_transaction',
        walleeState: null,
        newStatus: applied.newStatus,
        changed: applied.changed
      }
    }
    return {
      decision: 'no_transaction',
      walleeState: null,
      newStatus: payment.payment_status,
      changed: false
    }
  }

  const sync = await readWalleeTransactionState({
    tenantId: payment.tenant_id,
    walleeTransactionId: payment.wallee_transaction_id,
    walleeSpaceId: payment.wallee_space_id,
    includePaymentUrl: false
  })

  // Unknown (API error): keep lock — never open a double-charge window
  if (sync.decision === 'unknown') {
    return {
      decision: 'unknown',
      walleeState: sync.walleeState,
      newStatus: payment.payment_status,
      changed: false
    }
  }

  const applied = await applyWalleeSyncDecision({
    paymentId: payment.id,
    currentStatus: payment.payment_status,
    decision: sync.decision,
    walleeState: sync.walleeState
  })

  return {
    decision: sync.decision,
    walleeState: sync.walleeState,
    newStatus: applied.newStatus,
    changed: applied.changed,
    paymentUrl: sync.paymentUrl
  }
}
