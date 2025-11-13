// server/api/payments/create.post.ts
// ✅ Einheitlicher Payment-API-Endpunkt für alle Payment-Operationen

import { getSupabase } from '~/utils/supabase'
import { routeRequiresFeatureFlag, validateFeatureAccess } from '~/utils/featureFlags'
import { toLocalTimeString } from '~/utils/dateUtils'

interface PaymentRequest {
  appointmentId?: string
  userId: string
  staffId?: string
  amount: number
  currency?: string
  customerEmail: string
  customerName?: string
  description?: string
  paymentMethod: 'wallee' | 'cash' | 'invoice'
  products?: Array<{
    id: string
    name: string
    quantity: number
    price_rappen: number
  }>
  discounts?: Array<{
    id: string
    name: string
    discount_amount_rappen: number
  }>
  successUrl?: string
  failedUrl?: string
}

interface PaymentResponse {
  success: boolean
  paymentId?: string
  transactionId?: string
  paymentUrl?: string
  error?: string
  message?: string
}

export default defineEventHandler(async (event): Promise<PaymentResponse> => {
  try {
    console.log('💳 Payment API called')
    
    // Check feature flag
    const url = event.node.req.url || ''
    const tenantIdHeader = getHeader(event, 'x-tenant-id') || (getQuery(event).tenantId as string | undefined)
    if (routeRequiresFeatureFlag(url)) {
      const tenantId = tenantIdHeader as string
      if (!tenantId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Tenant ID required for feature-protected route'
        })
      }
      
      const featureCheck = await validateFeatureAccess(tenantId, url)
      if (!featureCheck.enabled) {
        throw createError({
          statusCode: 403,
          statusMessage: `Feature access denied: ${featureCheck.message}`
        })
      }
    }
    
    const body = await readBody(event) as PaymentRequest
    console.log('📨 Payment request:', JSON.stringify(body, null, 2))
    
    // Validierung der erforderlichen Felder
    if (!body.userId || !body.amount || !body.customerEmail || !body.paymentMethod) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: userId, amount, customerEmail, paymentMethod'
      })
    }

    const supabase = getSupabase()
    
    // 1. Payment Record in DB erstellen
    const now = new Date().toISOString()
    
    const paymentData = {
      appointment_id: body.appointmentId,
      user_id: body.userId,
      staff_id: body.staffId,
      lesson_price_rappen: body.amount * 100, // CHF zu Rappen
      products_price_rappen: (body.products || []).reduce((sum, p) => sum + (p.price_rappen * p.quantity), 0),
      discount_amount_rappen: (body.discounts || []).reduce((sum, d) => sum + d.discount_amount_rappen, 0),
      subtotal_rappen: (body.amount * 100) + (body.products || []).reduce((sum, p) => sum + (p.price_rappen * p.quantity), 0),
      total_amount_rappen: (body.amount * 100) + (body.products || []).reduce((sum, p) => sum + (p.price_rappen * p.quantity), 0) - (body.discounts || []).reduce((sum, d) => sum + d.discount_amount_rappen, 0),
      payment_method: body.paymentMethod,
      payment_status: 'pending',
      description: body.description || 'Fahrlektion',
      metadata: {
        products: body.products,
        discounts: body.discounts,
        customer_name: body.customerName,
        customer_email: body.customerEmail
      },
      created_at: now,
      updated_at: now
    }

    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single()

    if (insertError) throw insertError

    console.log('✅ Payment record created:', payment.id)
    
    // 2. Je nach Zahlungsmethode verarbeiten
    switch (body.paymentMethod) {
      case 'wallee':
        return await processWalleePayment(payment, body)
      case 'cash':
        return await processCashPayment(payment, body)
      case 'invoice':
        return await processInvoicePayment(payment, body)
      default:
        throw new Error(`Unbekannte Zahlungsmethode: ${body.paymentMethod}`)
    }

  } catch (error: any) {
    console.error('❌ Payment creation failed:', error)
    
    return {
      success: false,
      error: error.message || 'Zahlung konnte nicht erstellt werden'
    }
  }
})

/**
 * Verarbeitet Wallee Online-Zahlung
 */
