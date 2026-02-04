// server/api/debug/webhook-logs.get.ts
// Debug endpoint to view webhook logs

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

interface WebhookLogsQuery {
  transactionId?: string
  paymentId?: string
  success?: boolean
  limit?: number
  offset?: number
}

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
      throw createError({ statusCode: 403, statusMessage: 'Only super_admin can access webhook logs' })
    }

    // Get query parameters
    const query = getQuery(event) as WebhookLogsQuery
    const limit = Math.min(query.limit || 50, 1000)
    const offset = query.offset || 0

    // Build query
    let q = supabase
      .from('webhook_logs')
      .select(`
        id,
        transaction_id,
        payment_id,
        wallee_state,
        payment_status_before,
        payment_status_after,
        success,
        error_message,
        processing_duration_ms,
        created_at,
        updated_at,
        raw_payload
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (query.transactionId) {
      q = q.eq('transaction_id', query.transactionId)
    }
    if (query.paymentId) {
      q = q.eq('payment_id', query.paymentId)
    }
    if (query.success !== undefined) {
      q = q.eq('success', query.success)
    }

    const { data: logs, error: logsError } = await q

    if (logsError) {
      throw logsError
    }

    // Get total count for pagination
    let countQuery = supabase.from('webhook_logs').select('*', { count: 'exact', head: true })

    if (query.transactionId) {
      countQuery = countQuery.eq('transaction_id', query.transactionId)
    }
    if (query.paymentId) {
      countQuery = countQuery.eq('payment_id', query.paymentId)
    }
    if (query.success !== undefined) {
      countQuery = countQuery.eq('success', query.success)
    }

    const { count } = await countQuery

    // Summary stats
    const { data: stats } = await supabase.rpc('get_webhook_logs_summary')

    logger.debug(`✅ Webhook logs retrieved: ${logs?.length || 0} records`)

    return {
      success: true,
      data: logs || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      },
      summary: stats || null
    }
  } catch (error: any) {
    logger.error('❌ Error fetching webhook logs:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch webhook logs'
    })
  }
})
