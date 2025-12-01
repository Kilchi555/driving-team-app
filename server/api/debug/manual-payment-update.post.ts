// server/api/debug/manual-payment-update.post.ts
// Manual endpoint to update payment status from Wallee webhook data

import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabase()
    const { 
      wallee_transaction_id, 
      appointment_id, 
      payment_id,
      payment_status,
      action 
    } = await readBody(event)

    console.log('🔧 Manual payment update:', { 
      wallee_transaction_id, 
      appointment_id, 
      payment_id,
      payment_status,
      action 
    })

    if (!payment_id && !appointment_id && !wallee_transaction_id) {
      return {
        success: false,
        error: 'Need at least one of: payment_id, appointment_id, wallee_transaction_id'
      }
    }

    // Step 1: Find the payment
    let query = supabase.from('payments').select('id, wallee_transaction_id, payment_status, appointment_id, user_id')

    if (payment_id) {
      query = query.eq('id', payment_id)
    } else if (appointment_id) {
      query = query.eq('appointment_id', appointment_id)
    } else if (wallee_transaction_id) {
      query = query.eq('wallee_transaction_id', String(wallee_transaction_id))
    }

    const { data: payments, error: findError } = await query.limit(1)

    if (findError || !payments || payments.length === 0) {
      return {
        success: false,
        error: 'Payment not found',
        details: findError
      }
    }

    const payment = payments[0]
    console.log('✅ Found payment:', payment)

    // Step 2: Perform action
    if (action === 'update_status' && payment_status) {
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payment_status,
          paid_at: payment_status === 'completed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updateError) {
        console.error('❌ Update failed:', updateError)
        return {
          success: false,
          error: updateError.message,
          details: updateError
        }
      }

      console.log(`✅ Payment updated to ${payment_status}`)

      // Also update appointment if completed
      if (payment_status === 'completed' && payment.appointment_id) {
        await supabase
          .from('appointments')
          .update({
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.appointment_id)
      }
    } else if (action === 'update_wallee_id' && wallee_transaction_id) {
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          wallee_transaction_id: String(wallee_transaction_id),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updateError) {
        console.error('❌ Update failed:', updateError)
        return {
          success: false,
          error: updateError.message,
          details: updateError
        }
      }

      console.log(`✅ Wallee transaction ID updated to ${wallee_transaction_id}`)
    }

    // Step 3: Return updated payment
    const { data: updated } = await supabase
      .from('payments')
      .select('id, wallee_transaction_id, payment_status, appointment_id')
      .eq('id', payment.id)
      .single()

    return {
      success: true,
      message: `Payment updated successfully`,
      payment: updated
    }
  } catch (error: any) {
    console.error('❌ Error:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