async function processWalleePayment(payment: any, request: PaymentRequest): Promise<PaymentResponse> {
  try {
    console.log('🔄 Processing Wallee payment...')

    const walleeData = {
      orderId: payment.id,
      amount: request.amount,
      currency: request.currency || 'CHF',
      customerEmail: request.customerEmail,
      customerName: request.customerName,
      description: request.description || 'Fahrlektion',
      successUrl: request.successUrl || `${getRequestURL(event).origin}/payment/success`,
      failedUrl: request.failedUrl || `${getRequestURL(event).origin}/payment/failed`,
      // Pseudonyme Customer-ID inputs
      userId: request.userId,
      tenantId: (tenantIdHeader as string) || payment.tenant_id || undefined
    }

    const response = await $fetch('/api/wallee/create-transaction', {
      method: 'POST',
      body: walleeData
    })

    if (response.success && response.paymentUrl) {
      // Update payment record with Wallee transaction ID
      await updatePaymentWithWalleeId(payment.id, response.transactionId)
      
      return {
        success: true,
        paymentId: payment.id,
        transactionId: response.transactionId,
        paymentUrl: response.paymentUrl,
        message: 'Wallee-Zahlung erfolgreich erstellt'
      }
    } else {
      throw new Error('Wallee-Zahlung konnte nicht erstellt werden')
    }

  } catch (error: any) {
    console.error('❌ Wallee payment failed:', error)
    
    // Update payment status to failed
    await updatePaymentStatus(payment.id, 'failed')
    
    return {
      success: false,
      error: `Wallee-Fehler: ${error.message}`,
      paymentId: payment.id
    }
  }
}

/**
 * Verarbeitet Barzahlung (nur Zahlungsmethode speichern, nicht als bezahlt markieren)
 */
async function processCashPayment(payment: any, request: PaymentRequest): Promise<PaymentResponse> {
  try {
    console.log('💰 Processing cash payment method...')

    // WICHTIG: Payment bleibt auf 'pending' - wird erst nach Bewertung bestätigt
    // Nur die Zahlungsmethode wird gespeichert
    
    // Appointment wird NICHT als bezahlt markiert
    // Das passiert erst nach der Bewertung, wenn der Fahrlehrer bestätigt

    return {
      success: true,
      paymentId: payment.id,
      message: 'Barzahlung als Zahlungsmethode gespeichert - Zahlung wird nach Bewertung bestätigt'
    }

  } catch (error: any) {
    console.error('❌ Cash payment method failed:', error)
    return {
      success: false,
      error: `Barzahlung-Methode-Fehler: ${error.message}`,
      paymentId: payment.id
    }
  }
}

/**
 * Verarbeitet Rechnungszahlung
 */
async function processInvoicePayment(payment: any, request: PaymentRequest): Promise<PaymentResponse> {
  try {
    console.log('📄 Processing invoice payment...')

    // Update payment status to pending (waiting for payment)
    await updatePaymentStatus(payment.id, 'pending')

    // Update appointment if exists
    if (payment.appointment_id) {
      await updateAppointmentPaymentStatus(payment.appointment_id, 'pending')
    }

    return {
      success: true,
      paymentId: payment.id,
      message: 'Rechnung erfolgreich erstellt'
    }

  } catch (error: any) {
    console.error('❌ Invoice payment failed:', error)
    return {
      success: false,
      error: `Rechnungs-Fehler: ${error.message}`,
      paymentId: payment.id
    }
  }
}

/**
 * Aktualisiert Payment mit Wallee Transaction ID
 */
async function updatePaymentWithWalleeId(paymentId: string, walleeTransactionId: string): Promise<void> {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('payments')
    .update({
      wallee_transaction_id: walleeTransactionId,
      updated_at: toLocalTimeString(new Date())
    })
    .eq('id', paymentId)

  if (error) throw error
  console.log('✅ Payment updated with Wallee transaction ID')
}

/**
 * Aktualisiert Payment Status
 */
async function updatePaymentStatus(paymentId: string, status: string): Promise<void> {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('payments')
    .update({
      payment_status: status,
      updated_at: toLocalTimeString(new Date())
    })
    .eq('id', paymentId)

  if (error) throw error
  console.log('✅ Payment status updated to:', status)
}

/**
 * Aktualisiert Appointment Payment Status
 */
async function updateAppointmentPaymentStatus(appointmentId: string, status: string): Promise<void> {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('appointments')
    .update({
      payment_status: status,
      is_paid: status === 'paid',
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)

  if (error) throw error
  console.log('✅ Appointment payment status updated to:', status)
}
