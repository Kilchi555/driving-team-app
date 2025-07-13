// server/api/wallee/transaction-debug.post.ts
export default defineEventHandler(async (event) => {
  console.log('🔥 Transaction Debug API called')
  
  try {
    const body = await readBody(event)
    console.log('📨 Request body:', body)
    
    // Get credentials
    const spaceId = process.env.WALLEE_SPACE_ID
    const userId = process.env.WALLEE_APPLICATION_USER_ID  
    const secretKey = process.env.WALLEE_SECRET_KEY
    
    console.log('📊 Using credentials:', {
      spaceId: spaceId,
      userId: userId,
      secretKeyLength: secretKey?.length
    })
    
    // Create auth
    const authBase64 = Buffer.from(`${userId}:${secretKey}`).toString('base64')
    
    // Minimal transaction data
    const transactionData = {
      lineItems: [{
        uniqueId: `test-${Date.now()}`,
        name: 'Test Transaction',
        quantity: 1,
        amountIncludingTax: 95.00,
        type: 'PRODUCT'
      }],
      currency: 'CHF',
      customerId: 'test-customer-123',
      merchantReference: `test-${Date.now()}`,
      language: 'de-CH',
      spaceId: parseInt(spaceId!),
      autoConfirmationEnabled: false, // Einfacher für Test
      customerEmailAddress: 'test@drivingteam.ch'
    }
    
    console.log('💳 Transaction data:', JSON.stringify(transactionData, null, 2))
    
    const url = `https://app-wallee.com/api/transaction/create?spaceId=${spaceId}`
    console.log('🌐 API URL:', url)
    
    // Test transaction creation
    const response = await $fetch<any>(url, {
      method: 'POST',
      body: transactionData,
      headers: {
        'Authorization': `Basic ${authBase64}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log('✅ Transaction created successfully:', response)
    
    return {
      success: true,
      message: 'Transaction creation working!',
      transactionId: response?.id || 'unknown',
      response: response
    }
    
  } catch (error: any) {
    console.error('❌ Transaction Debug Error:', {
      message: error.message,
      statusCode: error.statusCode,
      data: error.data,
      stack: error.stack?.split('\n')[0]
    })
    
    // Check specific permission error
    if (error.message?.includes('Permission denied')) {
      console.error('🚨 PERMISSION ISSUE:', {
        errorType: 'Permission denied',
        suggestion: 'User needs Transaction Create permission in the specific space',
        currentSpace: process.env.WALLEE_SPACE_ID
      })
    }
    
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
      errorData: error.data,
      suggestion: error.message?.includes('Permission denied') 
        ? 'Add Transaction Create permission to your Application User in this Space'
        : 'Check Wallee credentials and API format'
    }
  }
})