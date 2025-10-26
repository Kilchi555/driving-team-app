// server/api/wallee/create-recurring-transaction.post.ts
// ✅ WALLEE RECURRING PAYMENTS mit gespeicherten Zahlungsmethoden

import { Wallee } from 'wallee'

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
      failedUrl
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
    
    const config = {
      space_id: spaceId,
      user_id: userId,
      api_secret: apiSecret
    }
    
    // ✅ TRANSACTION SERVICE
    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
    
    // ✅ Konsistente Customer ID (gleiche wie bei erster Zahlung)
    const customerIdBase = customerEmail.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const consistentCustomerId = `dt-${customerIdBase}-${customerIdBase.length > 20 ? customerIdBase.substring(0, 20) : customerIdBase}`
    
    console.log('🔄 Recurring payment for customer:', {
      customerId: consistentCustomerId,
      customerEmail: customerEmail,
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
    transaction.tokenizationEnabled = true
    // transaction.customerPresence = Wallee.model.CustomerPresence.NOT_PRESENT // Entfernt - nicht verfügbar
    
    console.log('📤 Creating recurring transaction with saved payment methods...')
    
    // ✅ TRANSACTION ERSTELLEN
    const response = await transactionService.create(spaceId, transaction)
    const transactionCreate: Wallee.model.Transaction = response
    
    console.log('✅ Recurring transaction created:', {
      transactionId: transactionCreate.id,
      state: transactionCreate.state,
      customerId: transactionCreate.customerId
    })
    
    // ✅ PAYMENT PAGE URL generieren
    const paymentPageService: Wallee.api.PaymentPageService = new Wallee.api.PaymentPageService(config)
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
