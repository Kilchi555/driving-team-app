// server/api/wallee/capture-payment.post.ts
// Führt die finale Abbuchung einer AUTHORIZED Transaktion durch
// Wird vom Cron-Job 24h vor dem Termin aufgerufen

import { Wallee } from 'wallee'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  console.log('💰 Wallee Capture Payment...')
  
  try {
    const body = await readBody(event)
    const { transactionId, paymentId } = body

    if (!transactionId && !paymentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either transactionId or paymentId is required'
      })
    }

    const supabase = getSupabaseAdmin()
    let walleeTransactionId: string

    // Hole Transaction ID aus Payment wenn nur paymentId gegeben
    if (paymentId && !transactionId) {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('wallee_transaction_id')
        .eq('id', paymentId)
        .single()

      if (error || !payment?.wallee_transaction_id) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Payment not found or has no transaction ID'
        })
      }

      walleeTransactionId = payment.wallee_transaction_id
    } else {
      walleeTransactionId = transactionId
    }

    console.log('🔍 Capturing transaction:', walleeTransactionId)

    // ✅ WALLEE SDK KONFIGURATION
    const spaceId: number = parseInt(process.env.WALLEE_SPACE_ID || '82592')
    const userId: number = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    const apiSecret: string = process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
    
    const config = {
      space_id: spaceId,
      user_id: userId,
      api_secret: apiSecret
    }

    // ✅ Hole Transaction von Wallee
    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
    const transactionResponse = await transactionService.read(spaceId, parseInt(walleeTransactionId))
    const transaction: any = transactionResponse.body

    console.log('📋 Transaction state:', transaction.state)

    // Prüfe ob Transaction im richtigen State ist
    if (transaction.state !== 'AUTHORIZED') {
      throw createError({
        statusCode: 400,
        statusMessage: `Transaction is not authorized (current state: ${transaction.state})`
      })
    }

    // ✅ Erstelle Completion (Capture)
    const transactionCompletionService: Wallee.api.TransactionCompletionService = 
      new Wallee.api.TransactionCompletionService(config)

    const completionResponse = await transactionCompletionService.completeOnline(
      spaceId,
      parseInt(walleeTransactionId)
    )
    const completion: any = completionResponse.body

    console.log('✅ Transaction captured:', {
      id: completion.id,
      state: completion.state
    })

    // ✅ Update Payment in DB
    if (paymentId) {
      await supabase
        .from('payments')
        .update({
          payment_status: 'completed',
          paid_at: new Date().toISOString(),
          automatic_payment_processed: true,
          automatic_payment_processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)

      console.log('✅ Payment marked as completed')
    }

    return {
      success: true,
      transactionId: walleeTransactionId,
      completionId: completion.id,
      state: completion.state,
      message: 'Payment captured successfully'
    }
    
  } catch (error: any) {
    console.error('❌ Capture failed:', {
      message: error.message,
      statusCode: error.statusCode,
      body: error.body
    })
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Capture failed'
    })
  }
})
