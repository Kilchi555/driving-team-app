// server/api/admin/sync-wallee-payment.post.ts
// Admin endpoint to manually sync payment status from Wallee

import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as { paymentId: string }
    
    if (!body.paymentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment ID is required'
      })
    }

    const supabase = getSupabase()
    
    // Load payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, wallee_transaction_id, payment_status, appointment_id')
      .eq('id', body.paymentId)
      .single()

    if (paymentError || !payment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found'
      })
    }

    if (!payment.wallee_transaction_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment has no Wallee transaction ID'
      })
    }

    // Fetch transaction status from Wallee
    const spaceId = parseInt(process.env.WALLEE_SPACE_ID || '82592')
    const userId = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    const apiSecret = process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
    
    const config = {
      space_id: spaceId,
      user_id: userId,
      api_secret: apiSecret
    }

    const WalleeModule = await import('wallee')
    const Wallee = WalleeModule.default || WalleeModule.Wallee || WalleeModule
    const transactionService = new (Wallee as any).api.TransactionService(config)
    
    const transactionId = parseInt(payment.wallee_transaction_id)
    const transactionResponse = await transactionService.read(spaceId, transactionId)
    const walleeTransaction = transactionResponse.body

    console.log('📋 Wallee transaction status:', {
      id: walleeTransaction.id,
      state: walleeTransaction.state,
      paymentStatus: payment.payment_status
    })

    // Map Wallee state to payment status
    const statusMapping: Record<string, string> = {
      'PENDING': 'pending',
      'CONFIRMED': 'processing',
      'PROCESSING': 'processing',
      'SUCCESSFUL': 'completed',
      'FAILED': 'failed',
      'CANCELED': 'cancelled',
      'DECLINE': 'failed',
      'FULFILL': 'completed'
    }

    const walleeState = walleeTransaction.state as string
    const paymentStatus = statusMapping[walleeState] || 'pending'

    // Update payment
    const updateData: any = {
      payment_status: paymentStatus,
      wallee_transaction_state: walleeState,
      updated_at: new Date().toISOString()
    }

    if (paymentStatus === 'completed') {
      updateData.paid_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', body.paymentId)

    if (updateError) {
      console.error('❌ Error updating payment:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update payment: ' + updateError.message
      })
    }

    // Update appointment if payment completed
    if (paymentStatus === 'completed' && payment.appointment_id) {
      await supabase
        .from('appointments')
        .update({
          payment_status: 'paid',
          is_paid: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.appointment_id)
    }

    return {
      success: true,
      paymentId: body.paymentId,
      walleeState,
      paymentStatus,
      message: `Payment status updated from "${payment.payment_status}" to "${paymentStatus}"`
    }

  } catch (error: any) {
    console.error('❌ Error syncing Wallee payment:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to sync payment'
    })
  }
})

