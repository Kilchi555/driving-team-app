/**
 * POST /api/payments/refund-request
 *
 * Direct Wallee refund (full or partial). Temporarily limited to the
 * WALLEE_REFUND_ALLOWED_EMAILS allowlist.
 */
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { processWalleeRefund, remainingWalleeRefundableRappen } from '~/server/utils/wallee-refund'
import { canInitiateWalleeRefund } from '~/utils/wallee-refund-access'
import logger from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: actor } = await supabase
    .from('users')
    .select('id, tenant_id, role, email, first_name, last_name')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!actor || !['admin', 'superadmin', 'staff'].includes(actor.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (!canInitiateWalleeRefund(actor.email)) {
    throw createError({ statusCode: 403, statusMessage: 'Wallee-Rückerstattungen sind vorerst nur für freigeschriebene Staff-Accounts aktiv.' })
  }

  const body = await readBody(event)
  const { payment_id, amount_rappen, reason, price_correction } = body

  if (!payment_id) throw createError({ statusCode: 400, statusMessage: 'payment_id is required' })

  const { data: payment } = await supabase
    .from('payments')
    .select('id, wallee_transaction_id, total_amount_rappen, credit_used_rappen, payment_status, tenant_id, payment_method, refunded_amount_rappen')
    .eq('id', payment_id)
    .eq('tenant_id', actor.tenant_id)
    .single()

  if (!payment) throw createError({ statusCode: 404, statusMessage: 'Payment not found' })
  if (payment.payment_method !== 'wallee') {
    throw createError({ statusCode: 400, statusMessage: 'Nur Wallee-Zahlungen können via API erstattet werden.' })
  }

  const remaining = remainingWalleeRefundableRappen(payment)
  if (remaining <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Diese Zahlung ist via Wallee bereits vollständig erstattet.' })
  }

  const requestedAmount = amount_rappen ?? remaining
  if (requestedAmount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Rückerstattungsbetrag muss grösser als 0 sein.' })
  }

  logger.info(`💸 Wallee refund by ${actor.email} for payment ${payment_id}, amount: ${requestedAmount} Rappen`)

  const result = await processWalleeRefund({
    payment,
    requestedAmountRappen: requestedAmount,
    tenantId: payment.tenant_id,
    idempotencyKey: price_correction
      ? `duration-reduction-${payment_id}-${requestedAmount}`
      : `manual-refund-${payment_id}-${requestedAmount}`,
    reason: reason || (price_correction ? 'Dauer reduziert' : 'Manuell ausgelöst'),
    initiatedBy: actor.id,
    priceCorrection: !!price_correction,
  })

  if (!result.success) throw createError({ statusCode: 400, statusMessage: result.error })

  if (reason) {
    await supabase.from('payments').update({
      notes: reason,
      updated_at: new Date().toISOString(),
    }).eq('id', payment_id)
  }

  return {
    success: true,
    mode: 'direct',
    refunded_amount_chf: result.refundedAmountChf,
    remaining_refundable_chf: (result.remainingRefundableRappen || 0) / 100,
    payment_status: result.paymentStatus,
  }
})
