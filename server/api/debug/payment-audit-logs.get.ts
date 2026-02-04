// server/api/debug/payment-audit-logs.get.ts
// Debug endpoint: View payment audit trail

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // ✅ SECURITY: Only super_admin can access this
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

    // Check if user is super_admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (userData?.role !== 'super_admin') {
      throw createError({ statusCode: 403, statusMessage: 'Only super_admin can access audit logs' })
    }

    // Get query parameters
    const query = getQuery(event)
    const paymentId = query.paymentId as string
    const limit = Math.min(parseInt(query.limit as string) || 100, 1000)
    const offset = parseInt(query.offset as string) || 0

    if (!paymentId) {
      throw createError({ statusCode: 400, statusMessage: 'paymentId query parameter is required' })
    }

    logger.debug(`🔍 Fetching audit logs for payment: ${paymentId}`)

    // Fetch audit logs
    const { data: auditLogs, error: logsError } = await supabase
      .from('payment_audit_logs')
      .select(`
        id,
        operation,
        old_payment_status,
        new_payment_status,
        old_total_amount_rappen,
        new_total_amount_rappen,
        old_payment_method,
        new_payment_method,
        created_at,
        notes
      `)
      .eq('payment_id', paymentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (logsError) {
      throw logsError
    }

    // Get payment info
    const { data: payment } = await supabase
      .from('payments')
      .select('id, user_id, payment_status, total_amount_rappen, created_at, updated_at')
      .eq('id', paymentId)
      .single()

    // Get total count
    const { count } = await supabase
      .from('payment_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('payment_id', paymentId)

    logger.info(`✅ Found ${auditLogs?.length || 0} audit log entries for payment ${paymentId}`)

    return {
      success: true,
      payment: payment ? {
        id: payment.id,
        status: payment.payment_status,
        amount_chf: (payment.total_amount_rappen / 100).toFixed(2),
        created_at: payment.created_at,
        updated_at: payment.updated_at
      } : null,
      audit_logs: auditLogs || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      }
    }
  } catch (error: any) {
    logger.error('❌ Error fetching audit logs:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch audit logs'
    })
  }
})
