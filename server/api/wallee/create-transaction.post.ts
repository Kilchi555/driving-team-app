// server/api/wallee/create-transaction.post.ts
export default defineEventHandler(async (event) => {
  try {
    console.log('🔥 Wallee API called')
    
    // Body aus der Anfrage lesen
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

    // Wallee Konfiguration aus Environment Variables
    const walleeSpaceId = process.env.WALLEE_SPACE_ID
    const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
    const walleeSecretKey = process.env.WALLEE_SECRET_KEY

    console.log('🔧 Wallee Config Check:', {
      hasSpaceId: !!walleeSpaceId,
      hasUserId: !!walleeApplicationUserId,
      hasSecretKey: !!walleeSecretKey,
      spaceId: walleeSpaceId ? `${walleeSpaceId.substring(0, 3)}...` : 'missing',
      userId: walleeApplicationUserId ? `${walleeApplicationUserId.substring(0, 3)}...` : 'missing'
    })

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      console.error('❌ Wallee configuration missing')
      throw createError({
        statusCode: 500,
        statusMessage: 'Wallee configuration missing in environment variables'
      })
    }

    // Base64 Authentifizierung für Wallee API
    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')

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
      spaceId: parseInt(walleeSpaceId),
      autoConfirmationEnabled: true,
      customerEmailAddress: customerEmail,
      metaData: {
        appointmentId: appointmentId,
        createdAt: new Date().toISOString()
      }
    }

    console.log('🔄 Creating Wallee transaction:', {
      spaceId: walleeSpaceId,
      amount: amount,
      currency: currency,
      customerId: customerId
    })

    // Wallee Transaction erstellen
    const response = await $fetch<any>(
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

    console.log('✅ Wallee transaction created:', {
      id: response?.id,
      state: response?.state,
      amount: response?.authorizationAmount
    })

    // Payment Page URL erstellen
    const paymentPageUrl = await $fetch<string>(
      `https://app-wallee.com/api/transaction-payment-page/payment-page-url?spaceId=${walleeSpaceId}`,
      {
        method: 'POST',
        body: {
          id: response?.id
        },
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    )

    console.log('✅ Payment page URL created:', paymentPageUrl)

    return {
      success: true,
      transactionId: response?.id,
      paymentUrl: paymentPageUrl,
      transaction: response
    }

  } catch (error: any) {
    console.error('❌ Wallee API Error:', error)
    
    // Spezifische Fehlerbehandlung für Wallee API Fehler
    if (error.data) {
      console.error('❌ Wallee API Response Error:', error.data)
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage: error.data.message || 'Wallee API Error'
      })
    }

    // Allgemeine Fehlerbehandlung
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})