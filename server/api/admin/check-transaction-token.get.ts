// server/api/admin/check-transaction-token.get.ts
// Prüft ob eine Wallee Transaction Tokenization aktiviert hat und ob ein Token verfügbar ist

import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const transactionId = query.transactionId as string

    if (!transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'transactionId query parameter is required'
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

    // ✅ Hole Transaction von Wallee
    const transactionResponse = await transactionService.read(spaceId, parseInt(transactionId))
    const transaction: Wallee.model.Transaction = transactionResponse.body

    const transactionAny = transaction as any

    // ✅ Prüfe alle relevanten Felder
    const result = {
      transactionId: transaction.id,
      state: transaction.state,
      merchantReference: transaction.merchantReference,
      
      // Tokenization-Checks
      hasCustomerId: !!transaction.customerId,
      customerId: transaction.customerId,
      tokenizationEnabled: transactionAny.tokenizationEnabled !== undefined ? transactionAny.tokenizationEnabled : null,
      
      // Token-Checks
      hasPaymentMethodToken: !!transactionAny.paymentMethodToken,
      paymentMethodToken: transactionAny.paymentMethodToken || null,
      paymentMethodTokenPreview: transactionAny.paymentMethodToken 
        ? transactionAny.paymentMethodToken.substring(0, 20) + '...' 
        : null,
      
      // Metadata-Checks
      hasMetadata: !!transactionAny.metaData,
      metadataKeys: transactionAny.metaData ? Object.keys(transactionAny.metaData) : [],
      tokenInMetadata: transactionAny.metaData 
        ? !!(transactionAny.metaData.paymentMethodToken || transactionAny.metaData.token || transactionAny.metaData.payment_token)
        : false,
      
      // Payment Connector Info
      paymentConnectorConfiguration: transaction.paymentConnectorConfiguration 
        ? {
            id: transaction.paymentConnectorConfiguration.id,
            name: transaction.paymentConnectorConfiguration.name,
            paymentMethod: transaction.paymentConnectorConfiguration.paymentMethod
          }
        : null,
      
      // Full Transaction Object (für Debug)
      fullTransaction: {
        id: transaction.id,
        state: transaction.state,
        customerId: transaction.customerId,
        merchantReference: transaction.merchantReference,
        // Nur relevante Felder, nicht alles (zu groß)
        paymentMethodToken: transactionAny.paymentMethodToken,
        tokenizationEnabled: transactionAny.tokenizationEnabled,
        metaData: transactionAny.metaData
      },
      
      // Diagnose
      diagnosis: {
        tokenizationWasEnabled: !!transaction.customerId,
        tokenShouldBeAvailable: transaction.state === 'SUCCESSFUL' || transaction.state === 'FULFILL',
        tokenIsAvailable: !!transactionAny.paymentMethodToken || 
                         (transactionAny.metaData && (
                           transactionAny.metaData.paymentMethodToken || 
                           transactionAny.metaData.token || 
                           transactionAny.metaData.payment_token
                         )),
        canBeSaved: false as boolean
      }
    }

    // ✅ Berechne ob Token gespeichert werden kann
    result.diagnosis.canBeSaved = 
      result.diagnosis.tokenizationWasEnabled && 
      result.diagnosis.tokenShouldBeAvailable && 
      result.diagnosis.tokenIsAvailable

    return result

  } catch (error: any) {
    console.error('❌ Error checking transaction token:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to check transaction token'
    })
  }
})

