// server/api/wallee/create-transaction.post.ts
// ✅ TEMPORÄRER DEBUG - Hardcoded Credentials

export default defineEventHandler(async (event) => {
  try {
    console.log('🔥 Wallee API called with HARDCODED credentials')
    
    const body = await readBody(event)
    console.log('📨 Received body:', body)
    
    const {
      appointmentId,
      amount,
      currency = 'CHF',
      customerId,
      customerEmail,
      lineItems,
      successUrl,
      failedUrl
    } = body

    // Validierung der erforderlichen Felder
    if (!appointmentId || !amount || !customerId || !customerEmail) {
      console.error('❌ Missing required fields:', { appointmentId, amount, customerId, customerEmail })
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: appointmentId, amount, customerId, customerEmail'
      })
    }

    // ✅ HARDCODED Wallee Credentials (temporär für Debug)
    const walleeSpaceId = '82592'  
    const walleeApplicationUserId = '140525'  
    const walleeSecretKey = 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='

    console.log('🔧 HARDCODED Wallee Config:', {
      spaceId: walleeSpaceId,
      userId: walleeApplicationUserId ? `${walleeApplicationUserId.substring(0, 3)}...` : 'MISSING',
      hasSecretKey: !!walleeSecretKey,
      spaceIdLength: walleeSpaceId?.length,
      userIdLength: walleeApplicationUserId?.length,
      secretKeyLength: walleeSecretKey?.length
    })

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      console.error('❌ Hardcoded credentials missing')
      throw createError({
        statusCode: 500,
        statusMessage: 'Hardcoded Wallee credentials missing'
      })
    }

    // Base64 Authentifizierung
    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')
    
    // ✅ TEMPORÄRER DEBUG - für Marco
    console.log('🔐 DEBUG für Marco:')
    console.log('Auth String Raw:', `${walleeApplicationUserId}:${walleeSecretKey}`)
    console.log('Auth Base64:', auth)
    console.log('Auth Header wird sein:', `Basic ${auth}`)

    console.log('🔐 HARDCODED Auth Debug:', {
      authStringLength: `${walleeApplicationUserId}:${walleeSecretKey}`.length,
      base64Length: auth.length,
      authPreview: `${auth.substring(0, 20)}...`
    })

    // Get request host for URLs
    const host = getHeader(event, 'host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`

    // Transaction Data für Wallee
    const transactionData = {
      lineItems: lineItems || [
        {
          uniqueId: `appointment-${appointmentId}`,
          name: 'Fahrstunde',
          quantity: 1,
          amountIncludingTax: amount,
          type: 'PRODUCT'
        }
      ],
      currency: currency,
      customerId: customerId,
      merchantReference: `appointment-${appointmentId}`,
      successUrl: successUrl || `${baseUrl}/payment/success`,
      failedUrl: failedUrl || `${baseUrl}/payment/failed`,
      language: 'de-CH',
      autoConfirmationEnabled: true,
      customerEmailAddress: customerEmail,
      metadata: {
        appointmentId: appointmentId,
        createdAt: new Date().toISOString()
      }
    }

    console.log('🔄 Creating Wallee transaction with HARDCODED credentials:', {
      spaceId: walleeSpaceId,
      amount: amount,
      currency: currency,
      customerId: customerId,
      url: `https://app-wallee.com/api/transaction/create?spaceId=${walleeSpaceId}`
    })

    console.log('📋 Transaction Data:', JSON.stringify(transactionData, null, 2))

    // ✅ WALLEE Transaction erstellen
    console.log('🔄 About to call Wallee Transaction API with HARDCODED auth...')
    
    let response: any
    
    try {
      response = await $fetch<any>(
        `https://app-wallee.com/api/transaction/create?spaceId=${walleeSpaceId}`,
        {
          method: 'POST',
          body: transactionData,
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      )
      
      console.log('✅ HARDCODED SUCCESS! Wallee response:', response)
      
    } catch (fetchError: any) {
      console.error('❌ HARDCODED FAILED! Wallee Transaction Error:', {
        message: fetchError.message,
        statusCode: fetchError.statusCode,
        data: fetchError.data,
        walleeMessage: fetchError.data?.message
      })
      
      if (fetchError.statusCode === 442) {
        console.error('🚨 STILL 442 with hardcoded credentials!')
        console.error('🚨 This means either:')
        console.error('1. Wrong Application User ID copied')
        console.error('2. Wrong Secret Key copied') 
        console.error('3. Different issue than credentials')
        
        throw createError({
          statusCode: 442,
          statusMessage: `HARDCODED TEST: Still 442 error. Wallee Error: ${fetchError.data?.message || 'Unknown'}`
        })
      }
      
      throw createError({
        statusCode: fetchError.statusCode || 500,
        statusMessage: `HARDCODED TEST: ${fetchError.data?.message || fetchError.message || 'Unknown error'}`
      })
    }

    // Success handling...
    return {
      success: true,
      transactionId: response.id,
      paymentUrl: 'HARDCODED_TEST_SUCCESS',
      transaction: response
    }

  } catch (error: any) {
    console.error('❌ HARDCODED FINAL Error:', error)
    throw error
  }
})