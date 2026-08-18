// Shared Wallee refund service: partials, ledger, idempotency.

import { getPaymentProviderForTenant } from '~/server/payment-providers/factory'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

function roundToNearest5Rappen(rappen: number): number {
  return Math.round(rappen / 5) * 5
}

export function walleeCapturedRappen(payment: {
  total_amount_rappen: number
  credit_used_rappen?: number | null
}): number {
  return roundToNearest5Rappen(
    (payment.total_amount_rappen || 0) - (payment.credit_used_rappen || 0)
  )
}

export function remainingWalleeRefundableRappen(payment: {
  total_amount_rappen: number
  credit_used_rappen?: number | null
  refunded_amount_rappen?: number | null
}): number {
  return Math.max(0, walleeCapturedRappen(payment) - (payment.refunded_amount_rappen || 0))
}

export interface WalleeRefundResult {
  success: boolean
  refundId?: string
  refundedAmountRappen: number
  refundedAmountChf: number
  remainingRefundableRappen?: number
  paymentStatus?: string
  error?: string
}

export interface ProcessWalleeRefundOptions {
  payment: {
    id: string
    wallee_transaction_id: string | null
    total_amount_rappen: number
    credit_used_rappen: number
    payment_status: string
    tenant_id: string | null
    refunded_amount_rappen?: number | null
  }
  requestedAmountRappen: number
  tenantId: string | null | undefined
  idempotencyKey: string
  reason?: string
  initiatedBy?: string | null
  /** Price correction (e.g. duration reduced): refund money but do not lower remaining vs the new total. */
  priceCorrection?: boolean
}

const REFUNDABLE_STATUSES = new Set(['completed', 'partially_refunded', 'authorized'])

