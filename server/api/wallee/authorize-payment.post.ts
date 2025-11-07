// server/api/wallee/authorize-payment.post.ts
// Erstellt eine Wallee Transaction im AUTHORIZED Status (provisorische Belastung)
// Die Zahlung wird später via Capture durchgeführt

import { getSupabase } from '~/utils/supabase'
import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  try {
    console.log('🔐 Authorizing payment (provisional charge)...')
    
    const body = await readBody(event)
    const { paymentId, userId, tenantId } = body

    if (!paymentId || !userId || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: paymentId, userId, tenantId'
      })
    }

    const supabase = getSupabase()

    // ✅ Load payment and appointment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        appointment_id,
        total_amount_rappen,
        metadata,
        appointments (
          id,
          title,
          start_time,
          event_type_code
        ),
        customer_payment_methods:payment_method_id (
          id,
          wallee_customer_id,
          wallee_token_id
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

    const paymentMethod = Array.isArray(payment.customer_payment_methods) 
      ? payment.customer_payment_methods[0] 
      : payment.customer_payment_methods

    if (!paymentMethod || !paymentMethod.wallee_customer_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No payment method or customer ID found'
      })
    }

    // ✅ WALLEE SDK KONFIGURATION
    const spaceId: number = parseInt(process.env.WALLEE_SPACE_ID || '82592')
    const userIdWallee: number = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    const apiSecret: string = process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
    
    const config = {
      space_id: spaceId,
      user_id: userIdWallee,
      api_secret: apiSecret
    }

    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)

    // ✅ Prepare transaction data
    const amount = payment.total_amount_rappen || 0
    const amountInCHF = amount / 100

    if (amount <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid amount'
      })
    }

    const appointment = Array.isArray(payment.appointments) 
      ? payment.appointments[0] 
      : payment.appointments

    // Format description (lesson type + date/time)
    const mapLessonType = (code: string | null | undefined) => {
      if (!code) return 'Fahrlektion'
      const c = String(code).toLowerCase()
      if (c.includes('exam') || c === 'prüfung') return 'Prüfung inkl. WarmUp'
      if (c.includes('theor')) return 'Theorielektion'
      return 'Fahrlektion'
    }

    const lessonType = mapLessonType(appointment?.event_type_code)
    const startDate = appointment?.start_time 
      ? new Date(appointment.start_time)
      : new Date()
    
    const description = `${lessonType} • ${startDate.toLocaleDateString('de-CH', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`

    // Create line item
    const lineItem: Wallee.model.LineItemCreate = new Wallee.model.LineItemCreate()
    lineItem.name = description
    lineItem.uniqueId = `item-${payment.id}-${Date.now()}`
    lineItem.sku = 'authorized-payment'
    lineItem.quantity = 1
    lineItem.amountIncludingTax = amountInCHF
    lineItem.type = Wallee.model.LineItemType.PRODUCT

    // ✅ Create transaction with autoConfirmationEnabled = false (Authorize only)
    const transaction: Wallee.model.TransactionCreate = new Wallee.model.TransactionCreate()
    transaction.lineItems = [lineItem]
    transaction.autoConfirmationEnabled = false // ✅ WICHTIG: false = nur Authorize, nicht sofort abbuchen
    transaction.currency = 'CHF'
    transaction.customerId = paymentMethod.wallee_customer_id
    transaction.merchantReference = `auth-${payment.id}-${Date.now()}`
    transaction.language = 'de-CH'
    transaction.tokenizationEnabled = false // Token bereits vorhanden

    console.log('📤 Creating authorized transaction:', {
      paymentId: payment.id,
      amount: amountInCHF,
      customerId: paymentMethod.wallee_customer_id,
      autoConfirmationEnabled: false
    })

    // Create transaction
    const createResponse = await transactionService.create(spaceId, transaction)
    const walleeTransaction = createResponse.body

    console.log('✅ Transaction created:', {
      id: walleeTransaction.id,
      state: walleeTransaction.state
    })

    // Wait a moment for async processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check final state
    const statusResponse = await transactionService.read(spaceId, walleeTransaction.id as number)
    const finalTransaction = statusResponse.body

    console.log('📊 Final transaction state:', finalTransaction.state)

    // ✅ Update payment with authorized transaction ID
    const updateData: any = {
      wallee_transaction_id: finalTransaction.id?.toString(),
      wallee_transaction_state: finalTransaction.state,
      payment_status: finalTransaction.state === Wallee.model.TransactionState.AUTHORIZED 
        ? 'authorized' 
        : 'pending',
      metadata: {
        ...(payment.metadata || {}),
        authorization: {
          transaction_id: finalTransaction.id?.toString(),
          state: finalTransaction.state,
          authorized_at: new Date().toISOString()
        }
      },
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update payment: ' + updateError.message
      })
    }

    return {
      success: true,
      transactionId: finalTransaction.id,
      state: finalTransaction.state,
      paymentStatus: updateData.payment_status,
      message: 'Payment authorized successfully (provisional charge)'
    }

  } catch (error: any) {
    console.error('❌ Error authorizing payment:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to authorize payment'
    })
  }
})

