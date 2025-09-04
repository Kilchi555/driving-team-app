// server/api/payments/status.post.ts
// ✅ Payment Status API für Updates und Abfragen

import { getSupabase } from '~/utils/supabase'

interface PaymentStatusRequest {
  paymentId: string
  status?: string
  walleeTransactionId?: string
  walleeTransactionState?: string
}

interface PaymentStatusResponse {
  success: boolean
  payment?: any
  error?: string
  message?: string
}

export default defineEventHandler(async (event): Promise<PaymentStatusResponse> => {
  try {
    console.log('📊 Payment Status API called')
    
    const body = await readBody(event) as PaymentStatusRequest
    console.log('📨 Status request:', JSON.stringify(body, null, 2))
    
    if (!body.paymentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment ID is required'
      })
    }

    const supabase = getSupabase()
    
    // 1. Payment abrufen
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (
          id,
          title,
          start_time,
          payment_status,
          is_paid
        ),
        users!payments_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', body.paymentId)
      .single()

    if (findError || !payment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found'
      })
    }

    console.log('✅ Payment found:', payment.id)

    // 2. Status aktualisieren falls angegeben
    if (body.status) {
      const updateData: any = {
        payment_status: body.status,
        updated_at: new Date().toISOString()
      }

      // Wallee-spezifische Updates
      if (body.walleeTransactionId) {
        updateData.wallee_transaction_id = body.walleeTransactionId
      }
      
      if (body.walleeTransactionState) {
        updateData.wallee_transaction_state = body.walleeTransactionState
      }

      // Completion timestamp setzen
      if (body.status === 'completed') {
        updateData.paid_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', body.paymentId)

      if (updateError) throw updateError

      console.log('✅ Payment status updated to:', body.status)
    }

    // 3. Appointment Status aktualisieren falls Payment completed
    if (body.status === 'completed' && payment.appointment_id) {
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          payment_status: 'paid',
          is_paid: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.appointment_id)

      if (appointmentError) {
        console.warn('⚠️ Could not update appointment:', appointmentError)
      } else {
        console.log('✅ Appointment marked as paid')
      }
    }

    // 4. Status History erstellen (optional)
    if (body.status) {
      try {
        const { error: historyError } = await supabase
          .from('payment_status_history')
          .insert({
            payment_id: payment.id,
            status: body.status,
            wallee_transaction_state: body.walleeTransactionState,
            metadata: {
              updated_at: new Date().toISOString(),
              wallee_transaction_id: body.walleeTransactionId
            },
            created_at: new Date().toISOString()
          })

        if (historyError) {
          console.warn('⚠️ Could not create status history (table may not exist):', historyError)
        }
      } catch (historyErr) {
        console.warn('⚠️ Status history table may not exist yet:', historyErr)
      }
    }

    // 5. Aktualisierten Payment zurückgeben
    const { data: updatedPayment, error: refetchError } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (
          id,
          title,
          start_time,
          payment_status,
          is_paid
        ),
        users!payments_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', body.paymentId)
      .single()

    if (refetchError) throw refetchError

    return {
      success: true,
      payment: updatedPayment,
      message: body.status ? `Payment status updated to ${body.status}` : 'Payment status retrieved'
    }

  } catch (error: any) {
    console.error('❌ Payment status API error:', error)
    
    return {
      success: false,
      error: error.message || 'Payment status could not be updated'
    }
  }
})
