/**
 * POST /api/admin/refund-requests/[id]/review
 * Approve or reject a refund request. Approve triggers a Wallee refund.
 * Temporarily limited to the WALLEE_REFUND_ALLOWED_EMAILS allowlist.
 */
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { processWalleeRefund } from '~/server/utils/wallee-refund'
import { canInitiateWalleeRefund } from '~/utils/wallee-refund-access'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: actor } = await supabase
    .from('users').select('id, tenant_id, role, email').eq('auth_user_id', authUser.id).single()

  if (!actor || !['admin', 'superadmin', 'staff'].includes(actor.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (!canInitiateWalleeRefund(actor.email)) {
    throw createError({ statusCode: 403, statusMessage: 'Wallee-Rückerstattungen sind vorerst nur für freigeschriebene Staff-Accounts aktiv.' })
  }

  const requestId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { action, note } = body

  if (!['approve', 'reject'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'action must be approve or reject' })
  }

  const { data: request } = await supabase
    .from('refund_requests')
    .select('id, status, payment_id, requested_amount_rappen, tenant_id')
    .eq('id', requestId)
    .eq('tenant_id', actor.tenant_id)
    .single()

  if (!request) throw createError({ statusCode: 404, statusMessage: 'Request not found' })
  if (request.status !== 'pending') throw createError({ statusCode: 400, statusMessage: 'Request already reviewed' })

  if (action === 'reject') {
    await supabase.from('refund_requests').update({
      status: 'rejected',
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
      updated_at: new Date().toISOString(),
    }).eq('id', requestId)

    return { success: true, action: 'rejected' }
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, wallee_transaction_id, total_amount_rappen, credit_used_rappen, payment_status, tenant_id, payment_method, refunded_amount_rappen')
    .eq('id', request.payment_id)
    .single()

  if (!payment) throw createError({ statusCode: 404, statusMessage: 'Payment not found' })

  const result = await processWalleeRefund({
    payment,
    requestedAmountRappen: request.requested_amount_rappen,
    tenantId: actor.tenant_id,
    idempotencyKey: `refund-request-${requestId}`,
    reason: note || 'Vom Admin genehmigt',
    initiatedBy: actor.id,
  })

  if (!result.success) {
    await supabase.from('refund_requests').update({
      review_note: `Fehler: ${result.error}`,
      updated_at: new Date().toISOString(),
    }).eq('id', requestId)
    throw createError({ statusCode: 400, statusMessage: result.error })
  }

  await supabase.from('refund_requests').update({
    status: 'completed',
    reviewed_by: actor.id,
    reviewed_at: new Date().toISOString(),
    review_note: note || null,
    updated_at: new Date().toISOString(),
  }).eq('id', requestId)

  return {
    success: true,
    action: 'approved',
    refunded_amount_chf: result.refundedAmountChf,
    remaining_refundable_chf: (result.remainingRefundableRappen || 0) / 100,
  }
})
