// server/api/wallee/void-payment.post.ts
// Storniert eine AUTHORIZED Transaktion (gibt die Reservierung frei)
// Wird aufgerufen, wenn ein Termin mehr als 24h vor Start abgesagt wird

import { Wallee } from 'wallee'
import { getSupabaseAdmin } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

export default defineEventHandler(async (event) => {
  console.log('🚫 Wallee Void Payment...')
  
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

    console.log('🔍 Voiding transaction:', walleeTransactionId)

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
      console.warn(`⚠️ Transaction is not authorized (current state: ${transaction.state}) - skipping void`)
      return {
        success: false,
        message: `Transaction cannot be voided (current state: ${transaction.state})`,
        transactionId: walleeTransactionId
      }
    }

    // ✅ Erstelle Void
    const transactionVoidService: Wallee.api.TransactionVoidService = 
      new Wallee.api.TransactionVoidService(config)

    const voidResponse = await transactionVoidService.voidOnline(
      spaceId,
      parseInt(walleeTransactionId)
    )
    const voidResult: any = voidResponse.body

    console.log('✅ Transaction voided:', {
      id: voidResult.id,
      state: voidResult.state
    })

    // ✅ Update Payment in DB
    if (paymentId) {
      await supabase
        .from('payments')
        .update({
          payment_status: 'cancelled',
          updated_at: toLocalTimeString(new Date())
        })
        .eq('id', paymentId)

      console.log('✅ Payment marked as cancelled')
    }

    return {
      success: true,
      transactionId: walleeTransactionId,
      voidId: voidResult.id,
      state: voidResult.state,
      message: 'Payment voided successfully'
    }
    
  } catch (error: any) {
    console.error('❌ Void failed:', {
      message: error.message,
      statusCode: error.statusCode,
      body: error.body
    })
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Void failed'
    })
  }
})
