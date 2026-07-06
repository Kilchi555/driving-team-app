/**
 * POST /api/admin/payments/refund
 *
 * Manually trigger a Wallee refund for a completed payment.
 * Only admin/superadmin can trigger this.
 *
 * Body: { payment_id, amount_rappen? }
 * If amount_rappen is omitted, the full Wallee-captured amount is refunded.
 */
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { processWalleeRefund } from '~/server/utils/wallee-refund'
import logger from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: actor } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!actor || !['admin', 'superadmin'].includes(actor.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const { payment_id, amount_rappen } = body

  if (!payment_id) {
    throw createError({ statusCode: 400, statusMessage: 'payment_id is required' })
  }

  const { data: payment, error: paymentErr } = await supabase
    .from('payments')
    .select('id, wallee_transaction_id, total_amount_rappen, credit_used_rappen, payment_status, tenant_id, payment_method')
    .eq('id', payment_id)
    .eq('tenant_id', actor.tenant_id)
    .single()

  if (paymentErr || !payment) {
    throw createError({ statusCode: 404, statusMessage: 'Payment not found' })
  }

  if (payment.payment_method !== 'wallee') {
    throw createError({ statusCode: 400, statusMessage: 'Nur Wallee-Zahlungen können via API erstattet werden.' })
  }

  if (payment.payment_status !== 'completed') {
    throw createError({
      statusCode: 400,
      statusMessage: `Zahlung ist im Status '${payment.payment_status}' — nur abgeschlossene Zahlungen können erstattet werden.`
    })
  }

  const requestedAmount = amount_rappen ?? (payment.total_amount_rappen - (payment.credit_used_rappen || 0))

  logger.info(`💸 Manual refund requested by ${actor.id} for payment ${payment_id}, amount: ${requestedAmount} Rappen`)

  const result = await processWalleeRefund({
    payment,
    requestedAmountRappen: requestedAmount,
    tenantId: payment.tenant_id,
    idempotencyKey: `manual-refund-${payment_id}-${Date.now()}`,
    reason: 'Manuell ausgelöst durch Admin',
  })

  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.error || 'Rückerstattung fehlgeschlagen' })
  }

  // Update payment status to refunded
  await supabase
    .from('payments')
    .update({
      payment_status: 'refunded',
      wallee_refund_id: result.refundId || null,
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment_id)

  return {
    success: true,
    refund_id: result.refundId,
    refunded_amount_rappen: result.refundedAmountRappen,
    refunded_amount_chf: result.refundedAmountChf,
  }
})
