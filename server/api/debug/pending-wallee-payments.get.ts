// server/api/debug/pending-wallee-payments.get.ts
// Debug endpoint: Find payments with wallee_transaction_id that are still pending

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // ✅ SECURITY: Only super_admin can access this. Bearer header with
    // HTTP-only-cookie fallback + token refresh, instead of a raw
    // Bearer-only check that would 401 whenever the client's access token
    // had just expired.
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    if (authUser.role !== 'super_admin') {
      throw createError({ statusCode: 403, statusMessage: 'Only super_admin can access this' })
    }

    logger.debug('🔍 Finding pending Wallee payments...')

    // Find payments that are:
    // 1. wallee_transaction_id is NOT NULL
    // 2. payment_status = 'pending'
    // 3. payment_method = 'wallee'
    // 4. created more than 5 minutes ago (not just processing)
    const { data: pendingPayments, error: findError } = await supabase
      .from('payments')
      .select(`
        id,
        user_id,
        tenant_id,
        payment_status,
        wallee_transaction_id,
        payment_method,
        total_amount_rappen,
        description,
        created_at,
        updated_at,
        paid_at
      `)
      .eq('payment_status', 'pending')
      .eq('payment_method', 'wallee')
      .not('wallee_transaction_id', 'is', null)
      .order('created_at', { ascending: false })

    if (findError) {
      throw findError
    }

    logger.debug(`⚠️ Found ${pendingPayments?.length || 0} pending Wallee payments with transaction IDs`)

    // For each pending payment, check if there's a webhook log
    const paymentsWithWebhookStatus = await Promise.all(
      (pendingPayments || []).map(async (payment) => {
        const { data: webhookLogs } = await supabase
          .from('webhook_logs')
          .select('id, success, error_message, created_at, wallee_state')
          .eq('transaction_id', payment.wallee_transaction_id)
          .order('created_at', { ascending: false })
          .limit(1)

        return {
          ...payment,
          webhook_received: webhookLogs && webhookLogs.length > 0,
          webhook_log: webhookLogs?.[0] || null,
          webhook_success: webhookLogs?.[0]?.success || false,
          minutes_pending: Math.floor((Date.now() - new Date(payment.updated_at).getTime()) / 60000)
        }
      })
    )

    // Group by status
    const summary = {
      total_pending: paymentsWithWebhookStatus.length,
      webhook_received: paymentsWithWebhookStatus.filter(p => p.webhook_received).length,
      webhook_success: paymentsWithWebhookStatus.filter(p => p.webhook_success).length,
      webhook_failed: paymentsWithWebhookStatus.filter(p => p.webhook_received && !p.webhook_success).length,
      no_webhook: paymentsWithWebhookStatus.filter(p => !p.webhook_received).length,
      total_amount_chf: (paymentsWithWebhookStatus.reduce((sum, p) => sum + p.total_amount_rappen, 0) / 100).toFixed(2)
    }

    logger.info('✅ Payment analysis:', summary)

    return {
      success: true,
      summary,
      payments: paymentsWithWebhookStatus.map(p => ({
        id: p.id,
        user_id: p.user_id,
        amount_chf: (p.total_amount_rappen / 100).toFixed(2),
        description: p.description,
        wallee_transaction_id: p.wallee_transaction_id,
        created_at: p.created_at,
        updated_at: p.updated_at,
        minutes_pending: p.minutes_pending,
        webhook_received: p.webhook_received,
        webhook_state: p.webhook_log?.wallee_state,
        webhook_success: p.webhook_success,
        webhook_error: p.webhook_log?.error_message,
        webhook_logged_at: p.webhook_log?.created_at
      }))
    }
  } catch (error: any) {
    logger.error('❌ Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch pending payments'
    })
  }
})
