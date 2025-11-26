// server/api/wallee/authorize-payment.post.ts
// Erstellt eine AUTHORIZED Wallee-Transaktion (provisorische Belastung)
// Wird bei Terminbestätigung aufgerufen, wenn genug Zeit vor dem Termin ist

import { Wallee } from 'wallee'
import { getSupabaseAdmin } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'
import { buildMerchantReference } from '~/utils/merchantReference'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'

export default defineEventHandler(async (event) => {
  console.log('🔐 Wallee Authorization (Authorize & Capture)...')
  
  try {
    const body = await readBody(event)
    console.log('📨 Received authorization request:', body)
    
    const {
      paymentId,
      userId,
      tenantId,
      appointmentStartTime,
      automaticPaymentHoursBefore = 24
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
        payment_status,
        total_amount_rappen,
        description,
        appointment_id,
        user_id,
        tenant_id,
        appointments (
          id,
          title,
          start_time,
          event_type_code,
          type,
          duration_minutes,
          staff:users!appointments_staff_id_fkey (
            first_name,
            last_name
          )
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

    // ✅ Update Payment Status zu 'processing' ATOMARE mit Bedingung
    // Nur wenn aktuell 'pending', dann zu 'processing' setzen
    // Dies verhindert Race Conditions - nur EINE Request wird erfolgreich sein!
    console.log('🔄 Marking payment as processing (acquiring lock)...')
    const { data: lockResult, error: lockError } = await supabase
      .from('payments')
      .update({
        payment_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .eq('payment_status', 'pending')  // ✅ Only if currently 'pending'!
      .select()
    
    if (lockError) {
      console.error('❌ Could not acquire payment lock:', lockError)
      throw lockError
    }
    
    // ✅ Check if the update succeeded (should have 1 row)
    if (!lockResult || lockResult.length === 0) {
      console.log(`ℹ️ Payment already being processed or completed, skipping`)
      
      // Fetch current status to return it
      const { data: currentPayment, error: fetchError } = await supabase
        .from('payments')
        .select('payment_status')
        .eq('id', paymentId)
        .single()
      
      if (!fetchError && currentPayment) {
        return {
          success: true,
          message: `Payment already in ${currentPayment.payment_status} status`,
          paymentId: paymentId,
          state: currentPayment.payment_status
        }
      }
      
      throw createError({
        statusCode: 409,
        statusMessage: 'Payment is already being processed'
      })
    }
    
    console.log('✅ Payment locked for processing')

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
    const appointmentDetails = Array.isArray(payment.appointments)
      ? payment.appointments[0]
      : payment.appointments

    const staffName = appointmentDetails?.staff
      ? `${appointmentDetails.staff.first_name || ''} ${appointmentDetails.staff.last_name || ''}`.trim()
      : undefined

    const orderId = buildMerchantReference({
      appointmentId: payment.appointment_id,
      eventTypeCode: appointmentDetails?.event_type_code,
      categoryCode: appointmentDetails?.type,
      staffName,
      startTime: appointmentDetails?.start_time,
      durationMinutes: appointmentDetails?.duration_minutes
    })

    // ✅ GET WALLEE CONFIG FOR TENANT (with fallback to env variables)
    const walleeConfig = await getWalleeConfigForTenant(tenantId)
    console.log('🔧 Wallee Config:', { 
      spaceId: walleeConfig.spaceId, 
      userId: walleeConfig.userId,
      forTenant: tenantId
    })
    
    const config = getWalleeSDKConfig(walleeConfig.spaceId, walleeConfig.userId, walleeConfig.apiSecret)
    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
    
    // Generiere Customer ID (pseudonym)
    const customerId = userId && tenantId 
      ? `dt-${tenantId}-${userId}`
      : customerEmail.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()

    console.log('🔑 Customer ID:', customerId)

    // ✅ Generiere kürzere Customer ID für Wallee (max 200 chars!)
    // Die aktuelle `dt-...` ID ist zu lang und kann Probleme verursachen
    const shortCustomerId = `${tenantId.substring(0, 8)}-${userId.substring(0, 8)}`
    console.log('🔑 Short Customer ID:', shortCustomerId)

    // ✅ Hole gespeicherte Payment Method (Token)
    const { data: paymentMethod } = await supabase
      .from('customer_payment_methods')
      .select('wallee_token, wallee_customer_id, provider_payment_method_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!paymentMethod?.provider_payment_method_id && !paymentMethod?.wallee_token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No saved payment method found for user'
      })
    }

    // ✅ TWINT Force Storage verwendet die customerId, kein separates Token
    // WICHTIG: Wir MÜSSEN dieselbe Customer ID verwenden, die bei der ersten Zahlung gespeichert wurde!
    // provider_payment_method_id und wallee_customer_id enthalten beide die LANGE ID
    // Priorität: wallee_customer_id (definitiv die richtige ID) > provider_payment_method_id (fallback)
    const savedCustomerId = paymentMethod.wallee_customer_id || paymentMethod.provider_payment_method_id || customerId
    
    console.log('💳 Using customer-based tokenization (TWINT Force Storage mode)')
    console.log('🔑 Payment method on file:', {
      provider_payment_method_id: paymentMethod.provider_payment_method_id,
      wallee_token: paymentMethod.wallee_token,
      wallee_customer_id: paymentMethod.wallee_customer_id,
      willUseCustomerId: savedCustomerId
    })

    // ✅ Berechne, wie viel Zeit bis zum Termin bleibt
    // WICHTIG: Verwende die Zeit vom Frontend (appointmentStartTime), um Diskrepanzen zu vermeiden
    const appointmentTime = appointmentStartTime ? new Date(appointmentStartTime) : null
    const now = new Date()
    let completionBehavior = Wallee.model.TransactionCompletionBehavior.COMPLETE_DEFERRED // Default: deferred
    
    if (appointmentTime) {
      const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      console.log('⏰ Hours until appointment:', hoursUntilAppointment)
      console.log('💰 Payment threshold:', {
        automaticPaymentHoursBefore,
        hoursUntilAppointment,
        willChargeImmediately: hoursUntilAppointment < automaticPaymentHoursBefore
      })
      
      // ✅ Wenn Termin < 24h entfernt: sofort abbuchen (COMPLETE_IMMEDIATE)
      // Sonst: Nur Zustimmung sammeln, kein Charge (COMPLETE_DEFERRED)
      if (hoursUntilAppointment < automaticPaymentHoursBefore) {
        completionBehavior = Wallee.model.TransactionCompletionBehavior.COMPLETE_IMMEDIATE
        console.log('⚡ Short-term appointment (< 24h) - using COMPLETE_IMMEDIATE for immediate charge')
      } else {
        console.log('ℹ️ Long-term appointment (>= 24h) - using COMPLETE_DEFERRED, charge will happen via cron 24h before')
      }
    }

    // ✅ Erstelle Transaction mit Customer ID (TWINT Force Storage)
    // WICHTIG: Bei TWINT mit "Force Storage" nutzt Wallee die customerId für die Zuordnung
    // Es gibt KEINE separaten Token IDs - die Zahlungsmethode wird automatisch via customerId gefunden
    // KRITISCH: Wir müssen EXAKT dieselbe Customer ID verwenden, die beim ersten Payment gespeichert wurde!
    const transactionData: any = {
      lineItems: [{
        name: description || 'Fahrlektion',
        uniqueId: `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        sku: 'driving-lesson',
        quantity: 1,
        amountIncludingTax: amount,
        type: Wallee.model.LineItemType.PRODUCT
      }],
      autoConfirmationEnabled: true, // ✅ WICHTIG: true für One-Click Payment mit gespeicherter Methode!
      chargeRetryEnabled: false, // Keine automatischen Wiederholungen
      completionBehavior: completionBehavior, // ✅ Dynamic: IMMEDIATE für < 24h, sonst DEFERRED
      currency: currency,
      customerId: savedCustomerId, // ✅ WICHTIG: Verwende EXAKT die gespeicherte Customer ID!
      merchantReference: orderId || `order-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      language: 'de-CH',
      customerEmailAddress: customerEmail,
      tokenizationMode: Wallee.model.TokenizationMode.FORCE_CREATION // ✅ Force Storage Mode
    }

    console.log('📤 Creating AUTHORIZED transaction with token...')
    
    const authorizeResponse = await transactionService.create(walleeConfig.spaceId, transactionData)
    const authorizedTransaction: any = authorizeResponse.body

    console.log('✅ Transaction created:', {
      id: authorizedTransaction.id,
      state: authorizedTransaction.state
    })

    // ✅ Processiere die Transaction, um die Autorisierung zu starten
    console.log('🔄 Processing transaction to authorize...')
    
    const processResponse = await transactionService.processWithoutUserInteraction(walleeConfig.spaceId, authorizedTransaction.id as number)
    const processedTransaction: any = processResponse.body
    
    console.log('✅ Transaction processed:', {
      id: processedTransaction.id,
      state: processedTransaction.state
    })
    
    // Warte kurz und hole den finalen State
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const updatedResponse = await transactionService.read(walleeConfig.spaceId, authorizedTransaction.id as number)
    const updatedTransaction: any = updatedResponse.body
    
    console.log('✅ Transaction state after processing:', {
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
        updated_at: toLocalTimeString(new Date())
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
      body: error.body,
      stack: error.stack
    })
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Authorization failed',
      data: {
        originalError: error.toString()
      }
    })
  }
})
