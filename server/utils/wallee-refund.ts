// server/utils/wallee-refund.ts
// Shared service for processing Wallee refunds with correct amount calculation and idempotency

import { getPaymentProviderForTenant } from '~/server/payment-providers/factory'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * Rounds an amount in Rappen to the nearest 5 Rappen (CHF 0.05 rounding)
 * Wallee uses the same rounding as the original transaction.
 */
function roundToNearest5Rappen(rappen: number): number {
  return Math.round(rappen / 5) * 5
}

export interface WalleeRefundResult {
  success: boolean
  refundId?: string
  refundedAmountRappen: number
  refundedAmountChf: number
  error?: string
}

export interface ProcessWalleeRefundOptions {
  /** The payments row from the DB */
  payment: {
    id: string
    wallee_transaction_id: string | null
    total_amount_rappen: number
    credit_used_rappen: number
    payment_status: string
    tenant_id: string | null
  }
  /** Requested refund amount in Rappen. Will be capped at the actual Wallee-captured amount. */
  requestedAmountRappen: number
  /** Tenant ID to load the Wallee provider config. Required — refund cannot proceed without it. */
  tenantId: string | null | undefined
  /** Stable key to prevent double-refunds on retry. Use paymentId or registrationId. */
  idempotencyKey: string
  /** Human-readable reason for logs/notes */
  reason?: string
}

/**
 * Processes a Wallee refund for a given payment.
 *
 * Safety checks (all must pass before any API call is made):
 * - payment.payment_status must be 'completed'
 * - tenantId must be present (no user-less / tenant-less payments)
 * - A Wallee transaction ID must be found (on payment or in payment_wallee_transactions)
 * - The Wallee-captured amount (total - credit, rounded to 5 Rappen) must be > 0
 *
 * Amount handling:
 * - Caps the requested amount to the actual Wallee-captured amount
 * - Uses a stable externalId for idempotency — safe to retry with the same idempotencyKey
 */
export async function processWalleeRefund(opts: ProcessWalleeRefundOptions): Promise<WalleeRefundResult> {
  const { payment, requestedAmountRappen, tenantId, idempotencyKey, reason } = opts

  // Guard: tenant required to load Wallee config
  if (!tenantId) {
    logger.warn('⚠️ [Wallee Refund] Blocked — no tenant_id on payment, cannot load Wallee config', {
      paymentId: payment.id,
    })
    return {
      success: false,
      refundedAmountRappen: 0,
      refundedAmountChf: 0,
      error: 'Rückerstattung nicht möglich: Kein Tenant für diese Zahlung gefunden. Bitte manuell in Wallee veranlassen.',
    }
  }

  // Guard: only completed payments can be refunded via Wallee
  if (payment.payment_status !== 'completed') {
    return {
      success: false,
      refundedAmountRappen: 0,
      refundedAmountChf: 0,
      error: `Zahlung ist im Status '${payment.payment_status}' — nur abgeschlossene Zahlungen (completed) können via Wallee zurückerstattet werden.`,
    }
  }

  // Guard: requested amount must be > 0
  if (!requestedAmountRappen || requestedAmountRappen <= 0) {
    return {
      success: false,
      refundedAmountRappen: 0,
      refundedAmountChf: 0,
      error: 'Rückerstattungsbetrag muss grösser als 0 sein.',
    }
  }

  // Determine actual Wallee transaction ID
  let walleeTransactionId = payment.wallee_transaction_id

  if (!walleeTransactionId) {
    // Fallback: look in payment_wallee_transactions table
    const supabase = getSupabaseAdmin()
    const { data: pwt } = await supabase
      .from('payment_wallee_transactions')
      .select('wallee_transaction_id')
      .eq('payment_id', payment.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    walleeTransactionId = pwt?.wallee_transaction_id ?? null
  }

  if (!walleeTransactionId) {
    return {
      success: false,
      refundedAmountRappen: 0,
      refundedAmountChf: 0,
      error: 'Keine Wallee Transaction ID für diese Zahlung gefunden. Rückerstattung bitte manuell im Wallee-Dashboard durchführen.',
    }
  }

  // Calculate actual Wallee-captured amount:
  // Wallee was only charged (total - credit_used), rounded to nearest 5 Rappen
  const walleeCapturedRappen = roundToNearest5Rappen(
    payment.total_amount_rappen - (payment.credit_used_rappen || 0)
  )

  if (walleeCapturedRappen <= 0) {
    return {
      success: false,
      refundedAmountRappen: 0,
      refundedAmountChf: 0,
      error: 'Kein via Wallee bezahlter Betrag vorhanden — Zahlung wurde vollständig mit Guthaben beglichen.',
    }
  }

  // Cap refund to actual captured amount
  const actualRefundRappen = Math.min(requestedAmountRappen, walleeCapturedRappen)
  const actualRefundChf = actualRefundRappen / 100

  logger.debug('💸 [Wallee Refund] Preparing refund:', {
    paymentId: payment.id,
    transactionId: walleeTransactionId,
    requestedAmountChf: requestedAmountRappen / 100,
    walleeCapturedChf: walleeCapturedRappen / 100,
    actualRefundChf,
    idempotencyKey,
  })

  try {
    const provider = await getPaymentProviderForTenant(tenantId)

    const result = await provider.createRefund({
      transactionId: walleeTransactionId,
      // Wallee expects CHF (not Rappen) for the amount
      amount: actualRefundChf,
      currency: 'CHF',
      reason,
      metadata: {
        idempotency_key: idempotencyKey,
        payment_id: payment.id,
      },
    })

    if (!result.success) {
      logger.error('❌ [Wallee Refund] Failed:', result.error)
      return {
        success: false,
        refundedAmountRappen: 0,
        refundedAmountChf: 0,
        error: result.error || 'Wallee-Rückerstattung fehlgeschlagen.',
      }
    }

    logger.info('✅ [Wallee Refund] Success:', {
      refundId: result.refundId,
      amountChf: actualRefundChf,
      transactionId: walleeTransactionId,
    })

    return {
      success: true,
      refundId: result.refundId,
      refundedAmountRappen: actualRefundRappen,
      refundedAmountChf: actualRefundChf,
    }
  } catch (err: any) {
    logger.error('❌ [Wallee Refund] Exception:', err?.message ?? err)
    return {
      success: false,
      refundedAmountRappen: 0,
      refundedAmountChf: 0,
      error: err?.message || 'Unerwarteter Fehler bei der Wallee-Rückerstattung.',
    }
  }
}
