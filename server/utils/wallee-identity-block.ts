/**
 * Captured Wallee course payments whose public-user resolution is blocked.
 *
 * `payment_status` stays the payment lifecycle (`pending` until the seat RPC
 * completes). The block itself lives in metadata so Phase 4 cannot treat a
 * captured payment as an abandoned checkout.
 *
 * This is not a Wallee decline. Nothing here refunds, deletes, or cancels.
 */
import { mergePaymentMetadata, normalizePaymentMetadata } from '~/server/utils/payment-metadata'

export const CAPTURED_IDENTITY_BLOCK_STATE = 'identity_blocked'

export function isCapturedIdentityBlockMetadata(metadata: unknown): boolean {
  return normalizePaymentMetadata(metadata).wallee_failure_state === CAPTURED_IDENTITY_BLOCK_STATE
}

/**
 * PostgREST column for `metadata->>'wallee_failure_state'`.
 * `IS DISTINCT FROM` keeps rows whose key is absent (SQL NULL) cancellable.
 * `.neq()` does not: NULL <> 'identity_blocked' is unknown and drops the row.
 */
export const IDENTITY_BLOCK_STATE_COLUMN = 'metadata->>wallee_failure_state'

type IdentityCancelGuard = {
  isDistinct: (column: string, value: string) => IdentityCancelGuard
}

/**
 * Atomic cancel guard. Must be applied on the UPDATE, not on a prior SELECT.
 * A row that becomes identity_blocked between the snapshot and this statement
 * matches zero rows and stays pending.
 */
export function excludeCapturedIdentityBlock<Q extends IdentityCancelGuard>(query: Q): Q {
  return query.isDistinct(IDENTITY_BLOCK_STATE_COLUMN, CAPTURED_IDENTITY_BLOCK_STATE) as Q
}

/**
 * Phase 4 cancel. Same ids as the snapshot, but the UPDATE itself re-checks
 * that the row is still pending and not identity_blocked.
 */
export function cancelStalePendingWalleePaymentIds(
  supabase: {
    from: (table: string) => {
      update: (values: {
        payment_status: 'cancelled'
        notes: string
        updated_at: string
      }) => {
        in: (column: string, values: readonly string[]) => {
          eq: (column: string, value: string) => IdentityCancelGuard
        }
      }
    }
  },
  ids: readonly string[],
  notes: string,
) {
  return excludeCapturedIdentityBlock(
    supabase
      .from('payments')
      .update({
        payment_status: 'cancelled',
        notes,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)
      .eq('payment_status', 'pending'),
  )
}

export function partitionStalePendingWalleePayments<T extends { id: string, metadata?: unknown }>(
  payments: T[],
): { identityBlocked: T[], genuineFailure: T[], abandoned: T[] } {
  const identityBlocked: T[] = []
  const genuineFailure: T[] = []
  const abandoned: T[] = []
  for (const payment of payments) {
    const state = normalizePaymentMetadata(payment.metadata).wallee_failure_state
    if (state === CAPTURED_IDENTITY_BLOCK_STATE) identityBlocked.push(payment)
    else if (state) genuineFailure.push(payment)
    else abandoned.push(payment)
  }
  return { identityBlocked, genuineFailure, abandoned }
}

/**
 * Remember that Wallee already captured this payment and fulfillment stopped
 * on identity. Does not change payment_status and does not create a new row.
 * Repeating the same reason is a no-op.
 */
export async function persistCapturedIdentityBlock(
  supabase: any,
  payment: { id: string, tenant_id: string, metadata?: unknown },
  reason: string,
): Promise<void> {
  const existing = normalizePaymentMetadata(payment.metadata)
  if (
    existing.wallee_failure_state === CAPTURED_IDENTITY_BLOCK_STATE
    && existing.identity_block_reason === reason
  ) {
    return
  }
  const patch: Record<string, unknown> = {
    wallee_failure_state: CAPTURED_IDENTITY_BLOCK_STATE,
    identity_block_reason: reason,
  }
  if (existing.wallee_failure_state !== CAPTURED_IDENTITY_BLOCK_STATE) {
    patch.wallee_failure_detected_at = new Date().toISOString()
  }
  const next = mergePaymentMetadata(existing, patch)
  payment.metadata = next
  const { error } = await supabase
    .from('payments')
    .update({ metadata: next })
    .eq('id', payment.id)
    .eq('tenant_id', payment.tenant_id)
  if (error) {
    throw new Error(error.message || 'identity block metadata was not saved')
  }
}

/**
 * After the same payment later fulfills, drop the active block flag.
 * The reason and resolved timestamp stay on the row.
 */
export async function clearCapturedIdentityBlock(
  supabase: any,
  payment: { id: string, tenant_id: string, metadata?: unknown },
): Promise<void> {
  const existing = normalizePaymentMetadata(payment.metadata)
  if (existing.wallee_failure_state !== CAPTURED_IDENTITY_BLOCK_STATE) return
  const next = mergePaymentMetadata(existing, {
    identity_block_resolved_at: new Date().toISOString(),
  })
  delete next.wallee_failure_state
  // Mutate the in-memory row only after the DB write succeeds. Otherwise a
  // failed clear would hide the still-blocked DB metadata from a later retry.
  const { error } = await supabase
    .from('payments')
    .update({ metadata: next })
    .eq('id', payment.id)
    .eq('tenant_id', payment.tenant_id)
  if (error) {
    throw new Error(error.message || 'identity block metadata was not cleared')
  }
  payment.metadata = next
}