export async function processWalleeRefund(opts: ProcessWalleeRefundOptions): Promise<WalleeRefundResult> {
  const { payment, requestedAmountRappen, tenantId, idempotencyKey, reason, initiatedBy, priceCorrection } = opts
  const supabase = getSupabaseAdmin()

  if (!tenantId) {
    logger.warn('⚠️ [Wallee Refund] Blocked — no tenant_id', { paymentId: payment.id })
    return fail('Rückerstattung nicht möglich: Kein Tenant für diese Zahlung gefunden. Bitte manuell in Wallee veranlassen.')
  }

  if (!requestedAmountRappen || requestedAmountRappen <= 0) {
    return fail('Rückerstattungsbetrag muss grösser als 0 sein.')
  }

  const { data: fresh } = await supabase
    .from('payments')
    .select('id, wallee_transaction_id, total_amount_rappen, credit_used_rappen, payment_status, tenant_id, refunded_amount_rappen')
    .eq('id', payment.id)
    .single()

  const current = fresh || payment

  if (current.payment_status === 'refunded' && (current.refunded_amount_rappen || 0) === 0) {
    return fail('Diese Zahlung wurde bereits als Guthaben erstattet. Eine zusätzliche Wallee-Rücküberweisung würde doppelt auszahlen.')
  }

  if (!REFUNDABLE_STATUSES.has(current.payment_status) && remainingWalleeRefundableRappen(current) <= 0) {
    return fail(`Zahlung ist im Status '${current.payment_status}' — keine Wallee-Rückerstattung mehr möglich.`)
  }

  const { data: existing } = await supabase
    .from('payment_refunds')
    .select('id, wallee_refund_id, amount_rappen, status')
    .eq('payment_id', payment.id)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (existing?.status === 'successful') {
    const remaining = remainingWalleeRefundableRappen(current)
    return {
      success: true,
      refundId: existing.wallee_refund_id || undefined,
      refundedAmountRappen: existing.amount_rappen,
      refundedAmountChf: existing.amount_rappen / 100,
      remainingRefundableRappen: remaining,
      paymentStatus: current.payment_status,
    }
  }

  let walleeTransactionId = current.wallee_transaction_id || payment.wallee_transaction_id
  if (!walleeTransactionId) {
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
    return fail('Keine Wallee Transaction ID für diese Zahlung gefunden. Rückerstattung bitte manuell im Wallee-Dashboard durchführen.')
  }

  const captured = walleeCapturedRappen(current)
  if (captured <= 0) {
    return fail('Kein via Wallee bezahlter Betrag vorhanden — Zahlung wurde vollständig mit Guthaben beglichen.')
  }

  const { data: openRows } = await supabase
    .from('payment_refunds')
    .select('amount_rappen, idempotency_key')
    .eq('payment_id', payment.id)
    .in('status', ['pending', 'successful'])

  const reserved = (openRows || [])
    .filter(row => row.idempotency_key !== idempotencyKey)
    .reduce((sum, row) => sum + (row.amount_rappen || 0), 0)

  const remaining = Math.max(0, captured - reserved)
  if (remaining <= 0) {
    return fail('Diese Zahlung ist via Wallee bereits vollständig erstattet.')
  }

  const actualRefundRappen = Math.min(requestedAmountRappen, remaining)
  const actualRefundChf = actualRefundRappen / 100

  logger.debug('💸 [Wallee Refund] Preparing refund:', {
    paymentId: payment.id,
    transactionId: walleeTransactionId,
    requestedAmountChf: requestedAmountRappen / 100,
    remainingChf: remaining / 100,
    actualRefundChf,
    idempotencyKey,
  })

  try {
    const provider = await getPaymentProviderForTenant(tenantId)
    const result = await provider.createRefund({
      transactionId: walleeTransactionId,
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
      if (existing?.id) {
        await supabase.from('payment_refunds').update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
      }
      return fail(result.error || 'Wallee-Rückerstattung fehlgeschlagen.')
    }

    const now = new Date().toISOString()
    const ledgerPayload = {
      tenant_id: tenantId,
      payment_id: payment.id,
      wallee_refund_id: result.refundId || null,
      amount_rappen: actualRefundRappen,
      status: 'successful',
      reason: reason || null,
      idempotency_key: idempotencyKey,
      initiated_by: initiatedBy || null,
      updated_at: now,
    }

    if (existing?.id) {
      await supabase.from('payment_refunds').update(ledgerPayload).eq('id', existing.id)
    } else {
      await supabase.from('payment_refunds').insert(ledgerPayload)
    }

    // Duration/price corrections already lowered total_amount to the new price.
    // Counting this refund toward refunded_amount_rappen would understate what
    // is still refundable on the remaining (new) total.
    if (priceCorrection) {
      logger.info('✅ [Wallee Refund] Price-correction refund (ledger only):', {
        refundId: result.refundId,
        amountChf: actualRefundChf,
        transactionId: walleeTransactionId,
      })
      return {
        success: true,
        refundId: result.refundId,
        refundedAmountRappen: actualRefundRappen,
        refundedAmountChf: actualRefundChf,
        remainingRefundableRappen: remainingWalleeRefundableRappen(current),
        paymentStatus: current.payment_status,
      }
    }

    const synced = await syncPaymentRefundTotals(supabase, payment.id)

    logger.info('✅ [Wallee Refund] Success:', {
      refundId: result.refundId,
      amountChf: actualRefundChf,
      remainingChf: (synced.remainingRefundableRappen || 0) / 100,
      transactionId: walleeTransactionId,
    })

    return {
      success: true,
      refundId: result.refundId,
      refundedAmountRappen: actualRefundRappen,
      refundedAmountChf: actualRefundChf,
      remainingRefundableRappen: synced.remainingRefundableRappen,
      paymentStatus: synced.paymentStatus,
    }
  } catch (err: any) {
    logger.error('❌ [Wallee Refund] Exception:', err?.message ?? err)
    return fail(err?.message || 'Unerwarteter Fehler bei der Wallee-Rückerstattung.')
  }
}

export async function syncPaymentRefundTotals(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  paymentId: string
): Promise<{ remainingRefundableRappen: number; paymentStatus: string; refundedAmountRappen: number }> {
  const { data: payment } = await supabase
    .from('payments')
    .select('id, total_amount_rappen, credit_used_rappen, payment_status, notes')
    .eq('id', paymentId)
    .single()

  const { data: rows } = await supabase
    .from('payment_refunds')
    .select('amount_rappen, status, wallee_refund_id')
    .eq('payment_id', paymentId)

  const refundedAmountRappen = (rows || [])
    .filter(row => row.status === 'successful' || row.status === 'pending')
    .reduce((sum, row) => sum + (row.amount_rappen || 0), 0)

  const latestRefundId = [...(rows || [])]
    .reverse()
    .find(row => row.wallee_refund_id && row.status !== 'failed')
    ?.wallee_refund_id || null

  const captured = payment ? walleeCapturedRappen(payment) : 0
  const remainingRefundableRappen = Math.max(0, captured - refundedAmountRappen)
  const fullyRefunded = captured > 0 && remainingRefundableRappen <= 0
  const now = new Date().toISOString()

  const nextStatus = fullyRefunded
    ? 'refunded'
    : (payment?.payment_status === 'refunded' && remainingRefundableRappen > 0
      ? 'completed'
      : (payment?.payment_status || 'completed'))

  await supabase
    .from('payments')
    .update({
      refunded_amount_rappen: refundedAmountRappen,
      wallee_refund_id: latestRefundId,
      payment_status: nextStatus,
      ...(fullyRefunded ? { refunded_at: now } : {}),
      updated_at: now,
    })
    .eq('id', paymentId)

  return { remainingRefundableRappen, paymentStatus: nextStatus, refundedAmountRappen }
}

function fail(error: string): WalleeRefundResult {
  return { success: false, refundedAmountRappen: 0, refundedAmountChf: 0, error }
}
