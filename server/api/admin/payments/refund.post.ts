/**
 * POST /api/admin/payments/refund
 *
 * Manual Wallee refund (full or partial). Temporarily limited to the
 * WALLEE_REFUND_ALLOWED_EMAILS allowlist.
 */
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { processWalleeRefund, remainingWalleeRefundableRappen } from '~/server/utils/wallee-refund'
import { canInitiateWalleeRefund, actorEmailFromAuth } from '~/utils/wallee-refund-access'
import logger from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  if (!canInitiateWalleeRefund(actorEmailFromAuth(authUser))) {
    throw createError({ statusCode: 403, statusMessage: 'Wallee-Rückerstattungen sind vorerst nur für freigeschriebene Staff-Accounts aktiv.' })
  }

  const supabase = getSupabaseAdmin()

  const { data: actor } = await supabase
    .from('users')
    .select('id, tenant_id, role, email')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!actor || !['admin', 'superadmin', 'staff'].includes(actor.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const { payment_id, amount_rappen } = body

  if (!payment_id) {
    throw createError({ statusCode: 400, statusMessage: 'payment_id is required' })
  }

  const { data: payment, error: paymentErr } = await supabase
    .from('payments')
    .select('id, wallee_transaction_id, total_amount_rappen, credit_used_rappen, payment_status, tenant_id, payment_method, refunded_amount_rappen')
    .eq('id', payment_id)
    .eq('tenant_id', actor.tenant_id)
    .single()

  if (paymentErr || !payment) {
    throw createError({ statusCode: 404, statusMessage: 'Payment not found' })
  }

  if (payment.payment_method !== 'wallee') {
    throw createError({ statusCode: 400, statusMessage: 'Nur Wallee-Zahlungen können via API erstattet werden.' })
  }

  const remaining = remainingWalleeRefundableRappen(payment)
  if (remaining <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Diese Zahlung ist via Wallee bereits vollständig erstattet.' })
  }

  const requestedAmount = amount_rappen ?? remaining

  logger.info(`💸 Manual refund requested by ${actor.email} for payment ${payment_id}, amount: ${requestedAmount} Rappen`)

  const result = await processWalleeRefund({
    payment,
    requestedAmountRappen: requestedAmount,
    tenantId: payment.tenant_id,
    idempotencyKey: `manual-refund-${payment_id}-${requestedAmount}`,
    reason: 'Manuell ausgelöst',
    initiatedBy: actor.id,
  })

  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.error || 'Rückerstattung fehlgeschlagen' })
  }

  return {
    success: true,
    refund_id: result.refundId,
    refunded_amount_rappen: result.refundedAmountRappen,
    refunded_amount_chf: result.refundedAmountChf,
    remaining_refundable_rappen: result.remainingRefundableRappen,
    payment_status: result.paymentStatus,
  }
})
