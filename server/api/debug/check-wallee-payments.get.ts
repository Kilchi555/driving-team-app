// server/api/debug/check-wallee-payments.get.ts
// Debug endpoint to find payments that are completed but have no wallee_transaction_id

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  try {
    // ✅ SECURITY: Only super_admin can access this debug endpoint
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const supabase = getSupabaseAdmin()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (userData?.role !== 'super_admin') {
      throw createError({ statusCode: 403, statusMessage: 'Only super_admin can access this endpoint' })
    }

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
    if (error.statusCode) throw error
    return {
      success: false,
      error: error.message
    }
  }
})
