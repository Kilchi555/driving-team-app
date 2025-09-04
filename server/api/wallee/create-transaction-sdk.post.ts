import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  console.log('🚀 Wallee SDK Transaction Creation...')
  
  try {
    // ✅ WALLEE SDK KONFIGURATION (exakt wie Dokumentation)
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
    
    // ✅ LINE ITEM (exakt wie Dokumentation)
    const lineItem: Wallee.model.LineItemCreate = new Wallee.model.LineItemCreate()
    lineItem.name = 'Fahrstunde'
    lineItem.uniqueId = 'appointment-' + Date.now()
    lineItem.sku = 'driving-lesson'
    lineItem.quantity = 1
    lineItem.amountIncludingTax = 95.00
    lineItem.type = Wallee.model.LineItemType.PRODUCT
    
    // ✅ TRANSACTION (exakt wie Dokumentation)
    const transaction: Wallee.model.TransactionCreate = new Wallee.model.TransactionCreate()
    transaction.lineItems = [lineItem]
    transaction.autoConfirmationEnabled = true
    transaction.currency = 'CHF'
    transaction.customerId = 'test-customer-sdk'
    transaction.merchantReference = 'appointment-sdk-test'
    transaction.language = 'de-CH'
    transaction.customerEmailAddress = 'test@drivingteam.ch'
    
    console.log('📤 SDK Transaction Data:', JSON.stringify(transaction, null, 2))
    
    // ✅ SDK TRANSACTION CREATE
    const response = await transactionService.create(spaceId, transaction)
    const transactionCreate: Wallee.model.Transaction = response.body
    
    console.log('✅ SDK Transaction SUCCESS:', {
      id: transactionCreate.id,
      state: transactionCreate.state,
      amount: transactionCreate.amount
    })
    
    return {
      success: true,
      transaction: {
        id: transactionCreate.id,
        state: transactionCreate.state,
        amount: transactionCreate.amount,
        currency: transactionCreate.currency
      },
      message: 'Transaction created successfully with Wallee SDK!'
    }
    
  } catch (error: any) {
    console.error('❌ SDK Transaction FAILED:', {
      message: error.message,
      statusCode: error.statusCode,
      data: error.data
    })
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: 'SDK Transaction creation failed',
      data: {
        message: error.message,
        data: error.data
      }
    })
  }
})
