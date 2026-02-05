// server/api/debug/check-wallee-payments.get.ts
// Debug endpoint to find payments that are completed but have no wallee_transaction_id

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()

    // Find payments that are:
    // 1. payment_status = 'completed'
    // 2. payment_method = 'wallee'
    // 3. wallee_transaction_id is NULL or empty
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        user_id,
        tenant_id,
        payment_status,
        payment_method,
        wallee_transaction_id,
        total_amount_rappen,
        paid_at,
        created_at,
        updated_at,
        metadata
      `)
      .eq('payment_status', 'completed')
      .eq('payment_method', 'wallee')
      .or('wallee_transaction_id.is.null,wallee_transaction_id.eq.')

    if (error) {
      throw error
    }

    return {
      success: true,
      count: payments?.length || 0,
      payments: payments?.map(p => ({
        id: p.id,
        user_id: p.user_id,
        tenant_id: p.tenant_id,
        amount: (p.total_amount_rappen / 100).toFixed(2),
        paid_at: p.paid_at,
        created_at: p.created_at,
        wallee_transaction_id: p.wallee_transaction_id || 'MISSING',
        merchant_ref: p.metadata?.merchant_reference || 'NOT_IN_METADATA'
      }))
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})
