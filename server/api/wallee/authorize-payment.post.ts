// server/api/wallee/authorize-payment.post.ts
// Erstellt eine AUTHORIZED Wallee-Transaktion (provisorische Belastung)
// Wird bei Terminbestätigung aufgerufen, wenn genug Zeit vor dem Termin ist

import { Wallee } from 'wallee'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  console.log('🔐 Wallee Authorization (Authorize & Capture)...')
  
  try {
    const body = await readBody(event)
    console.log('📨 Received authorization request:', body)
    
    const {
      paymentId,
      orderId,
      amount,
      currency = 'CHF',
      customerEmail,
      customerName,
      description,
      userId,
      tenantId
    } = body

    // Validierung
    if (!paymentId || !amount || !customerEmail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: paymentId, amount, customerEmail'
      })
    }

    // ✅ WALLEE SDK KONFIGURATION
    const spaceId: number = parseInt(process.env.WALLEE_SPACE_ID || '82592')
    const walleeUserId: number = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    const apiSecret: string = process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
    
    const config = {
      space_id: spaceId,
      user_id: walleeUserId,
      api_secret: apiSecret
    }
    
    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
    
    // Generiere Customer ID (pseudonym)
    const customerId = userId && tenantId 
      ? `dt-${tenantId}-${userId}`
      : customerEmail.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()

    console.log('🔑 Customer ID:', customerId)

    // ✅ Erstelle Transaction mit Tokenization
    const transactionData: any = {
      lineItems: [{
        name: description || 'Fahrlektion',
        uniqueId: `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        sku: 'driving-lesson',
        quantity: 1,
        amountIncludingTax: amount,
        type: Wallee.model.LineItemType.PRODUCT
      }],
      autoConfirmationEnabled: false, // ❗ WICHTIG: false für Authorization
      currency: currency,
      customerId: customerId,
      merchantReference: orderId || `order-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      language: 'de-CH',
      customerEmailAddress: customerEmail,
      tokenizationEnabled: true
    }

    console.log('📤 Creating AUTHORIZED transaction...')
    
    const response = await transactionService.create(spaceId, transactionData)
    const transaction: any = response.body
    
    console.log('✅ Transaction created:', {
      id: transaction.id,
      state: transaction.state
    })

    // ✅ Hole gespeicherte Payment Method (Token)
    const supabase = getSupabaseAdmin()
    const { data: paymentMethod } = await supabase
      .from('customer_payment_methods')
      .select('wallee_token, provider_payment_method_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!paymentMethod?.wallee_token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No saved payment method found for user'
      })
    }

    console.log('💳 Using saved payment method:', paymentMethod.wallee_token)

    // ✅ Erstelle Transaction mit Token (für Authorization)
    const transactionWithToken: any = {
      ...transactionData,
      token: parseInt(paymentMethod.wallee_token)
    }

    const authorizeResponse = await transactionService.create(spaceId, transactionWithToken)
    const authorizedTransaction: any = authorizeResponse.body

    console.log('✅ Transaction authorized:', {
      id: authorizedTransaction.id,
      state: authorizedTransaction.state
    })

    // ✅ Bestätige Transaction (Authorization)
    const confirmResponse = await transactionService.confirm(spaceId, authorizedTransaction.id as number)
    const confirmedTransaction: any = confirmResponse.body

    console.log('✅ Transaction confirmed (authorized):', {
      id: confirmedTransaction.id,
      state: confirmedTransaction.state
    })

    // ✅ Update Payment in DB
    await supabase
      .from('payments')
      .update({
        wallee_transaction_id: String(confirmedTransaction.id),
        payment_status: 'authorized',
        payment_method: 'wallee',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    console.log('✅ Payment updated with authorization')

    return {
      success: true,
      transactionId: confirmedTransaction.id,
      state: confirmedTransaction.state,
      message: 'Payment authorized successfully'
    }
    
  } catch (error: any) {
    console.error('❌ Authorization failed:', {
      message: error.message,
      statusCode: error.statusCode,
      body: error.body
    })
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Authorization failed'
    })
  }
})
