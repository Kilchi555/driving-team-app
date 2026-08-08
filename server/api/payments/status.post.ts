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
    
    // ✅ Support paymentId and transactionId lookup.
    // Redirect URLs often pass our payment UUID as transaction_id — try id first,
    // then fall back to wallee_transaction_id.
    let payment: any = null
    let findError: any = null

    if (body.paymentId) {
      const res = await query.eq('id', body.paymentId).maybeSingle()
      payment = res.data
      findError = res.error
    } else if (body.transactionId) {
      const byId = await query.eq('id', body.transactionId).maybeSingle()
      if (byId.data) {
        payment = byId.data
      } else {
        // Rebuild query for wallee_transaction_id lookup
        let walleeQuery = supabase
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
          .eq('wallee_transaction_id', body.transactionId)
        const byWallee = await walleeQuery.maybeSingle()
        payment = byWallee.data
        findError = byWallee.error
      }
    }

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

    // 2. Status aktualisieren — never allow forging paid; clients may only release locks
    let statusMutated = false
    let appliedStatus: string | undefined
    if (body.status) {
      const role = authUser.role || ''
      const isPrivileged = ['admin', 'staff', 'super_admin', 'tenant_admin'].includes(role)

      if (body.status === 'completed' || body.status === 'authorized') {
        // Completions only via verified Wallee webhooks
        throw createError({
          statusCode: 403,
          statusMessage: 'Completed/authorized status may only be set by verified payment webhooks'
        })
      }

      if (!isPrivileged) {
        // After abort/failure redirect: sync with Wallee first — never blind-release
        // while Confirmed/open (that caused double charges historically).
        const wantsRelease = ['failed', 'cancelled', 'pending'].includes(body.status)
        if (!wantsRelease) {
          logger.warn('🚫 Ignoring client payment status mutation', {
            userId: userData.id,
            paymentId: payment.id,
            currentStatus: payment.payment_status,
            attemptedStatus: body.status
          })
        } else {
          const { syncAndResolvePayment } = await import('~/server/utils/wallee-payment-sync')
          const resolved = await syncAndResolvePayment({
            id: payment.id,
            tenant_id: payment.tenant_id,
            payment_status: payment.payment_status,
            wallee_transaction_id: payment.wallee_transaction_id,
            wallee_space_id: payment.wallee_space_id
          })

          if (resolved.changed && (resolved.decision === 'release_pending' || resolved.decision === 'no_transaction')) {
            statusMutated = true
            appliedStatus = 'pending'
            logger.info('🔓 Client sync released processing lock → pending', {
              paymentId: payment.id,
              walleeState: resolved.walleeState
            })
          } else if (resolved.changed && (resolved.decision === 'mark_completed' || resolved.decision === 'mark_authorized')) {
            statusMutated = true
            appliedStatus = resolved.newStatus
            logger.info('✅ Client sync found payment already paid', {
              paymentId: payment.id,
              newStatus: resolved.newStatus,
              walleeState: resolved.walleeState
            })
          } else {
            logger.info('⏳ Client sync kept payment open (no blind release)', {
              paymentId: payment.id,
              decision: resolved.decision,
              walleeState: resolved.walleeState
            })
          }

          if (statusMutated) {
            await logAudit({
              action: 'payment_processing_lock_synced',
              user_id: userData.id,
              tenant_id: userData.tenant_id,
              resource_type: 'payment',
              resource_id: payment.id,
              status: 'success',
              details: {
                previous_status: payment.payment_status,
                new_status: appliedStatus,
                decision: resolved.decision,
                wallee_state: resolved.walleeState,
                transaction_id: body.walleeTransactionId || body.transactionId,
                duration_ms: Date.now() - startTime
              }
            })
          }
        }
      } else {
        const updateData: any = {
          payment_status: body.status,
          updated_at: toLocalTimeString(new Date())
        }

        if (body.walleeTransactionId) {
          updateData.wallee_transaction_id = body.walleeTransactionId
        }

        if (body.walleeTransactionState) {
          updateData.wallee_transaction_state = body.walleeTransactionState
        }

        const { error: updateError } = await supabase
          .from('payments')
          .update(updateData)
          .eq('id', payment.id)

        if (updateError) {
          logger.error('❌ Error updating payment status:', updateError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to update payment status'
          })
        }

        statusMutated = true
        appliedStatus = body.status
        logger.debug('✅ Payment status updated to:', body.status)

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

    // 3. Status History — only when a mutation actually occurred
    if (statusMutated) {
      try {
        const { error: historyError } = await supabase
          .from('payment_status_history')
          .insert({
            payment_id: payment.id,
            status: appliedStatus || body.status,
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

    // 4. Aktualisierten Payment zurückgeben — always use resolved payment.id
    // (body.paymentId may be absent when looking up by transactionId)
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
      .eq('id', payment.id)
      .single()

    if (refetchError) throw refetchError

    return {
      success: true,
      payment: updatedPayment,
      message: statusMutated
        ? `Payment status updated to ${appliedStatus || body.status}`
        : 'Payment status retrieved'
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
