// server/api/wallee/create-recurring-transaction.post.ts
// ✅ WALLEE RECURRING PAYMENTS mit gespeicherten Zahlungsmethoden und Multi-Tenant Support

import { Wallee } from 'wallee'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'

export default defineEventHandler(async (event) => {
  console.log('🔄 Wallee Recurring Transaction Creation...')
  
  try {
    const body = await readBody(event)
    console.log('📨 Received recurring payment request:', body)
    
    const {
      orderId,
      amount,
      currency = 'CHF',
      customerEmail,
      customerName,
      description,
      successUrl,
      failedUrl,
      // Neu: pseudonyme IDs statt E-Mail-basiert
      userId: requestUserId,
      tenantId: requestTenantId
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
    console.log('🔧 Wallee Config for recurring payment:', { 
      spaceId: walleeConfig.spaceId, 
      userId: walleeConfig.userId,
      forTenant: requestTenantId
    })
    
    const config = getWalleeSDKConfig(walleeConfig.spaceId, walleeConfig.userId, walleeConfig.apiSecret)
    
    // ✅ TRANSACTION SERVICE
    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
    
    // ✅ Konsistente Customer ID (gleiche wie bei erster Zahlung) – pseudonym bevorzugt
    let consistentCustomerId: string
    if (requestTenantId && requestUserId) {
      consistentCustomerId = `dt-${requestTenantId}-${requestUserId}`
    } else {
      const customerIdBase = customerEmail.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      consistentCustomerId = `dt-${customerIdBase}-${customerIdBase.length > 20 ? customerIdBase.substring(0, 20) : customerIdBase}`
    }
    
    console.log('🔄 Recurring payment for customer:', {
      customerId: consistentCustomerId,
      emailPreview: customerEmail ? `${customerEmail.split('@')[0].slice(0,3)}***@***` : undefined,
      hasTenantId: !!requestTenantId,
      hasUserId: !!requestUserId,
      amount: amount
    })
    
    // ✅ LINE ITEM
    const lineItem: Wallee.model.LineItemCreate = new Wallee.model.LineItemCreate()
    lineItem.name = description || 'Driving Team Bestellung'
    lineItem.uniqueId = `recurring-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    lineItem.sku = 'driving-lesson'
    lineItem.quantity = 1
    lineItem.amountIncludingTax = amount
    lineItem.type = Wallee.model.LineItemType.PRODUCT
    
    // ✅ RECURRING TRANSACTION
    const transaction: Wallee.model.TransactionCreate = new Wallee.model.TransactionCreate()
    transaction.lineItems = [lineItem]
    transaction.autoConfirmationEnabled = true
    transaction.currency = currency
    transaction.customerId = consistentCustomerId // Gleiche Customer ID wie bei erster Zahlung
    transaction.merchantReference = `recurring-${orderId}-${Date.now()}`
    transaction.language = 'de-CH'
    transaction.customerEmailAddress = customerEmail
    
    // ✅ Für wiederkehrende Zahlungen - Wallee verwendet gespeicherte Zahlungsmethoden
    ;(transaction as any).tokenizationEnabled = true
    // transaction.customerPresence = Wallee.model.CustomerPresence.NOT_PRESENT // Entfernt - nicht verfügbar
    
    console.log('📤 Creating recurring transaction with saved payment methods...')
    
    // ✅ TRANSACTION ERSTELLEN
    const response = await transactionService.create(spaceId, transaction)
    const transactionCreate: Wallee.model.Transaction = (response as any).body || response
    
    console.log('✅ Recurring transaction created:', {
      transactionId: transactionCreate.id,
      state: transactionCreate.state,
      customerId: transactionCreate.customerId
    })
    
    // ✅ PAYMENT PAGE URL generieren
    const paymentPageService = new (Wallee.api as any).PaymentPageService(config)
    const paymentPageUrl = paymentPageService.paymentPageUrl(spaceId, transactionCreate.id!)
    
    console.log('🔗 Payment page URL generated:', paymentPageUrl)
    
    return {
      success: true,
      transactionId: transactionCreate.id,
      paymentUrl: paymentPageUrl,
      customerId: consistentCustomerId,
      message: 'Recurring transaction created with saved payment methods'
    }
    
  } catch (error: any) {
    console.error('❌ Recurring transaction creation failed:', {
      message: error.message,
      statusCode: error.statusCode,
      data: error.data
    })
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Recurring transaction creation failed'
    })
  }
})
