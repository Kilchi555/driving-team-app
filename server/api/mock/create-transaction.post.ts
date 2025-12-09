// server/api/mock/create-transaction.post.ts
// Ersetzt Wallee API temporär

export default defineEventHandler(async (event) => {
  try {
    logger.debug('🎭 Mock Payment API called')
    
    const body = await readBody(event)
    
    const {
      appointmentId,
      amount,
      currency = 'CHF',
      customerId,
      customerEmail
    } = body

    // Validierung (gleich wie echte API)
    if (!appointmentId || !amount || !customerId || !customerEmail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    logger.debug('🎭 Creating mock transaction:', {
      appointmentId,
      amount,
      currency,
      customerId
    })

    // Mock Transaction ID
    const transactionId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Mock Payment Page URL
    const host = getHeader(event, 'host') || 'www.simy.ch'
    const protocol = 'http' // Development
    const paymentUrl = `${protocol}://${host}/mock-payment-page?txn=${transactionId}&amount=${amount}&email=${customerEmail}`

    logger.debug('✅ Mock transaction created:', {
      transactionId,
      paymentUrl
    })

    // Simuliere Wallee Response Format (exakt gleich!)
    return {
      success: true,
      transactionId: transactionId,
      paymentUrl: paymentUrl,
      transaction: {
        id: transactionId,
        state: 'PENDING',
        authorizationAmount: amount
      }
    }

  } catch (error: any) {
    console.error('❌ Mock Payment API Error:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Mock payment failed'
    })
  }
})