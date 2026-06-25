/**
 * GET /api/admin/wallee-check-payment-status?payment_id=...
 *
 * Super-admin only. Returns the current status of a payment record
 * plus the live transaction state directly from Wallee.
 * Used to verify test payments completed successfully.
 */

import { defineEventHandler, getQuery, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { Wallee } from 'wallee'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (authUser.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super-Admin role required' })
  }

  const { payment_id } = getQuery(event)
  if (!payment_id) throw createError({ statusCode: 400, statusMessage: 'payment_id erforderlich' })

  const supabase = getSupabaseAdmin()

  const { data: payment, error } = await supabase
    .from('payments')
    .select('id, payment_status, total_amount_rappen, wallee_transaction_id, wallee_space_id, tenant_id, metadata, created_at, updated_at')
    .eq('id', payment_id)
    .single()

  if (error || !payment) {
    throw createError({ statusCode: 404, statusMessage: 'Payment nicht gefunden' })
  }

  // Fetch live status from Wallee if we have transaction ID
  let walleeState: string | null = null
  let walleeDashboardUrl: string | null = null

  if (payment.wallee_transaction_id && payment.wallee_space_id) {
    walleeDashboardUrl = `https://app-wallee.com/s/${payment.wallee_space_id}/payment/transaction/view/${payment.wallee_transaction_id}`
    try {
      const walleeConfig = await getWalleeConfigForTenant(payment.tenant_id)
      const sdkConfig = getWalleeSDKConfig(walleeConfig.spaceId, walleeConfig.userId, walleeConfig.apiSecret)
      const txService = new Wallee.api.TransactionService(sdkConfig)
      const tx = await txService.read(payment.wallee_space_id, parseInt(payment.wallee_transaction_id))
      walleeState = (tx as any)?.body?.state ?? (tx as any)?.state ?? null
    } catch {
      // Non-fatal
    }
  }

  return {
    paymentId: payment.id,
    dbStatus: payment.payment_status,
    walleeState,
    walleeDashboardUrl,
    amount: (payment.total_amount_rappen / 100).toFixed(2),
    transactionId: payment.wallee_transaction_id,
    spaceId: payment.wallee_space_id,
    isTestPayment: !!(payment.metadata as any)?.super_admin_test,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at,
  }
})
