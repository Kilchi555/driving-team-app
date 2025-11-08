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
      userId,
      tenantId
    } = body

    // Validierung
    if (!paymentId || !userId || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: paymentId, userId, tenantId'
      })
    }

    // Hole Payment-Daten aus DB
    const supabase = getSupabaseAdmin()
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        total_amount_rappen,
        description,
        appointment_id,
        user_id,
        tenant_id,
        appointments (
          id,
          title,
          start_time,
          event_type_code
        )
      `)
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found'
      })
    }

    // Hole User-Daten
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    const amount = payment.total_amount_rappen / 100 // Convert to CHF
    const customerEmail = user.email
    const customerName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
    const description = payment.description || 'Fahrlektion'
    const currency = 'CHF'
    const orderId = `appointment-${payment.appointment_id}-${Date.now()}`

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

    // ✅ Hole gespeicherte Payment Method (Token)
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
      token: parseInt(paymentMethod.wallee_token), // ✅ Token direkt bei Erstellung
      tokenizationEnabled: false // Kein neues Token erstellen, bestehendes verwenden
    }

    console.log('📤 Creating AUTHORIZED transaction with token...')
    
    const authorizeResponse = await transactionService.create(spaceId, transactionData)
    const authorizedTransaction: any = authorizeResponse.body

    console.log('✅ Transaction created:', {
      id: authorizedTransaction.id,
      state: authorizedTransaction.state
    })

    // ✅ Für Authorization: Transaction wird automatisch autorisiert
    // Wir müssen nur warten, bis Wallee die Autorisierung verarbeitet hat
    // Der State sollte zu AUTHORIZED wechseln
    
    // Optional: Warte kurz und hole den aktuellen State
    await new Promise(resolve => setTimeout(resolve, 2000)) // 2 Sekunden warten
    
    const updatedResponse = await transactionService.read(spaceId, authorizedTransaction.id as number)
    const updatedTransaction: any = updatedResponse.body
    
    console.log('✅ Transaction state after authorization:', {
      id: updatedTransaction.id,
      state: updatedTransaction.state
    })

    // ✅ Update Payment in DB
    await supabase
      .from('payments')
      .update({
        wallee_transaction_id: String(updatedTransaction.id),
        payment_status: updatedTransaction.state === 'AUTHORIZED' ? 'authorized' : 'processing',
        payment_method: 'wallee',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    console.log('✅ Payment updated with authorization')

    return {
      success: true,
      transactionId: updatedTransaction.id,
      state: updatedTransaction.state,
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
