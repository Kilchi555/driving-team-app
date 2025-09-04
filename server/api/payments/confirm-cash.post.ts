// server/api/payments/confirm-cash.post.ts
// ✅ Bestätigt Cash-Zahlungen nach der Bewertung

import { getSupabase } from '~/utils/supabase'

interface ConfirmCashRequest {
  paymentId: string
  confirmedBy: string // staff_id
  notes?: string
}

interface ConfirmCashResponse {
  success: boolean
  payment?: any
  error?: string
  message?: string
}

export default defineEventHandler(async (event): Promise<ConfirmCashResponse> => {
  try {
    console.log('💰 Cash Payment Confirmation API called')
    
    const body = await readBody(event) as ConfirmCashRequest
    console.log('📨 Confirm cash request:', JSON.stringify(body, null, 2))
    
    if (!body.paymentId || !body.confirmedBy) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment ID and confirmedBy are required'
      })
    }

    const supabase = getSupabase()
    
    // 1. Payment abrufen und validieren
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
        )
      `)
      .eq('id', body.paymentId)
      .eq('payment_method', 'cash')
      .single()

    if (findError || !payment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Cash payment not found'
      })
    }

    if (payment.payment_status === 'completed') {
      return {
        success: false,
        error: 'Payment already completed'
      }
    }

    console.log('✅ Cash payment found:', payment.id)

    // 2. Payment Status auf 'completed' setzen
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        payment_status: 'completed',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          ...payment.metadata,
          cash_confirmed_by: body.confirmedBy,
          cash_confirmed_at: new Date().toISOString(),
          notes: body.notes
        }
      })
      .eq('id', payment.id)

    if (updateError) throw updateError

    console.log('✅ Payment status updated to completed')

    // 3. Appointment als bezahlt markieren
    if (payment.appointment_id) {
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
    try {
      const { error: historyError } = await supabase
        .from('payment_status_history')
        .insert({
          payment_id: payment.id,
          status: 'completed',
          metadata: {
            confirmed_by: body.confirmedBy,
            confirmed_at: new Date().toISOString(),
            notes: body.notes,
            action: 'cash_confirmation'
          },
          created_at: new Date().toISOString()
        })

      if (historyError) {
        console.warn('⚠️ Could not create status history (table may not exist):', historyError)
      }
    } catch (historyErr) {
      console.warn('⚠️ Status history table may not exist yet:', historyErr)
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
        )
      `)
      .eq('id', payment.id)
      .single()

    if (refetchError) throw refetchError

    return {
      success: true,
      payment: updatedPayment,
      message: 'Cash payment confirmed successfully'
    }

  } catch (error: any) {
    console.error('❌ Cash payment confirmation error:', error)
    
    return {
      success: false,
      error: error.message || 'Cash payment could not be confirmed'
    }
  }
})
