// server/api/admin/fix-missing-payment-tokens.post.ts
// Endpoint zum nachträglichen Speichern von Payment Method Tokens für Payments ohne Token

import { getSupabase } from '~/utils/supabase'
import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  try {
    console.log('🔧 Fix: Checking for payments without saved payment methods...')

    const body = await readBody(event)
    const { paymentId, transactionId, userId, tenantId } = body

    const supabase = getSupabase()

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

    // Wenn spezifische Payment-ID übergeben wurde
    if (paymentId) {
      console.log(`🔍 Checking payment: ${paymentId}`)

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select(`
          id,
          wallee_transaction_id,
          user_id,
          tenant_id,
          payment_method_id,
          payment_status
        `)
        .eq('id', paymentId)
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

      // Versuche Token zu holen
      try {
        const transactionResponse = await transactionService.read(spaceId, parseInt(payment.wallee_transaction_id.toString()))
        const transaction: Wallee.model.Transaction = transactionResponse.body

        console.log('🔍 Wallee transaction details:', {
          id: transaction.id,
          state: transaction.state,
          customerId: transaction.customerId,
          paymentMethodToken: (transaction as any).paymentMethodToken
        })

        // Prüfe ob Tokenization aktiviert war (kann nicht mehr geändert werden)
        if (!transaction.customerId) {
          return {
            success: false,
            message: 'Transaction has no customerId - tokenization was likely not enabled',
            transactionState: transaction.state,
            customerId: null
          }
        }

        // Prüfe ob Token verfügbar ist
        const transactionAny = transaction as any
        let paymentMethodToken = transactionAny.paymentMethodToken

        if (!paymentMethodToken && transactionAny.metaData) {
          paymentMethodToken = transactionAny.metaData.paymentMethodToken || 
                             transactionAny.metaData.token || 
                             transactionAny.metaData.payment_token
        }

        if (!paymentMethodToken) {
          return {
            success: false,
            message: 'No payment method token found in Wallee transaction. Possible reasons: tokenization not enabled, payment not completed, or token not yet available.',
            transactionState: transaction.state,
            customerId: transaction.customerId,
            hasMetadata: !!transactionAny.metaData
          }
        }

        // Prüfe ob Token bereits gespeichert ist
        const { data: existingToken } = await supabase
          .from('customer_payment_methods')
          .select('id')
          .eq('wallee_token', paymentMethodToken)
          .eq('user_id', payment.user_id)
          .maybeSingle()

        if (existingToken) {
          // Update payment with payment_method_id
          await supabase
            .from('payments')
            .update({ payment_method_id: existingToken.id })
            .eq('id', payment.id)

          return {
            success: true,
            message: 'Token already exists, payment linked to existing token',
            tokenId: existingToken.id,
            paymentId: payment.id
          }
        }

        // Speichere neuen Token
        // Generiere pseudonyme Wallee Customer ID (wie in create-transaction): dt-<tenantId>-<userId>
        const walleeCustomerId = `dt-${payment.tenant_id}-${payment.user_id}`

        const { data: savedToken, error: saveError } = await supabase
          .from('customer_payment_methods')
          .insert({
            user_id: payment.user_id,
            tenant_id: payment.tenant_id,
            wallee_token: paymentMethodToken,
            wallee_customer_id: walleeCustomerId,
            display_name: 'Gespeicherte Karte',
            payment_method_type: null,
            metadata: {
              transaction_id: payment.wallee_transaction_id,
              saved_at: new Date().toISOString(),
              fixed_retroactively: true
            },
            is_active: true
          })
          .select()
          .single()

        if (saveError) throw saveError

        // Update payment with payment_method_id
        await supabase
          .from('payments')
          .update({ payment_method_id: savedToken.id })
          .eq('id', payment.id)

        console.log('✅ Payment method token saved retroactively:', savedToken.id)

        return {
          success: true,
          message: 'Payment method token saved successfully',
          tokenId: savedToken.id,
          paymentId: payment.id,
          walleeTransactionId: payment.wallee_transaction_id
        }

      } catch (walleeError: any) {
        console.error('❌ Error fetching transaction from Wallee:', walleeError)
        return {
          success: false,
          message: `Error fetching transaction from Wallee: ${walleeError.message}`,
          transactionId: payment.wallee_transaction_id
        }
      }
    }

    // Wenn Transaction-ID direkt übergeben wurde
    if (transactionId && userId && tenantId) {
      console.log(`🔍 Checking transaction: ${transactionId} for user: ${userId}`)

      try {
        const transactionResponse = await transactionService.read(spaceId, parseInt(transactionId.toString()))
        const transaction: Wallee.model.Transaction = transactionResponse.body

        const transactionAny = transaction as any
        let paymentMethodToken = transactionAny.paymentMethodToken

        if (!paymentMethodToken && transactionAny.metaData) {
          paymentMethodToken = transactionAny.metaData.paymentMethodToken || 
                             transactionAny.metaData.token || 
                             transactionAny.metaData.payment_token
        }

        if (!paymentMethodToken) {
          return {
            success: false,
            message: 'No payment method token found in Wallee transaction',
            transactionState: transaction.state,
            customerId: transaction.customerId
          }
        }

        // Speichere Token (gleiche Logik wie oben)
        // Generiere pseudonyme Wallee Customer ID für direkte Übergabe
        const walleeCustomerId = `dt-${tenantId}-${userId}`

        // Prüfe ob bereits vorhanden
        const { data: existingToken } = await supabase
          .from('customer_payment_methods')
          .select('id')
          .eq('wallee_token', paymentMethodToken)
          .eq('user_id', userId)
          .maybeSingle()

        if (existingToken) {
          return {
            success: true,
            message: 'Token already exists',
            tokenId: existingToken.id
          }
        }

        const { data: savedToken, error: saveError } = await supabase
          .from('customer_payment_methods')
          .insert({
            user_id: userId,
            tenant_id: tenantId,
            wallee_token: paymentMethodToken,
            wallee_customer_id: walleeCustomerId,
            display_name: 'Gespeicherte Karte',
            payment_method_type: null,
            metadata: {
              transaction_id: transactionId,
              saved_at: new Date().toISOString(),
              fixed_retroactively: true
            },
            is_active: true
          })
          .select()
          .single()

        if (saveError) throw saveError

        return {
          success: true,
          message: 'Payment method token saved successfully',
          tokenId: savedToken.id
        }

      } catch (error: any) {
        console.error('❌ Error:', error)
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to save token: ${error.message}`
        })
      }
    }

    throw createError({
      statusCode: 400,
      statusMessage: 'Either paymentId OR (transactionId + userId + tenantId) must be provided'
    })

  } catch (error: any) {
    console.error('❌ Error fixing missing payment tokens:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to fix missing payment tokens'
    })
  }
})

