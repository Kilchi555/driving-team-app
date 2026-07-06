/**
 * POST /api/payments/refund-request
 *
 * Staff submits a refund request for a completed payment.
 * Only available if staff_refund_permission === 'request' or 'allowed'.
 * If 'allowed', the refund is processed immediately.
 * If 'request', a refund_request entry is created and the admin is notified.
 */
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { processWalleeRefund } from '~/server/utils/wallee-refund'
import { DEFAULT_BOOKING_POLICY } from '~/server/api/admin/booking-policy.get'
import logger from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: actor } = await supabase
    .from('users')
    .select('id, tenant_id, role, first_name, last_name')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!actor || !['admin', 'superadmin', 'staff'].includes(actor.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Load booking policy
  const { data: tenant } = await supabase
    .from('tenants')
    .select('booking_policy')
    .eq('id', actor.tenant_id)
    .maybeSingle()

  const policy = { ...DEFAULT_BOOKING_POLICY, ...(tenant?.booking_policy ?? {}) }
  const permission = policy.staff_refund_permission

  if (permission === 'hidden' && !['admin', 'superadmin'].includes(actor.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Rückerstattungen sind für Staff nicht aktiviert.' })
  }

  const body = await readBody(event)
  const { payment_id, amount_rappen, reason } = body

  if (!payment_id) throw createError({ statusCode: 400, statusMessage: 'payment_id is required' })

  const { data: payment } = await supabase
    .from('payments')
    .select('id, wallee_transaction_id, total_amount_rappen, credit_used_rappen, payment_status, tenant_id, payment_method')
    .eq('id', payment_id)
    .eq('tenant_id', actor.tenant_id)
    .single()

  if (!payment) throw createError({ statusCode: 404, statusMessage: 'Payment not found' })
  if (payment.payment_status !== 'completed') {
    throw createError({ statusCode: 400, statusMessage: 'Nur abgeschlossene Zahlungen können erstattet werden.' })
  }

  const requestedAmount = amount_rappen ?? (payment.total_amount_rappen - (payment.credit_used_rappen || 0))

  // Admin/superadmin or 'allowed' → direct refund
  if (['admin', 'superadmin'].includes(actor.role) || permission === 'allowed') {
    const result = await processWalleeRefund({
      payment,
      requestedAmountRappen: requestedAmount,
      tenantId: payment.tenant_id,
      idempotencyKey: `refund-${payment_id}-${Date.now()}`,
      reason: reason || 'Manuell ausgelöst',
    })

    if (!result.success) throw createError({ statusCode: 400, statusMessage: result.error })

    await supabase.from('payments').update({
      payment_status: 'refunded',
      wallee_refund_id: result.refundId || null,
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', payment_id)

    return { success: true, mode: 'direct', refunded_amount_chf: result.refundedAmountChf }
  }

  // Staff with 'request' permission → create pending request
  const { data: request, error: insertErr } = await supabase
    .from('refund_requests')
    .insert({
      tenant_id: actor.tenant_id,
      payment_id,
      requested_by: actor.id,
      requested_amount_rappen: requestedAmount,
      reason: reason || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertErr) {
    logger.error('❌ refund_requests insert error:', insertErr)
    throw createError({ statusCode: 500, statusMessage: 'Antrag konnte nicht erstellt werden.' })
  }

  // Notify all admins via outbound_messages_queue (email)
  try {
    const { data: admins } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('tenant_id', actor.tenant_id)
      .in('role', ['admin', 'superadmin'])
      .not('email', 'is', null)

    for (const admin of (admins || [])) {
      await supabase.from('outbound_messages_queue').insert({
        tenant_id: actor.tenant_id,
        channel: 'email',
        recipient_email: admin.email,
        subject: `Rückerstattungsantrag von ${actor.first_name} ${actor.last_name}`,
        body: `${actor.first_name} ${actor.last_name} hat einen Rückerstattungsantrag gestellt.\n\nBetrag: CHF ${(requestedAmount / 100).toFixed(2)}\nGrund: ${reason || '—'}\n\nAntrag prüfen: https://app.simy.ch/admin/refund-requests`,
        status: 'pending',
      })
    }
  } catch (notifyErr: any) {
    logger.warn('⚠️ Could not notify admins:', notifyErr.message)
  }

  return { success: true, mode: 'request', request_id: request.id }
})
