// server/api/wallee/test-auth.post.ts
// ✅ OFFIZIELLES WALLEE SDK

import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  console.log('🚀 Wallee SDK Auth Test...')
  
  try {
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
    
    // ✅ SPACE SERVICE mit SDK
    const spaceService: Wallee.api.SpaceService = new Wallee.api.SpaceService(config)
    
    // Test 1: Space API (um zu prüfen ob Space existiert)
    console.log('🔄 Test 1: Calling Space API with SDK...')
    
    try {
      const spaceResponse = await spaceService.read(spaceId)
      console.log('✅ Space API SUCCESS:', spaceResponse.body)
      
    } catch (spaceError: any) {
      console.error('❌ Space API FAILED:', {
        statusCode: spaceError.statusCode,
        message: spaceError.message,
        data: spaceError.data
      })
      
      if (spaceError.statusCode === 401) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Authentication failed - Invalid credentials'
        })
      }
      
      throw spaceError
    }

    // Test 2: Application User API (um zu prüfen ob User existiert)
    console.log('🔄 Test 2: Calling Application User API with SDK...')
    
    try {
      const userService: Wallee.api.ApplicationUserService = new Wallee.api.ApplicationUserService(config)
      const userResponse = await userService.read(spaceId, userId)
      console.log('✅ Application User API SUCCESS:', userResponse.body)
      
    } catch (userError: any) {
      console.error('❌ Application User API FAILED:', {
        statusCode: userError.statusCode,
        message: userError.message,
        data: userError.data
      })
      
      if (userError.statusCode === 404) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Application User not found - Check User ID'
        })
      }
      
      throw userError
    }

    // Test 3: Transaction API (ohne echte Transaction)
    console.log('🔄 Test 3: Testing Transaction API permissions with SDK...')
    
    try {
      // Transaction Service mit SDK
      const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
      
      // Minimal transaction data für Test (exakt wie Support Beispiel)
      const lineItem: Wallee.model.LineItemCreate = new Wallee.model.LineItemCreate()
      lineItem.name = 'Test Product'
      lineItem.uniqueId = 'test-item'
      lineItem.sku = 'test-sku'
      lineItem.quantity = 1
      lineItem.amountIncludingTax = 1.00
      lineItem.type = Wallee.model.LineItemType.PRODUCT

      const testTransaction: Wallee.model.TransactionCreate = new Wallee.model.TransactionCreate()
      testTransaction.lineItems = [lineItem]
      testTransaction.currency = 'CHF'
      testTransaction.customerId = 'test-customer'
      testTransaction.merchantReference = 'test-reference'
      testTransaction.language = 'de-CH'
      testTransaction.autoConfirmationEnabled = false
      testTransaction.customerEmailAddress = 'test@example.com'

      const transactionResponse = await transactionService.create(spaceId, testTransaction)
      console.log('✅ Transaction API SUCCESS:', transactionResponse.body)
      
    } catch (transactionError: any) {
      console.error('❌ Transaction API FAILED:', {
        statusCode: transactionError.statusCode,
        message: transactionError.message,
        data: transactionError.data
      })
      
      throw transactionError
    }

    return {
      success: true,
      message: 'All Wallee SDK tests passed successfully!',
      tests: {
        space: '✅ PASSED',
        user: '✅ PASSED',
        transaction: '✅ PASSED'
      }
    }

  } catch (error: any) {
    console.error('❌ SDK Test FAILED:', {
      message: error.message,
      statusCode: error.statusCode,
      data: error.data
    })
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: 'SDK Test failed'
    })
  }
})