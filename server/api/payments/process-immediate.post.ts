// server/api/payments/process-immediate.post.ts
// Verarbeitet sofortige Zahlungen mit gespeichertem Wallee-Token
// Wird aufgerufen wenn Termin weniger als hoursBefore vor Termin bestätigt wird

import { getSupabase } from '~/utils/supabase'
import { Wallee } from 'wallee'
import { toLocalTimeString } from '~/utils/dateUtils'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { paymentId } = body

    if (!paymentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing paymentId'
      })
    }

    const supabase = getSupabase()
    
    // ✅ Lade Payment mit allen nötigen Daten
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        appointment_id,
        user_id,
        tenant_id,
        total_amount_rappen,
        payment_method,
        payment_method_id,
        scheduled_payment_date,
        automatic_payment_consent,
        automatic_payment_processed,
        metadata,
        payment_status,
        appointments (
          id,
          start_time,
          end_time,
          title,
          user_id,
          status
        ),
        customer_payment_methods:payment_method_id (
          id,
          wallee_token,
          wallee_customer_id,
          display_name,
          is_active,
          user_id,
          tenant_id
        ),
        users:user_id (
          id,
          email,
          first_name,
          last_name,
          tenant_id
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

    // ✅ PRÜFUNG: Termin muss bestätigt sein
    const appointment = payment.appointments as any
    if (!appointment) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Appointment not found for this payment'
      })
    }

    if (appointment.status !== 'confirmed') {
      throw createError({
        statusCode: 400,
        statusMessage: `Appointment not confirmed (Status: ${appointment.status}). Payment cannot be processed.`
      })
    }

    // ✅ PRÜFUNG: Nur Wallee-Zahlungen können automatisch verarbeitet werden
    if (payment.payment_method !== 'wallee') {
      throw createError({
        statusCode: 400,
        statusMessage: `Automatic payment only possible for online payments (wallee). Current method: ${payment.payment_method}`
      })
    }

    // ✅ PRÜFUNG: Termin sollte noch nicht zu lange vorbei sein (max. 48h)
    if (appointment.end_time) {
      const appointmentEnd = new Date(appointment.end_time)
      const now = new Date()
      const hoursAfterAppointment = (now.getTime() - appointmentEnd.getTime()) / (1000 * 60 * 60)
      
      if (hoursAfterAppointment > 48) {
        throw createError({
          statusCode: 400,
          statusMessage: `Appointment ended ${Math.round(hoursAfterAppointment)}h ago. Automatic payment no longer possible.`
        })
      }
    }

    // Validierung
    if (!payment.payment_method_id || !payment.customer_payment_methods) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid payment method found'
      })
    }

    const paymentMethod = payment.customer_payment_methods as any

    if (!paymentMethod.is_active || !paymentMethod.wallee_token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment method not active or missing token'
      })
    }

    // ✅ WALLEE SDK KONFIGURATION
    const spaceId: number = parseInt(process.env.WALLEE_SPACE_ID || '82592')
    const userId: number = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    const apiSecret: string = process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
    
    const config = {
      space_id: spaceId,
      user_id: userId,
      api_secret: apiSecret
    }

    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
    
    // ✅ Erstelle Wallee Transaction mit gespeichertem Token
    const amount = payment.total_amount_rappen || 0
    const amountInCHF = amount / 100
    
    if (amount <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid amount'
      })
    }

    const merchantRef = `immediate-${payment.id}-${Date.now()}`
    const shortUniqueId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const userEmail = (payment.users as any)?.email || ''
    
    // Erstelle Line Item
    const lineItem: Wallee.model.LineItemCreate = new Wallee.model.LineItemCreate()
    lineItem.name = payment.appointments?.title || 'Automatische Abbuchung (sofort)'
    lineItem.uniqueId = shortUniqueId
    lineItem.sku = 'immediate-payment'
    lineItem.quantity = 1
    lineItem.amountIncludingTax = amountInCHF
    lineItem.type = Wallee.model.LineItemType.PRODUCT
    
    // Erstelle Transaction
    const transaction: Wallee.model.TransactionCreate = new Wallee.model.TransactionCreate()
    transaction.lineItems = [lineItem]
    transaction.autoConfirmationEnabled = true
    transaction.currency = 'CHF'
    transaction.customerId = paymentMethod.wallee_customer_id
    transaction.merchantReference = merchantRef
    transaction.language = 'de-CH'
    transaction.customerEmailAddress = userEmail
    transaction.tokenizationEnabled = false // Token bereits vorhanden

    console.log('⚡ Processing immediate payment:', {
      paymentId: payment.id,
      amount: amountInCHF,
      customerId: paymentMethod.wallee_customer_id,
      tokenPreview: paymentMethod.wallee_token.substring(0, 20) + '...'
    })

    // Erstelle Transaction
    const createResponse = await transactionService.create(spaceId, transaction)
    const walleeTransaction = createResponse.body

    console.log('✅ Wallee transaction created:', walleeTransaction.id)

    // ✅ Warte kurz und prüfe Status
    await new Promise(resolve => setTimeout(resolve, 2000))

    const statusResponse = await transactionService.read(spaceId, walleeTransaction.id as number)
    const finalTransaction = statusResponse.body

    console.log('📊 Final transaction state:', finalTransaction.state)

    // ✅ Update Payment basierend auf Ergebnis
    if (finalTransaction.state === Wallee.model.TransactionState.SUCCESSFUL || 
        finalTransaction.state === Wallee.model.TransactionState.FULFILL ||
        finalTransaction.state === Wallee.model.TransactionState.AUTHORIZED) {
      
      // Erfolgreich
      await supabase
        .from('payments')
        .update({
          automatic_payment_processed: true,
          automatic_payment_processed_at: toLocalTimeString(new Date()),
          payment_status: 'completed',
          paid_at: toLocalTimeString(new Date()),
          wallee_transaction_id: walleeTransaction.id?.toString(),
          metadata: {
            ...payment.metadata,
            immediate_payment_processed: {
              processed_at: toLocalTimeString(new Date()),
              wallee_state: finalTransaction.state,
              wallee_transaction_id: walleeTransaction.id?.toString()
            }
          },
          updated_at: toLocalTimeString(new Date())
        })
        .eq('id', payment.id)

      // Update appointment
      if (payment.appointment_id) {
        await supabase
          .from('appointments')
          .update({
            is_paid: true,
            payment_status: 'paid',
            updated_at: toLocalTimeString(new Date())
          })
          .eq('id', payment.appointment_id)
      }

      return {
        success: true,
        paymentId: payment.id,
        walleeTransactionId: walleeTransaction.id,
        state: finalTransaction.state,
        message: 'Payment processed immediately and successfully'
      }

    } else if (finalTransaction.state === Wallee.model.TransactionState.PENDING ||
               finalTransaction.state === Wallee.model.TransactionState.CONFIRMED ||
               finalTransaction.state === Wallee.model.TransactionState.PROCESSING) {
      
      // Noch in Verarbeitung - wird via Webhook aktualisiert
      await supabase
        .from('payments')
        .update({
          metadata: {
            ...payment.metadata,
            immediate_payment_processing: {
              wallee_transaction_id: walleeTransaction.id?.toString(),
              state: finalTransaction.state,
              started_at: toLocalTimeString(new Date())
            }
          },
          updated_at: toLocalTimeString(new Date())
        })
        .eq('id', payment.id)

      return {
        success: true,
        paymentId: payment.id,
        walleeTransactionId: walleeTransaction.id,
        state: finalTransaction.state,
        message: 'Payment initiated, processing...',
        processing: true
      }

    } else {
      // Fehlgeschlagen
      await supabase
        .from('payments')
        .update({
          payment_status: 'failed',
          metadata: {
            ...payment.metadata,
            immediate_payment_failed: {
              failed_at: toLocalTimeString(new Date()),
              reason: `Wallee state: ${finalTransaction.state}`,
              wallee_transaction_id: walleeTransaction.id?.toString()
            }
          },
          updated_at: toLocalTimeString(new Date())
        })
        .eq('id', payment.id)

      throw createError({
        statusCode: 400,
        statusMessage: `Payment failed: ${finalTransaction.state}`
      })
    }

  } catch (error: any) {
    console.error('❌ Error processing immediate payment:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to process immediate payment'
    })
  }
})

