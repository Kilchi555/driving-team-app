// server/api/admin/sync-wallee-payment.post.ts
// Admin-Endpoint zum manuellen Synchronisieren eines Wallee-Payments

import { getSupabaseAdmin } from '~/utils/supabase'
import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  try {
    console.log('🔄 Manual Wallee payment sync requested...')
    
    const body = await readBody(event)
    const { paymentId, transactionId } = body

    if (!paymentId && !transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either paymentId or transactionId is required'
      })
    }

    const supabase = getSupabaseAdmin()

    // ✅ WALLEE SDK KONFIGURATION
    const spaceId: number = parseInt(process.env.WALLEE_SPACE_ID || '82592')
    const userId: number = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    const apiSecret: string = process.env.WALLEE_SECRET_KEY || (() => { throw new Error('WALLEE_SECRET_KEY is required') })()
    
    const config = {
      space_id: spaceId,
      user_id: userId,
      api_secret: apiSecret
    }

    let payment: any
    let walleeTransactionId: string

    // Hole Payment aus DB wenn paymentId gegeben
    if (paymentId) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single()

      if (error || !data) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Payment not found'
        })
      }

      payment = data
      walleeTransactionId = payment.wallee_transaction_id

      if (!walleeTransactionId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Payment has no Wallee transaction ID'
        })
      }
    } else {
      walleeTransactionId = transactionId
    }

    console.log('🔍 Fetching transaction from Wallee:', walleeTransactionId)

    // Hole Transaction von Wallee
    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
    const transactionResponse = await transactionService.read(spaceId, parseInt(walleeTransactionId))
    const walleeTransaction = transactionResponse.body

    console.log('📋 Wallee transaction state:', (walleeTransaction as any).state)

    // Map Wallee state to our payment status
    const statusMapping: Record<string, string> = {
      'PENDING': 'pending',
      'CONFIRMED': 'processing',
      'PROCESSING': 'processing',
      'SUCCESSFUL': 'completed',
      'FAILED': 'failed',
      'CANCELED': 'cancelled',
      'DECLINE': 'failed',
      'FULFILL': 'completed',
      'VOIDED': 'cancelled'
    }

    const walleeState = (walleeTransaction as any).state
    const paymentStatus = statusMapping[walleeState] || 'pending'

    console.log(`🔄 Mapping Wallee state "${walleeState}" to payment status "${paymentStatus}"`)

    // Update payment in DB
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    }

    if (paymentStatus === 'completed') {
      updateData.paid_at = new Date().toISOString()
    }

    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('wallee_transaction_id', walleeTransactionId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating payment:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update payment'
      })
    }

    console.log('✅ Payment updated:', updatedPayment.id)

    // Update appointment if payment completed
    if (paymentStatus === 'completed' && updatedPayment.appointment_id) {
      await supabase
        .from('appointments')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedPayment.appointment_id)

      console.log('✅ Appointment confirmed')
    }

    // Sync payment methods if payment completed
    if (paymentStatus === 'completed' && updatedPayment.user_id && updatedPayment.tenant_id) {
      try {
        const syncResult = await $fetch('/api/wallee/sync-payment-methods', {
          method: 'POST',
          body: {
            userId: updatedPayment.user_id,
            tenantId: updatedPayment.tenant_id,
            transactionId: walleeTransactionId
          }
        })
        console.log('✅ Payment methods synced:', syncResult)
      } catch (syncError: any) {
        console.warn('⚠️ Could not sync payment methods:', syncError.message)
      }
    }

    return {
      success: true,
      message: 'Payment synchronized successfully',
      payment: updatedPayment,
      walleeState,
      paymentStatus
    }

  } catch (error: any) {
    console.error('❌ Error syncing payment:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to sync payment'
    })
  }
})
