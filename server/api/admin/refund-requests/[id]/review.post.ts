/**
 * POST /api/admin/refund-requests/[id]/review
 * Admin approves or rejects a refund request.
 * Body: { action: 'approve' | 'reject', note?: string }
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
    .from('users').select('id, tenant_id, role').eq('auth_user_id', authUser.id).single()

  if (!actor || !['admin', 'superadmin'].includes(actor.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const requestId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { action, note } = body

  if (!['approve', 'reject'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'action must be approve or reject' })
  }

  // Load request
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

  // Approve → process refund
  const { data: payment } = await supabase
    .from('payments')
    .select('id, wallee_transaction_id, total_amount_rappen, credit_used_rappen, payment_status, tenant_id, payment_method')
    .eq('id', request.payment_id)
    .single()

  if (!payment) throw createError({ statusCode: 404, statusMessage: 'Payment not found' })

  const result = await processWalleeRefund({
    payment,
    requestedAmountRappen: request.requested_amount_rappen,
    tenantId: actor.tenant_id,
    idempotencyKey: `refund-request-${requestId}`,
    reason: note || 'Vom Admin genehmigt',
  })

  if (!result.success) {
    await supabase.from('refund_requests').update({
      review_note: `Fehler: ${result.error}`,
      updated_at: new Date().toISOString(),
    }).eq('id', requestId)
    throw createError({ statusCode: 400, statusMessage: result.error })
  }

  await Promise.all([
    supabase.from('payments').update({
      payment_status: 'refunded',
      wallee_refund_id: result.refundId || null,
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', request.payment_id),

    supabase.from('refund_requests').update({
      status: 'completed',
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
      updated_at: new Date().toISOString(),
    }).eq('id', requestId),
  ])

  return { success: true, action: 'approved', refunded_amount_chf: result.refundedAmountChf }
})
