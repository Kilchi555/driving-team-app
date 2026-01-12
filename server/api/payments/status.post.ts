// server/api/payments/status.post.ts
// ✅ Payment Status API für Updates und Abfragen (mit Auth + Audit Logging)

import { getSupabaseServerClient } from '~/server/utils/supabase-server'
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

    const supabase = getSupabaseServerClient(event)
    
    // ✅ SECURITY: Get authenticated user
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

    // 2. Status aktualisieren falls angegeben
    if (body.status) {
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

      // Completion timestamp setzen
      if (body.status === 'completed') {
        updateData.paid_at = toLocalTimeString(new Date())
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

    // 3. Appointment Status aktualisieren falls Payment completed
    if (body.status === 'completed' && payment.appointment_id) {
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          payment_status: 'paid',
          is_paid: true,
          updated_at: toLocalTimeString(new Date())
        })
        .eq('id', payment.appointment_id)

      if (appointmentError) {
        console.warn('⚠️ Could not update appointment:', appointmentError)
      } else {
        logger.debug('✅ Appointment marked as paid')
      }
    }

    // 4. Status History erstellen (optional)
    if (body.status) {
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

    // 5. Aktualisierten Payment zurückgeben
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
