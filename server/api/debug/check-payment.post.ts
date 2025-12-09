// server/api/debug/check-payment.post.ts
// Debug endpoint to check payment status

import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabase()
    const { wallee_transaction_id, appointment_id, payment_id } = await readBody(event)

    logger.debug('🔍 Debug check:', { wallee_transaction_id, appointment_id, payment_id })

    let query = supabase.from('payments').select('id, wallee_transaction_id, payment_status, appointment_id')

    if (wallee_transaction_id) {
      query = query.eq('wallee_transaction_id', String(wallee_transaction_id))
    } else if (appointment_id) {
      query = query.eq('appointment_id', appointment_id)
    } else if (payment_id) {
      query = query.eq('id', payment_id)
    }

    const { data, error } = await query.limit(10)

    if (error) {
      return {
        success: false,
        error: error.message,
        details: error
      }
    }

    return {
      success: true,
      payments: data,
      count: data?.length || 0
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})

