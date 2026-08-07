// server/api/payments/status.post.ts
// ✅ Payment Status API für Updates und Abfragen (mit Auth + Audit Logging)

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { toLocalTimeString } from '~/utils/dateUtils'
import { logger } from '~/utils/logger'
import { logAudit } from '~/server/utils/audit'

interface PaymentStatusRequest {
  paymentId?: string
  transactionId?: string // ✅ SECURITY FIX: Support transactionId lookup
  status?: string
  walleeTransactionId?: string
  walleeTransactionState?: string
}

interface PaymentStatusResponse {
  success: boolean
  payment?: any
  error?: string
  message?: string
}

export default defineEventHandler(async (event): Promise<PaymentStatusResponse> => {
  const startTime = Date.now()
  
  try {
    logger.debug('📊 Payment Status API called')
    
    const body = await readBody(event) as PaymentStatusRequest
    logger.debug('📨 Status request:', JSON.stringify(body, null, 2))
    
    if (!body.paymentId && !body.transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment ID or Transaction ID is required'
      })
    }

    const supabase = getSupabaseAdmin()
    
    // ✅ SECURITY: Get authenticated user — Bearer header with HTTP-only-cookie
    // fallback + token refresh, instead of a raw Bearer-only check that would
    // 401 whenever the client's access token had just expired.
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // ✅ Get user data for tenant isolation (already resolved by getAuthenticatedUser)
    const userData = authUser.db_user_id
      ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id }
      : null

    if (!userData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User data not found'
      })
    }
    
    // 1. Payment abrufen (mit tenant isolation via RLS)
    let query = supabase
      .from('payments')
      .select(`
        *,
        appointments (
          id,
          title,
          start_time,
          payment_status,
          is_paid
        ),
        users!payments_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
    
    // ✅ Support both paymentId and transactionId lookup
    if (body.paymentId) {
      query = query.eq('id', body.paymentId)
    } else if (body.transactionId) {
      query = query.eq('wallee_transaction_id', body.transactionId)
    }
    
    const { data: payment, error: findError } = await query.maybeSingle()

    if (findError || !payment) {
      logger.warn('⚠️ Payment not found:', body.paymentId || body.transactionId)
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found'
      })
    }

    // ✅ SECURITY: Verify user owns this payment
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

    logger.debug('✅ Payment found:', payment.id)

    // 2. Status aktualisieren — only staff/admin; never allow clients to mark paid
    if (body.status) {
      const role = authUser.role || ''
      if (!['admin', 'staff', 'super_admin', 'tenant_admin'].includes(role)) {
        // Clients may only poll status — ignore mutation attempts
        logger.warn('🚫 Ignoring client payment status mutation', {
          userId: userData.id,
          paymentId: payment.id,
          attemptedStatus: body.status
        })
      } else if (body.status === 'completed' || body.status === 'authorized') {
        // Even staff should not forge Wallee completions via this endpoint
        throw createError({
          statusCode: 403,
          statusMessage: 'Completed/authorized status may only be set by verified payment webhooks'
        })
      } else {
      const updateData: any = {
        payment_status: body.status,
        updated_at: toLocalTimeString(new Date())
      }

      // Wallee-spezifische Updates
      if (body.walleeTransactionId) {
        updateData.wallee_transaction_id = body.walleeTransactionId
      }
      
      if (body.walleeTransactionState) {
        updateData.wallee_transaction_state = body.walleeTransactionState
      }

      const { error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', body.paymentId)

      if (updateError) {
        logger.error('❌ Error updating payment status:', updateError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to update payment status'
        })
      }

      logger.debug('✅ Payment status updated to:', body.status)
      
      // ✅ AUDIT LOG for status change
      await logAudit({
        action: 'payment_status_updated',
        user_id: userData.id,
        tenant_id: userData.tenant_id,
        resource_type: 'payment',
        resource_id: payment.id,
        status: 'success',
        details: {
          previous_status: payment.payment_status,
          new_status: body.status,
          transaction_id: body.walleeTransactionId || body.transactionId,
          transaction_state: body.walleeTransactionState,
          duration_ms: Date.now() - startTime
        }
      })
      }
    }

    // 3. Status History — only when a privileged mutation actually occurred
    if (
      body.status &&
      ['admin', 'staff', 'super_admin', 'tenant_admin'].includes(authUser.role || '') &&
      body.status !== 'completed' &&
      body.status !== 'authorized'
    ) {
      try {
        const { error: historyError } = await supabase
          .from('payment_status_history')
          .insert({
            payment_id: payment.id,
            status: body.status,
            wallee_transaction_state: body.walleeTransactionState,
            metadata: {
              updated_at: new Date().toISOString(),
              wallee_transaction_id: body.walleeTransactionId
            },
            created_at: new Date().toISOString()
          })

        if (historyError) {
          console.warn('⚠️ Could not create status history (table may not exist):', historyError)
        }
      } catch (historyErr) {
        console.warn('⚠️ Status history table may not exist yet:', historyErr)
      }
    }

    // 4. Aktualisierten Payment zurückgeben
    const { data: updatedPayment, error: refetchError } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (
          id,
          title,
          start_time,
          payment_status,
          is_paid
        ),
        users!payments_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', body.paymentId)
      .single()

    if (refetchError) throw refetchError

    return {
      success: true,
      payment: updatedPayment,
      message: body.status ? `Payment status updated to ${body.status}` : 'Payment status retrieved'
    }

  } catch (error: any) {
    logger.error('❌ Payment status API error:', error)
    
    // ✅ AUDIT LOG for failure (if we have context)
    try {
      await logAudit({
        action: 'payment_status_update_failed',
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
      statusMessage: error.statusMessage || 'Payment status could not be updated'
    })
  }
})
