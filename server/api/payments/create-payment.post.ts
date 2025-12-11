// server/api/payments/create-payment.post.ts
import { defineEventHandler, readBody } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { paymentData } = body

    if (!paymentData) {
      throw new Error('Payment data is required')
    }

    logger.debug('💳 Server: Creating payment with data:', {
      appointment_id: paymentData.appointment_id,
      payment_method: paymentData.payment_method,
      payment_status: paymentData.payment_status,
      company_billing_address_id: paymentData.company_billing_address_id,
      company_billing_address_id_type: typeof paymentData.company_billing_address_id,
      company_billing_address_id_is_null: paymentData.company_billing_address_id === null,
      company_billing_address_id_is_undefined: paymentData.company_billing_address_id === undefined,
      total_amount_rappen: paymentData.total_amount_rappen
    })

    const supabase = getSupabaseAdmin()

    // ✅ CRITICAL: Ensure company_billing_address_id is truly null
    const cleanPaymentData = {
      ...paymentData
    }
    if (!cleanPaymentData.company_billing_address_id || 
        (typeof cleanPaymentData.company_billing_address_id === 'string' && 
         cleanPaymentData.company_billing_address_id.trim() === '')) {
      cleanPaymentData.company_billing_address_id = null
    }

    logger.debug('💳 Server: Cleaned payment data:', {
      company_billing_address_id: cleanPaymentData.company_billing_address_id,
      company_billing_address_id_type: typeof cleanPaymentData.company_billing_address_id
    })

    // ✅ Use admin client to bypass RLS - allows null company_billing_address_id
    const { data: payment, error } = await supabase
      .from('payments')
      .insert(cleanPaymentData)
      .select()
      .single()

    if (error) {
      logger.error('❌ Error creating payment:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        paymentData: cleanPaymentData
      })
      throw new Error(`Failed to create payment: ${error.message}`)
    }

    logger.debug('✅ Payment created successfully:', payment.id)

    return {
      success: true,
      payment
    }
  } catch (err: any) {
    logger.error('❌ Error in create-payment endpoint:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to create payment'
    })
  }
})

