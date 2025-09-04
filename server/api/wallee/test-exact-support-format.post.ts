// server/api/wallee/test-exact-support-format.post.ts
// ✅ EXAKT DAS FORMAT DAS DER SUPPORT GEZEIGT HAT

export default defineEventHandler(async (event) => {
  try {
    console.log('🔥 TESTE EXAKT DAS SUPPORT FORMAT - BASIC AUTH')
    
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
      hasSecretKey: !!walleeSecretKey,
      secretKeyFull: walleeSecretKey // VOLLSTÄNDIG für Debug
    })

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing Wallee configuration'
      })
    }

    // ✅ EXAKT WIE SUPPORT BEISPIEL - BASIC AUTH
    const authString = `${walleeApplicationUserId}:${walleeSecretKey}`
    const base64Auth = Buffer.from(authString).toString('base64')
    
    // SUPPORT BEISPIEL ZUM VERGLEICH
    const supportBase64 = 'MTQwNTI1Olp0SkFQV2E0bjFHazg2bHJOYUFaVFhOZlAzZ3BLckFLc1NEUHFFdThSZTg5'
    const supportDecoded = Buffer.from(supportBase64, 'base64').toString('utf-8')
    
    console.log('🔐 Authentifizierung Vergleich:', {
      unserAuthString: authString,
      unsereBase64: base64Auth,
      supportBase64: supportBase64,
      supportDecoded: supportDecoded,
      identisch: base64Auth === supportBase64
    })

    // ✅ EXAKTE Transaction Data wie Support Beispiel
    const transactionData = {
      lineItems: [{
        uniqueId: orderId || "appointment-test123",
        name: description || "Fahrstunde",
        quantity: 1,
        amountIncludingTax: amount || 95.00,
        type: "PRODUCT"
      }],
      currency: currency,
      customerId: "test-customer",
      merchantReference: orderId || "appointment-test123",
      language: "de-CH",
      autoConfirmationEnabled: true,
      customerEmailAddress: customerEmail || "test@drivingteam.ch"
    }

    // ✅ EXAKTE Headers wie Support Beispiel
    const requestHeaders = {
      'Authorization': `Basic ${base64Auth}`,
      'Content-Type': 'application/json;charset=utf-8',
      'Host': 'app-wallee.com'
    }

    const apiUrl = `https://app-wallee.com/api/transaction/create?spaceId=${walleeSpaceId}`

    console.log('📤 COMPLETE HTTP REQUEST (SUPPORT FORMAT):')
    console.log('🌐 Method: POST')
    console.log('🌐 URL:', apiUrl)
    console.log('📋 Headers:', JSON.stringify(requestHeaders, null, 2))
    console.log('📋 Body:', JSON.stringify(transactionData, null, 2))
    console.log('')
    console.log('📄 RAW HTTP REQUEST (EXAKT WIE SUPPORT):')
    console.log(`POST /api/transaction/create?spaceId=${walleeSpaceId} HTTP/1.1`)
    console.log(`Host: app-wallee.com`)
    console.log(`Authorization: Basic ${base64Auth}`)
    console.log(`Content-Type: application/json;charset=utf-8`)
    console.log('')
    console.log(JSON.stringify(transactionData, null, 2))
    console.log('')

    // ✅ TESTE BEIDE: UNSERE UND SUPPORT BASE64
    const testResults = []

    // Test 1: Unsere berechnete Base64
    console.log('🚀 Test 1: Unsere berechnete Base64...')
    try {
      const response1 = await fetch(apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(transactionData)
      })
      
      const status1 = response1.status
      const text1 = await response1.text()
      
      testResults.push({
        test: 'Unsere Base64',
        base64: base64Auth,
        authString: authString,
        status: status1,
        response: text1,
        success: status1 === 200
      })
      
      console.log(`📊 Test 1 Status: ${status1}`)
      console.log(`📄 Test 1 Response: ${text1}`)
      
    } catch (error: any) {
      testResults.push({
        test: 'Unsere Base64',
        base64: base64Auth,
        authString: authString,
        error: error.message,
        success: false
      })
    }

    // Test 2: Support Base64 (falls unterschiedlich)
    if (base64Auth !== supportBase64) {
      console.log('🚀 Test 2: Support Base64...')
      
      const supportHeaders = {
        'Authorization': `Basic ${supportBase64}`,
        'Content-Type': 'application/json;charset=utf-8',
        'Host': 'app-wallee.com'
      }
      
      try {
        const response2 = await fetch(apiUrl, {
          method: 'POST',
          headers: supportHeaders,
          body: JSON.stringify(transactionData)
        })
        
        const status2 = response2.status
        const text2 = await response2.text()
        
        testResults.push({
          test: 'Support Base64',
          base64: supportBase64,
          authString: supportDecoded,
          status: status2,
          response: text2,
          success: status2 === 200
        })
        
        console.log(`📊 Test 2 Status: ${status2}`)
        console.log(`📄 Test 2 Response: ${text2}`)
        
      } catch (error: any) {
        testResults.push({
          test: 'Support Base64',
          base64: supportBase64,
          authString: supportDecoded,
          error: error.message,
          success: false
        })
      }
    }

    return {
      success: true,
      message: 'Support Format Tests completed',
      comparison: {
        unserAuthString: authString,
        unsereBase64: base64Auth,
        supportBase64: supportBase64,
        supportDecoded: supportDecoded,
        identisch: base64Auth === supportBase64
      },
      tests: testResults
    }

  } catch (error: any) {
    console.error('❌ Support Format Test Error:', error)
    throw error
  }
})
