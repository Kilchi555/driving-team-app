// server/api/wallee/create-transaction-corrected.post.ts
// ✅ EXAKT NACH WALLEE SUPPORT VORGABEN

export default defineEventHandler(async (event) => {
  try {
    console.log('🔥 WALLEE API CALL - EXAKT NACH SUPPORT VORGABEN')
    
    const body = await readBody(event)
    console.log('📨 Received request body:', JSON.stringify(body, null, 2))
    
    const {
      orderId,
      amount,
      currency = 'CHF',
      customerEmail,
      customerName,
      description = 'Fahrstunde'
    } = body

    // Environment Variables
    const walleeSpaceId = process.env.WALLEE_SPACE_ID
    const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
    const walleeSecretKey = process.env.WALLEE_SECRET_KEY

    console.log('🔧 Environment Variables:', {
      spaceId: walleeSpaceId,
      userId: walleeApplicationUserId,
      hasSecretKey: !!walleeSecretKey
    })

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing Wallee configuration'
      })
    }

    // ✅ EXAKTE Base64 Authentifizierung wie Support Beispiel
    const authString = `${walleeApplicationUserId}:${walleeSecretKey}`
    const base64Auth = Buffer.from(authString).toString('base64')
    
    console.log('🔐 Authentication Details:', {
      authString: authString,
      base64Auth: base64Auth,
      authHeader: `Basic ${base64Auth}`
    })

    // ✅ EXAKTE Transaction Data wie Support Beispiel
    const transactionData = {
      lineItems: [{
        uniqueId: orderId || `appointment-test${Date.now()}`,
        name: description || 'Fahrstunde',
        quantity: 1,
        amountIncludingTax: amount || 95.00,
        type: 'PRODUCT'
      }],
      currency: currency,
      customerId: `customer-${orderId || Date.now()}`,
      merchantReference: orderId || `appointment-test${Date.now()}`,
      language: 'de-CH',
      autoConfirmationEnabled: true,
      customerEmailAddress: customerEmail || 'test@drivingteam.ch',
      tokenizationEnabled: true // ✅ Tokenization aktivieren für Payment Method Storage
    }

    // ✅ EXAKTE Headers wie Support Beispiel
    const requestHeaders = {
      'Authorization': `Basic ${base64Auth}`,
      'Content-Type': 'application/json;charset=utf-8',
      'Host': 'app-wallee.com'
    }

    // ✅ EXAKTE URL wie Support Beispiel
    const apiUrl = `https://app-wallee.com/api/transaction/create?spaceId=${walleeSpaceId}`

    console.log('📤 COMPLETE HTTP REQUEST DETAILS:')
    console.log('🌐 Method: POST')
    console.log('🌐 URL:', apiUrl)
    console.log('📋 Headers:', JSON.stringify(requestHeaders, null, 2))
    console.log('📋 Body:', JSON.stringify(transactionData, null, 2))
    console.log('')
    console.log('📄 RAW HTTP REQUEST FORMAT:')
    console.log(`POST /api/transaction/create?spaceId=${walleeSpaceId} HTTP/1.1`)
    console.log(`Host: app-wallee.com`)
    console.log(`Authorization: Basic ${base64Auth}`)
    console.log(`Content-Type: application/json;charset=utf-8`)
    console.log('')
    console.log(JSON.stringify(transactionData, null, 2))
    console.log('')

    // ✅ WALLEE API CALL
    console.log('🚀 Executing Wallee API call...')
    
    let apiResponse: any
    let responseStatus: number
    let responseHeaders: any
    
    try {
      // Using fetch directly to get more control over the request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(transactionData)
      })
      
      responseStatus = response.status
      responseHeaders = Object.fromEntries(response.headers.entries())
      
      console.log('📥 COMPLETE HTTP RESPONSE DETAILS:')
      console.log('📊 Status Code:', responseStatus)
      console.log('📋 Response Headers:', JSON.stringify(responseHeaders, null, 2))
      
      const responseText = await response.text()
      console.log('📄 Raw Response Body:', responseText)
      
      try {
        apiResponse = JSON.parse(responseText)
        console.log('📋 Parsed Response Body:', JSON.stringify(apiResponse, null, 2))
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError)
        apiResponse = { rawResponse: responseText }
      }
      
      if (!response.ok) {
        console.error('❌ API ERROR RESPONSE:')
        console.error('Status:', responseStatus)
        console.error('Headers:', responseHeaders)
        console.error('Body:', apiResponse)
        
        throw createError({
          statusCode: responseStatus,
          statusMessage: apiResponse?.message || `HTTP ${responseStatus} Error`,
          data: apiResponse
        })
      }
      
    } catch (fetchError: any) {
      console.error('❌ FETCH ERROR:', {
        message: fetchError.message,
        cause: fetchError.cause,
        stack: fetchError.stack
      })
      
      // Re-throw the error with additional context
      throw createError({
        statusCode: fetchError.statusCode || 500,
        statusMessage: fetchError.message || 'Network error',
        data: {
          originalError: fetchError.message,
          requestUrl: apiUrl,
          requestHeaders: requestHeaders,
          requestBody: transactionData
        }
      })
    }

    console.log('✅ SUCCESS! Wallee transaction created')
    console.log('📋 Transaction Response:', JSON.stringify(apiResponse, null, 2))

    return {
      success: true,
      transactionId: apiResponse.id,
      paymentUrl: apiResponse.paymentUrl || apiResponse.redirectUrl,
      transaction: apiResponse,
      debug: {
        requestUrl: apiUrl,
        requestHeaders: requestHeaders,
        requestBody: transactionData,
        responseStatus: responseStatus,
        responseHeaders: responseHeaders
      }
    }

  } catch (error: any) {
    console.error('❌ FINAL ERROR:', {
      message: error.message,
      statusCode: error.statusCode,
      data: error.data,
      stack: error.stack
    })
    
    throw error
  }
})
