// server/api/wallee/check-permissions.get.ts
// ✅ OFFIZIELLES WALLEE SDK

import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  console.log('🚀 Wallee SDK Permissions Check...')
  
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
    
    // Test 1: Application User API (um zu prüfen ob User existiert)
    console.log('🔄 Test 1: Getting Application User details with SDK...')
    
    let userDetails: any = {}
    
    try {
      const userService: Wallee.api.ApplicationUserService = new Wallee.api.ApplicationUserService(config)
      const userResponse = await userService.read(spaceId, userId)
      userDetails = userResponse.body
      
      console.log('✅ Application User Details:', userDetails)
      
    } catch (userError: any) {
      console.error('❌ Application User Error:', {
        statusCode: userError.statusCode,
        message: userError.message,
        data: userError.data
      })
      return {
        success: false,
        error: 'Application User not found or invalid',
        details: userError.message,
        fixInstructions: {
          step1: 'Go to Wallee Dashboard: https://app-wallee.com/',
          step2: 'Navigate to: Settings → Users → Application Users',
          step3: 'Find User ID: ' + userId,
          step4: 'Check if user exists and is active',
          step5: 'If not found, create new Application User with proper permissions'
        }
      }
    }

    // Test 2: Try to create a minimal transaction to test permissions
    console.log('🔄 Test 2: Testing transaction creation permissions with SDK...')
    
    try {
      const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
      
      // Minimal transaction data für Test
      const lineItem: Wallee.model.LineItemCreate = new Wallee.model.LineItemCreate()
      lineItem.name = 'Permission Test'
      lineItem.uniqueId = 'permission-test'
      lineItem.sku = 'test-sku'
      lineItem.quantity = 1
      lineItem.amountIncludingTax = 1.00
      lineItem.type = Wallee.model.LineItemType.PRODUCT

      const testTransaction: Wallee.model.TransactionCreate = new Wallee.model.TransactionCreate()
      testTransaction.lineItems = [lineItem]
      testTransaction.currency = 'CHF'
      testTransaction.customerId = 'test-customer-permissions'
      testTransaction.merchantReference = 'permission-test'
      testTransaction.language = 'de-CH'
      testTransaction.autoConfirmationEnabled = false
      testTransaction.customerEmailAddress = 'test@example.com'

      console.log('📤 Transaction Data:', JSON.stringify(testTransaction, null, 2))

      const transactionResponse = await transactionService.create(spaceId, testTransaction)
      console.log('✅ Transaction Creation SUCCESS:', transactionResponse.body)
      
      return {
        success: true,
        message: 'All permissions are correctly configured!',
        userDetails: {
          id: userDetails.id,
          name: userDetails.name,
          state: userDetails.state
        },
        permissions: 'Transaction creation is working'
      }
      
    } catch (transactionError: any) {
      console.error('❌ Transaction Creation FAILED:', {
        statusCode: transactionError.statusCode,
        message: transactionError.message,
        data: transactionError.data
      })
      
      const errorMessage = transactionError.data?.message || transactionError.message
      const isPermissionError = errorMessage.includes('Permission denied') || errorMessage.includes('Anonymous User')
      
      if (isPermissionError) {
        return {
          success: false,
          error: 'Permission denied for transaction creation',
          userDetails: {
            id: userDetails?.id,
            name: userDetails?.name,
            state: userDetails?.state
          },
          fixInstructions: {
            step1: 'Go to Wallee Dashboard: https://app-wallee.com/',
            step2: 'Navigate to: Settings → Users → Application Users',
            step3: 'Find and click on User ID: ' + userId,
            step4: 'Add these permissions:',
            permissions: [
              '✅ Root (Account Admin)',
              '✅ Space (for Space ' + spaceId + ')',
              '✅ Payment (Payment Processing)',
              '✅ Transaction (Create)'
            ],
            step5: 'Save the user settings',
            step6: 'Test again with: curl http://localhost:3001/api/wallee/check-permissions'
          }
        }
      }
      
      return {
        success: false,
        error: 'Transaction creation failed',
        details: errorMessage,
        userDetails: {
          id: userDetails?.id,
          name: userDetails?.name,
          state: userDetails?.state
        }
      }
    }

  } catch (error: any) {
    console.error('❌ SDK Permissions Check FAILED:', {
      message: error.message,
      statusCode: error.statusCode,
      data: error.data
    })
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: 'SDK Permissions check failed'
    })
  }
})
