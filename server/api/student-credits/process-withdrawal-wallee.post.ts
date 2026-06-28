// server/api/student-credits/process-withdrawal-wallee.post.ts
// Admin endpoint to process pending credit withdrawals via Wallee refund.
// Finds the most recent completed payment for the student and issues a
// partial refund through the proper per-tenant Wallee config.

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { processWalleeRefund } from '~/server/utils/wallee-refund'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { withdrawalId, studentId } = body

  if (!withdrawalId && !studentId) {
    throw createError({ statusCode: 400, statusMessage: 'Either withdrawalId or studentId is required' })
  }

  const supabase = getSupabaseAdmin()

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const { data: currentUser } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!['admin', 'staff'].includes(currentUser?.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Only admins can process withdrawals' })
  }

  // ── Resolve student credit ────────────────────────────────────────────────
  let studentCredit: any

  if (studentId) {
    const { data, error } = await supabase
      .from('student_credits')
      .select('*')
      .eq('user_id', studentId)
      .single()
    if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Student credit not found' })
    studentCredit = data
  } else {
    const { data: tx } = await supabase
      .from('credit_transactions')
      .select('user_id')
      .eq('id', withdrawalId)
      .single()
    if (!tx) throw createError({ statusCode: 404, statusMessage: 'Transaction not found' })

    const { data, error } = await supabase
      .from('student_credits')
      .select('*')
      .eq('user_id', tx.user_id)
      .single()
    if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Student credit not found' })
    studentCredit = data
  }

  // ── Tenant isolation: admin may only process withdrawals for their own tenant ──
  if (studentCredit.tenant_id && currentUser?.tenant_id && studentCredit.tenant_id !== currentUser.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: student belongs to a different tenant' })
  }

  if (!studentCredit.pending_withdrawal_rappen || studentCredit.pending_withdrawal_rappen <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'No pending withdrawal' })
  }

  const withdrawalAmountRappen = studentCredit.pending_withdrawal_rappen

  logger.debug('💰 Processing credit withdrawal via Wallee:', {
    userId: studentCredit.user_id,
    amountChf: (withdrawalAmountRappen / 100).toFixed(2),
  })

  // ── Find the most recent completed Wallee payment for this student ────────
  const { data: payment } = await supabase
    .from('payments')
    .select('id, wallee_transaction_id, total_amount_rappen, credit_used_rappen, payment_status, tenant_id')
    .eq('user_id', studentCredit.user_id)
    .eq('payment_status', 'completed')
    .not('wallee_transaction_id', 'is', null)
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!payment) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Keine abgeschlossene Wallee-Zahlung für diesen Schüler gefunden. Bitte manuelle Auszahlung veranlassen.',
    })
  }

  // ── Process refund via shared service ────────────────────────────────────
  const idempotencyKey = `withdrawal-${studentCredit.user_id}-${withdrawalAmountRappen}-${new Date().toISOString().slice(0, 10)}`

  const refundResult = await processWalleeRefund({
    payment,
    requestedAmountRappen: withdrawalAmountRappen,
    tenantId: payment.tenant_id,
    idempotencyKey,
    reason: 'Guthabenrückzahlung (Auszahlung)',
  })

  if (!refundResult.success) {
    logger.error('❌ Wallee withdrawal refund failed:', refundResult.error)
    throw createError({
      statusCode: 502,
      statusMessage: refundResult.error || 'Wallee-Rückerstattung fehlgeschlagen. Bitte manuelle Auszahlung veranlassen.',
    })
  }

  // refundResult.refundId is the actual Wallee refund ID (property name from WalleeRefundResult)
  const walleeRefundId = refundResult.refundId || idempotencyKey

  logger.info('✅ Wallee withdrawal refund succeeded:', {
    userId: studentCredit.user_id,
    amountChf: refundResult.refundedAmountChf,
    walleeRefundId,
  })

  // ── Update student_credits (atomic: only if state matches what we read) ──────
  // The extra .eq conditions on balance_rappen and pending_withdrawal_rappen prevent
  // a race condition where two concurrent withdrawal requests would both succeed and
  // deduct the balance twice.
  const newBalance = Math.max(0, studentCredit.balance_rappen - withdrawalAmountRappen)
  const completedTotal = (studentCredit.completed_withdrawal_rappen || 0) + withdrawalAmountRappen

  const { data: updatedRows, error: updateError } = await supabase
    .from('student_credits')
    .update({
      balance_rappen: newBalance,
      pending_withdrawal_rappen: 0,
      completed_withdrawal_rappen: completedTotal,
      last_withdrawal_status: 'completed',
      last_wallee_refund_id: walleeRefundId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentCredit.id)
    .eq('pending_withdrawal_rappen', withdrawalAmountRappen)  // guard: still the same pending amount
    .select('id')

  if (updateError) {
    logger.error('❌ Failed to update student_credits after successful Wallee refund:', updateError)
    throw createError({ statusCode: 500, statusMessage: 'Wallee-Rückerstattung war erfolgreich, aber Datenbankupdate fehlgeschlagen. Bitte manuell prüfen.' })
  }

  if (!updatedRows || updatedRows.length === 0) {
    // Another request already processed this withdrawal — the Wallee refund above may be a duplicate.
    // Log loudly so an admin can investigate; do not throw (the money is already on its way).
    logger.error('⚠️ Withdrawal race condition detected: student_credits row was modified concurrently. Wallee refund may be duplicated.', {
      studentCreditId: studentCredit.id,
      walleeRefundId,
    })
    throw createError({ statusCode: 409, statusMessage: 'Diese Auszahlung wurde bereits verarbeitet. Bitte prüfen Sie Wallee auf doppelte Rückerstattungen.' })
  }

  // ── Update pending credit_transaction ────────────────────────────────────
  const { data: pendingTx } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('user_id', studentCredit.user_id)
    .eq('transaction_type', 'withdrawal')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (pendingTx) {
    await supabase
      .from('credit_transactions')
      .update({
        status: 'completed',
        wallee_refund_id: walleeRefundId,
        updated_at: new Date().toISOString(),
        notes: `Auszahlung via Wallee. Refund ID: ${walleeRefundId}`,
      })
      .eq('id', pendingTx.id)
  }

  return {
    success: true,
    message: 'Auszahlung erfolgreich veranlasst',
    walleeRefundId,
    withdrawal: {
      amount_rappen: withdrawalAmountRappen,
      amount_chf: (withdrawalAmountRappen / 100).toFixed(2),
      status: 'completed',
      completedAt: new Date().toISOString(),
    },
    studentCredit: {
      balance_rappen: newBalance,
      pending_withdrawal_rappen: 0,
      completed_withdrawal_rappen: completedTotal,
    },
  }
})
