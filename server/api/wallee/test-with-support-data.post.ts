// server/api/wallee/test-with-support-data.post.ts
// ✅ TESTE MIT EXAKTEN SUPPORT DATEN

export default defineEventHandler(async (event) => {
  try {
    console.log('🔥 TESTE MIT EXAKTEN SUPPORT DATEN')
    
    const body = await readBody(event)
    console.log('📨 Received request body:', JSON.stringify(body, null, 2))
    
    const {
      orderId = "appointment-test123",
      amount = 95.00,
      currency = 'CHF',
      customerEmail = "test@drivingteam.ch",
      description = "Fahrstunde"
    } = body

    // ✅ EXAKTE SUPPORT DATEN
    const supportUserId = '140525'
    const supportKey = 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
    const supportSpaceId = '82592'
    
    // SUPPORT BEISPIEL BASE64
    const supportBase64Example = 'MTQwNTI1Olp0SkFQV2E0bjFHazg2bHJOYUFaVFhOZlAzZ3BLckFLc1NEUHFFdThSZTg5'

    console.log('🔧 Support Daten:', {
      userId: supportUserId,
      key: supportKey,
      spaceId: supportSpaceId,
      supportBase64Example: supportBase64Example
    })

    // ✅ BERECHNE UNSERE BASE64 MIT SUPPORT DATEN
    const authString = `${supportUserId}:${supportKey}`
    const ourBase64 = Buffer.from(authString).toString('base64')
    
    // ✅ DEKODIERE SUPPORT BEISPIEL
    const supportDecoded = Buffer.from(supportBase64Example, 'base64').toString('utf-8')
    
    console.log('🔐 Base64 Vergleich:', {
      authString: authString,
      ourBase64: ourBase64,
      supportBase64Example: supportBase64Example,
      supportDecoded: supportDecoded,
      identisch: ourBase64 === supportBase64Example,
      lengthOur: ourBase64.length,
      lengthSupport: supportBase64Example.length
    })

    // ✅ TRANSACTION DATA EXAKT WIE SUPPORT BEISPIEL
    const transactionData = {
      lineItems: [{
        uniqueId: orderId,
        name: description,
        quantity: 1,
        amountIncludingTax: amount,
        type: "PRODUCT"
      }],
      currency: currency,
      customerId: "test-customer",
      merchantReference: orderId,
      language: "de-CH",
      autoConfirmationEnabled: true,
      customerEmailAddress: customerEmail
    }

    // ✅ TESTE BEIDE BASE64 VARIANTEN
    const testResults = []
    const apiUrl = `https://app-wallee.com/api/transaction/create?spaceId=${supportSpaceId}`

    // Test 1: Unsere berechnete Base64
    console.log('🚀 Test 1: Unsere berechnete Base64...')
    console.log(`Auth String: ${authString}`)
    console.log(`Base64: ${ourBase64}`)
    
    const ourHeaders = {
      'Authorization': `Basic ${ourBase64}`,
      'Content-Type': 'application/json;charset=utf-8',
      'Host': 'app-wallee.com'
    }
    
    try {
      const response1 = await fetch(apiUrl, {
        method: 'POST',
        headers: ourHeaders,
        body: JSON.stringify(transactionData)
      })
      
      const status1 = response1.status
      const text1 = await response1.text()
      
      console.log(`📊 Test 1 - Status: ${status1}`)
      console.log(`📄 Test 1 - Response: ${text1}`)
      
      testResults.push({
        test: 'Unsere berechnete Base64',
        authString: authString,
        base64: ourBase64,
        status: status1,
        response: text1,
        success: status1 === 200 || status1 === 201
      })
      
    } catch (error: any) {
      console.error(`❌ Test 1 Error: ${error.message}`)
      testResults.push({
        test: 'Unsere berechnete Base64',
        authString: authString,
        base64: ourBase64,
        error: error.message,
        success: false
      })
    }

    // Test 2: Support Beispiel Base64 (falls unterschiedlich)
    if (ourBase64 !== supportBase64Example) {
      console.log('🚀 Test 2: Support Beispiel Base64...')
      console.log(`Support Base64: ${supportBase64Example}`)
      console.log(`Support Decoded: ${supportDecoded}`)
      
      const supportHeaders = {
        'Authorization': `Basic ${supportBase64Example}`,
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
        
        console.log(`📊 Test 2 - Status: ${status2}`)
        console.log(`📄 Test 2 - Response: ${text2}`)
        
        testResults.push({
          test: 'Support Beispiel Base64',
          authString: supportDecoded,
          base64: supportBase64Example,
          status: status2,
          response: text2,
          success: status2 === 200 || status2 === 201
        })
        
      } catch (error: any) {
        console.error(`❌ Test 2 Error: ${error.message}`)
        testResults.push({
          test: 'Support Beispiel Base64',
          authString: supportDecoded,
          base64: supportBase64Example,
          error: error.message,
          success: false
        })
      }
    } else {
      console.log('✅ Unsere Base64 ist identisch mit Support Beispiel!')
    }

    // ✅ VOLLSTÄNDIGES DEBUG LOG
    console.log('📄 VOLLSTÄNDIGES DEBUG LOG:')
    console.log(`POST /api/transaction/create?spaceId=${supportSpaceId} HTTP/1.1`)
    console.log(`Host: app-wallee.com`)
    console.log(`Authorization: Basic ${ourBase64}`)
    console.log(`Content-Type: application/json;charset=utf-8`)
    console.log('')
    console.log(JSON.stringify(transactionData, null, 2))

    return {
      success: true,
      message: 'Support Daten Tests completed',
      supportData: {
        userId: supportUserId,
        key: supportKey,
        spaceId: supportSpaceId
      },
      comparison: {
        authString: authString,
        ourBase64: ourBase64,
        supportBase64Example: supportBase64Example,
        supportDecoded: supportDecoded,
        identisch: ourBase64 === supportBase64Example
      },
      transactionData: transactionData,
      tests: testResults,
      successfulTest: testResults.find(t => t.success)
    }

  } catch (error: any) {
    console.error('❌ Support Data Test Error:', error)
    throw error
  }
})
