// server/api/payments/mark-failed.post.ts
// Sichere API zum Markieren von fehlgeschlagenen Zahlungen

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseServerClient } from '~/server/utils/supabase-server'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    const supabase = getSupabaseServerClient(event)
    const body = await readBody(event)
    const { transactionId } = body

    if (!transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required field: transactionId'
      })
    }

    // ✅ Get auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // ✅ Get user data for tenant isolation
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User data not found'
      })
    }

    // ✅ Find payment by transaction ID (with tenant isolation via RLS)
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('id, payment_status, user_id, tenant_id')
      .eq('wallee_transaction_id', transactionId)
      .single()

    if (fetchError || !payment) {
      logger.warn('⚠️ Payment not found for transaction:', transactionId)
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found'
      })
    }

    // ✅ Verify user owns this payment (double-check even with RLS)
    if (payment.user_id !== userData.id || payment.tenant_id !== userData.tenant_id) {
      logger.warn('❌ Unauthorized access attempt:', {
        userId: userData.id,
        paymentUserId: payment.user_id,
        tenantId: userData.tenant_id,
        paymentTenantId: payment.tenant_id
      })
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    // ✅ Update payment status to failed
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        payment_status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id)

    if (updateError) {
      logger.error('❌ Error updating payment status:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update payment status'
      })
    }

    // ✅ Audit Log
    await logAudit({
      action: 'payment_marked_failed',
      user_id: userData.id,
      tenant_id: userData.tenant_id,
      resource_type: 'payment',
      resource_id: payment.id,
      status: 'success',
      details: {
        transaction_id: transactionId,
        previous_status: payment.payment_status,
        new_status: 'failed',
        duration_ms: Date.now() - startTime
      }
    })

    logger.debug('✅ Payment marked as failed:', payment.id)

    return {
      success: true,
      paymentId: payment.id,
      message: 'Payment marked as failed'
    }

  } catch (error: any) {
    logger.error('❌ Error in mark-failed API:', error)
    
    // Audit log for failure
    try {
      await logAudit({
        action: 'payment_mark_failed_error',
        status: 'failed',
        error_message: error.statusMessage || error.message,
        details: {
          duration_ms: Date.now() - startTime
        }
      })
    } catch (auditError) {
      logger.error('❌ Audit logging failed:', auditError)
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

