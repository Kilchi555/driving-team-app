// server/api/wallee/create-transaction.post.ts
// ✅ OFFIZIELLES WALLEE SDK

import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  console.log('🚀 Wallee Transaction Creation (SDK)...')
  
  try {
    const body = await readBody(event)
    console.log('📨 Received body:', body)
    
    const {
      orderId,
      amount,
      currency = 'CHF',
      customerEmail,
      customerName,
      description,
      successUrl,
      failedUrl,
      // Optional: restrict shown payment methods on Wallee payment page
      allowedPaymentMethodConfigurationIds
    } = body

    // Validierung der erforderlichen Felder
    if (!orderId || !amount || !customerEmail) {
      console.error('❌ Missing required fields:', { orderId, amount, customerEmail })
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: orderId, amount, customerEmail'
      })
    }

    // ✅ WALLEE SDK KONFIGURATION
    const spaceId: number = parseInt(process.env.WALLEE_SPACE_ID || '82592')
    const userId: number = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    const apiSecret: string = process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
    
    console.log('🔧 SDK Config:', { spaceId, userId, apiSecretPreview: apiSecret.substring(0, 10) + '...' })
    
    // ✅ SDK KONFIGURATION
    const config = {
      space_id: spaceId,
      user_id: userId,
      api_secret: apiSecret
    }
    
    // ✅ TRANSACTION SERVICE mit SDK
    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
    
    // ✅ Debug: Log amount to check if it's in CHF or Rappen
    console.log('💰 Amount received:', { 
      amount: amount,
      type: typeof amount,
      inCHF: (amount / 100).toFixed(2) + ' CHF (if in Rappen)',
      inRappen: (amount * 100) + ' Rappen (if in CHF)'
    })
    
    // ✅ Generate short uniqueId (max 200 chars, Wallee requirement)
    // Use timestamp + short hash instead of full orderId
    const shortUniqueId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    console.log('🔑 UniqueId generated:', { 
      orderId: orderId,
      orderIdLength: orderId.length,
      shortUniqueId: shortUniqueId,
      shortUniqueIdLength: shortUniqueId.length
    })
    
    // ✅ LINE ITEM für echte Appointments
    const lineItem: Wallee.model.LineItemCreate = new Wallee.model.LineItemCreate()
    lineItem.name = description || 'Driving Team Bestellung'
    lineItem.uniqueId = shortUniqueId // Use short ID (under 200 chars)
    lineItem.sku = 'driving-lesson'
    lineItem.quantity = 1
    lineItem.amountIncludingTax = amount // Keep as is for now to see actual value
    lineItem.type = Wallee.model.LineItemType.PRODUCT
    
    // ✅ Generate consistent customer ID for Wallee tokenization
    // Use email as base for consistent customer ID (Wallee will tokenize payment methods per customer)
    const customerIdBase = customerEmail.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const shortCustomerId = `dt-${customerIdBase}-${customerIdBase.length > 20 ? customerIdBase.substring(0, 20) : customerIdBase}`
    
    // Generate unique merchant reference for this transaction
    const timestamp = Date.now()
    const shortMerchantRef = `order-${timestamp}-${Math.random().toString(36).substr(2, 9)}`
    
    console.log('🔑 Transaction IDs generated:', { 
      customerId: shortCustomerId,
      customerIdLength: shortCustomerId.length,
      customerEmail: customerEmail,
      merchantReference: shortMerchantRef,
      merchantReferenceLength: shortMerchantRef.length
    })
    
    // ✅ TRANSACTION mit Tokenisierung für Wallee
    const transaction: Wallee.model.TransactionCreate = new Wallee.model.TransactionCreate()
    transaction.lineItems = [lineItem]
    transaction.autoConfirmationEnabled = true
    transaction.currency = currency
    transaction.customerId = shortCustomerId // Konsistente Customer ID für Tokenisierung
    transaction.merchantReference = shortMerchantRef
    transaction.language = 'de-CH'
    transaction.customerEmailAddress = customerEmail
    
    // ✅ Tokenisierung aktivieren - Wallee speichert Zahlungsmethoden automatisch
    transaction.tokenizationEnabled = true
    // transaction.customerPresence = Wallee.model.CustomerPresence.NOT_PRESENT // Entfernt - nicht verfügbar
    
    // Keine Adresse - testen ob das das Problem löst
    
    // ✅ Optional: Limit to specific payment method configurations (e.g., Visa, TWINT)
    if (Array.isArray(allowedPaymentMethodConfigurationIds) && allowedPaymentMethodConfigurationIds.length > 0) {
      // Wallee expects an array of numeric IDs
      try {
        transaction.allowedPaymentMethodConfigurations = allowedPaymentMethodConfigurationIds.map((id: any) => Number(id)).filter((n: number) => Number.isFinite(n))
        console.log('🧩 Restricting to payment method configuration IDs:', transaction.allowedPaymentMethodConfigurations)
      } catch (e) {
        console.warn('⚠️ Could not set allowedPaymentMethodConfigurations:', e)
      }
    }
    
    // ✅ OPTIONALE FELDER
    if (successUrl) {
      transaction.successUrl = successUrl
    }
    if (failedUrl) {
      transaction.failedUrl = failedUrl
    }
    
    console.log('📤 SDK Transaction Data:', JSON.stringify(transaction, null, 2))
    
    // ✅ SDK TRANSACTION CREATE
    let response
    try {
      response = await transactionService.create(spaceId, transaction)
    } catch (createError: any) {
      console.error('❌ Transaction Service create() failed:', {
        error: createError,
        errorType: typeof createError,
        errorKeys: createError ? Object.keys(createError) : [],
        errorString: String(createError),
        errorJSON: JSON.stringify(createError, Object.getOwnPropertyNames(createError), 2)
      })
      throw createError
    }
    
    const transactionCreate: Wallee.model.Transaction = response.body
    
    console.log('✅ SDK Transaction SUCCESS:', {
      id: transactionCreate.id,
      state: transactionCreate.state,
      currency: transactionCreate.currency
    })
    
    // ✅ PAYMENT PAGE URL generieren
    const paymentPageService: Wallee.api.TransactionPaymentPageService = new Wallee.api.TransactionPaymentPageService(config)
    const paymentPageResponse = await paymentPageService.paymentPageUrl(spaceId, transactionCreate.id as number)
    const paymentPageUrl = paymentPageResponse.body
    
    console.log('✅ Payment Page URL generated:', paymentPageUrl)
    
    return {
      success: true,
      transactionId: transactionCreate.id,
      paymentUrl: paymentPageUrl,
      transaction: {
        id: transactionCreate.id,
        state: transactionCreate.state,
        currency: transactionCreate.currency
      },
      message: 'Transaction created successfully with Wallee SDK!'
    }
    
  } catch (error: any) {
    console.error('❌ SDK Transaction FAILED:', {
      message: error.message,
      statusCode: error.statusCode,
      errorType: error.errorType,
      body: error.body,
      // Don't try to stringify response (circular structure)
    })
    
    // Extract more detailed error message if available
    let detailedMessage = 'SDK Transaction creation failed'
    if (error.body?.message) {
      detailedMessage = error.body.message
    } else if (error.message) {
      detailedMessage = error.message
    }
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: detailedMessage
    })
  }
})