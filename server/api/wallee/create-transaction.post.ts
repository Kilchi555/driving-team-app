// server/api/wallee/create-transaction.post.ts
// ✅ OFFIZIELLES WALLEE SDK mit Multi-Tenant Support

import { Wallee } from 'wallee'
import { buildMerchantReference } from '~/utils/merchantReference'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'

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
      allowedPaymentMethodConfigurationIds,
      // Optional: Flag für Tokenization-only (wird später automatisch storniert)
      isTokenizationOnly,
      // Neu: pseudonyme IDs statt E-Mail-basiert
      userId: requestUserId,
      tenantId: requestTenantId,
      merchantReferenceDetails
    } = body

    // Validierung der erforderlichen Felder
    if (!orderId || !amount || !customerEmail) {
      console.error('❌ Missing required fields:', { orderId, amount, customerEmail })
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: orderId, amount, customerEmail'
      })
    }

    // ✅ GET WALLEE CONFIG FOR TENANT (with fallback to env variables)
    const walleeConfig = await getWalleeConfigForTenant(requestTenantId)
    console.log('🔧 SDK Config:', { 
      spaceId: walleeConfig.spaceId, 
      userId: walleeConfig.userId, 
      apiSecretPreview: walleeConfig.apiSecret.substring(0, 10) + '...',
      forTenant: requestTenantId
    })
    
    // ✅ SDK KONFIGURATION
    const config = getWalleeSDKConfig(walleeConfig.spaceId, walleeConfig.userId, walleeConfig.apiSecret)
    
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
    
    // ✅ Generate consistent customer ID for Wallee tokenization (pseudonymous)
    // Preferred: dt-<tenantId>-<userId>; Fallback: legacy email-based ID for backward compatibility
    let shortCustomerId: string
    if (requestTenantId && requestUserId) {
      shortCustomerId = `dt-${requestTenantId}-${requestUserId}`
    } else {
      const customerIdBase = customerEmail.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      shortCustomerId = `dt-${customerIdBase}-${customerIdBase.length > 20 ? customerIdBase.substring(0, 20) : customerIdBase}`
    }
    
    // Generate unique merchant reference for this transaction
    const timestamp = Date.now()
    const fallbackMerchantRef = `order-${timestamp}-${Math.random().toString(36).substr(2, 9)}`
    const shortMerchantRef = buildMerchantReference({
      ...(merchantReferenceDetails || {}),
      fallback: fallbackMerchantRef
    })
    
    console.log('🔑 Transaction IDs generated:', { 
      customerId: shortCustomerId,
      customerIdLength: shortCustomerId.length,
      emailPreview: customerEmail ? `${customerEmail.split('@')[0].slice(0,3)}***@***` : undefined,
      hasTenantId: !!requestTenantId,
      hasUserId: !!requestUserId,
      merchantReference: shortMerchantRef,
      merchantReferenceLength: shortMerchantRef.length
    })
    
    // ✅ LADE VERFÜGBARE ZAHLUNGSMETHODEN VON WALLEE
    // Wenn keine Zahlungsmethoden im Space aktiviert sind, bekommt man "Keine geeignete Zahlart"
    let availablePaymentMethodIds: number[] = []
    
    try {
      const paymentMethodService = new Wallee.api.PaymentMethodConfigurationService(config)
      const paymentMethodsResponse = await (paymentMethodService as any).readAll(spaceId)
      
      if (paymentMethodsResponse.body && Array.isArray(paymentMethodsResponse.body)) {
        // Filtere nur aktive Zahlungsmethoden
        const activePaymentMethods = paymentMethodsResponse.body.filter((pm: any) => pm.state === 'ACTIVE')
        availablePaymentMethodIds = activePaymentMethods.map((pm: any) => pm.id as number)
        
        console.log('💳 Available payment methods in Space:', {
          total: paymentMethodsResponse.body.length,
          active: activePaymentMethods.length,
          ids: availablePaymentMethodIds,
          names: activePaymentMethods.map((pm: any) => ({ id: pm.id, name: pm.name, method: pm.paymentMethod }))
        })
      }
    } catch (pmError: any) {
      console.warn('⚠️ Could not fetch payment methods from Wallee:', pmError.message)
      // Continue without restricting payment methods - let Wallee show all available
    }
    
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
    ;(transaction as any).tokenizationEnabled = true
    
    // ✅ Für Tokenization-only: Speichere Flag in Metadata für spätere automatische Stornierung
    if (isTokenizationOnly) {
      transaction.metaData = {
        ...(transaction.metaData || {}),
        isTokenizationOnly: 'true',
        tokenizationPurpose: 'payment_method_storage'
      }
      console.log('🔑 Tokenization-only transaction flagged for auto-refund')
    }
    
    // ✅ SETZE VERFÜGBARE ZAHLUNGSMETHODEN
    // Wenn explizite IDs übergeben wurden, verwende diese
    if (Array.isArray(allowedPaymentMethodConfigurationIds) && allowedPaymentMethodConfigurationIds.length > 0) {
      try {
        transaction.allowedPaymentMethodConfigurations = allowedPaymentMethodConfigurationIds.map((id: any) => Number(id)).filter((n: number) => Number.isFinite(n))
        console.log('🧩 Using provided payment method configuration IDs:', transaction.allowedPaymentMethodConfigurations)
      } catch (e) {
        console.warn('⚠️ Could not set provided allowedPaymentMethodConfigurations:', e)
      }
    } 
    // Sonst: Verwende alle verfügbaren aktiven Zahlungsmethoden aus dem Space
    else if (availablePaymentMethodIds.length > 0) {
      transaction.allowedPaymentMethodConfigurations = availablePaymentMethodIds
      console.log('💳 Using all available active payment methods from Space:', transaction.allowedPaymentMethodConfigurations)
    } else {
      console.warn('⚠️ No payment methods found in Space - Wallee will show error "Keine geeignete Zahlart"')
      console.warn('⚠️ Lösung: Aktiviere Zahlungsmethoden im Wallee Dashboard unter Space → Payment Methods')
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