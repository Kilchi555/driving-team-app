// server/api/wallee/capture-payment.post.ts
// Captured eine autorisierte Wallee Transaction (endgültige Abbuchung)

import { getSupabase } from '~/utils/supabase'
import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  try {
    console.log('💰 Capturing authorized payment...')
    
    const body = await readBody(event)
    const { paymentId, transactionId } = body

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

    if (payment.payment_status !== 'authorized') {
      throw createError({
        statusCode: 400,
        statusMessage: `Payment is not in authorized status (current: ${payment.payment_status})`
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

    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)

    // ✅ Capture transaction using processWithoutUserInteraction
    // This method processes the transaction without requiring user interaction
    console.log('📤 Capturing transaction:', transactionId)

    const processResponse = await transactionService.processWithoutUserInteraction(
      spaceId,
      parseInt(transactionId.toString())
    )
    
    const capturedTransaction = processResponse.body

    console.log('✅ Transaction captured:', {
      id: capturedTransaction.id,
      state: capturedTransaction.state
    })

    // Wait a moment for async processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check final state
    const statusResponse = await transactionService.read(spaceId, parseInt(transactionId.toString()))
    const finalTransaction = statusResponse.body

    console.log('📊 Final transaction state after capture:', finalTransaction.state)

    // ✅ Update payment status
    const isCompleted = finalTransaction.state === Wallee.model.TransactionState.SUCCESSFUL ||
                       finalTransaction.state === Wallee.model.TransactionState.FULFILL

    const updateData: any = {
      payment_status: isCompleted ? 'completed' : 'processing',
      wallee_transaction_state: finalTransaction.state,
      automatic_payment_processed: true,
      automatic_payment_processed_at: new Date().toISOString(),
      metadata: {
        ...(payment.metadata || {}),
        capture: {
          transaction_id: finalTransaction.id?.toString(),
          state: finalTransaction.state,
          captured_at: new Date().toISOString()
        }
      },
      updated_at: new Date().toISOString()
    }

    if (isCompleted) {
      updateData.paid_at = new Date().toISOString()
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

    // ✅ Update appointment if payment completed
    if (isCompleted && payment.appointment_id) {
      await supabase
        .from('appointments')
        .update({
          is_paid: true,
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.appointment_id)
    }

    return {
      success: true,
      transactionId: finalTransaction.id,
      state: finalTransaction.state,
      paymentStatus: updateData.payment_status,
      message: isCompleted 
        ? 'Payment captured and completed successfully' 
        : 'Payment capture initiated, processing...'
    }

  } catch (error: any) {
    console.error('❌ Error capturing payment:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to capture payment'
    })
  }
})

