// server/api/wallee/void-payment.post.ts
// Storniert eine autorisierte Wallee Transaction (provisorische Belastung wird zurückgegeben)

import { getSupabase } from '~/utils/supabase'
import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  try {
    console.log('🔙 Voiding authorized payment...')
    
    const body = await readBody(event)
    const { paymentId, transactionId, reason } = body

    if (!paymentId || !transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: paymentId, transactionId'
      })
    }

    const supabase = getSupabase()

    // ✅ Load payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, appointment_id, payment_status, wallee_transaction_state')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found'
      })
    }

    // ✅ WALLEE SDK KONFIGURATION
    const spaceId: number = parseInt(process.env.WALLEE_SPACE_ID || '82592')
    const userIdWallee: number = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    const apiSecret: string = process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
    
    const config = {
      space_id: spaceId,
      user_id: userIdWallee,
      api_secret: apiSecret
    }

    const voidService: Wallee.api.TransactionVoidService = new Wallee.api.TransactionVoidService(config)

    // ✅ Void the authorized transaction
    console.log('📤 Voiding transaction:', transactionId)

    const voidResponse = await voidService.voidOnline(
      spaceId,
      parseInt(transactionId.toString())
    )
    
    const voidedTransaction = voidResponse.body

    console.log('✅ Transaction voided:', {
      id: voidedTransaction.id,
      state: voidedTransaction.state
    })

    // ✅ Update payment status
    const updateData: any = {
      payment_status: 'voided',
      wallee_transaction_state: voidedTransaction.state,
      refunded_at: new Date().toISOString(),
      metadata: {
        ...(payment.metadata || {}),
        void: {
          transaction_id: voidedTransaction.id?.toString(),
          state: voidedTransaction.state,
          voided_at: new Date().toISOString(),
          reason: reason || 'Appointment cancelled more than 24h before start'
        }
      },
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update payment: ' + updateError.message
      })
    }

    return {
      success: true,
      transactionId: voidedTransaction.id,
      state: voidedTransaction.state,
      message: 'Payment voided successfully (provisional charge released)'
    }

  } catch (error: any) {
    console.error('❌ Error voiding payment:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to void payment'
    })
  }
})

