// POST /api/payments/release-processing-lock
// After a cancelled/failed Wallee redirect: sync with Wallee first, then act.
// Never blindly release to pending while an open/Confirmed transaction exists —
// that re-enabled "Jetzt bezahlen" and caused double charges in the past.
//
// Optional body:
//   paymentId?: string — limit to one payment
//   action?: 'sync' | 'abandon' — abandon tries void (AUTHORIZED only); Confirmed stays resume-only

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { logAudit } from '~/server/utils/audit'
import { abandonOrResumePayment, syncAndResolvePayment } from '~/server/utils/wallee-payment-sync'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userId = authUser.db_user_id
  const tenantId = authUser.tenant_id
  if (!userId || !tenantId) {
    throw createError({ statusCode: 404, statusMessage: 'User data not found' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  const paymentId = typeof body?.paymentId === 'string' ? body.paymentId : null
  const action = body?.action === 'abandon' ? 'abandon' : 'sync'

  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('payments')
    .select('id, tenant_id, payment_status, wallee_transaction_id, wallee_space_id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('payment_status', 'processing')

  if (paymentId) {
    query = query.eq('id', paymentId)
  }

  const { data: payments, error } = await query

  if (error) {
    logger.error('❌ release-processing-lock load failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load processing payments' })
  }

  const results: Array<{
    paymentId: string
    decision: string
    newStatus: string
    walleeState: string | null
    changed: boolean
    paymentUrl?: string | null
    message?: string
  }> = []

  let released = 0
  let completed = 0
  let keptOpen = 0
  let abandoned = 0

  for (const payment of payments || []) {
    try {
      const resolved = action === 'abandon'
        ? await abandonOrResumePayment(payment)
        : await syncAndResolvePayment(payment)

      results.push({
        paymentId: payment.id,
        decision: resolved.decision,
        newStatus: resolved.newStatus,
        walleeState: resolved.walleeState,
        changed: resolved.changed,
        paymentUrl: resolved.paymentUrl,
        message: (resolved as any).message
      })

      if (resolved.decision === 'abandoned') {
        if (resolved.changed) abandoned++
        if (resolved.changed) released++
      } else if (resolved.decision === 'release_pending' || resolved.decision === 'no_transaction') {
        if (resolved.changed) released++
      } else if (resolved.decision === 'mark_completed' || resolved.decision === 'mark_authorized') {
        if (resolved.changed) completed++
      } else {
        keptOpen++
      }
    } catch (err: any) {
      logger.warn('⚠️ syncAndResolvePayment failed for', payment.id, err?.message)
      keptOpen++
      results.push({
        paymentId: payment.id,
        decision: 'unknown',
        newStatus: payment.payment_status,
        walleeState: null,
        changed: false
      })
    }
  }

  if (released + completed + abandoned > 0) {
    await logAudit({
      action: 'payment_processing_lock_synced',
      user_id: userId,
      tenant_id: tenantId,
      resource_type: 'payment',
      resource_id: results[0]?.paymentId,
      status: 'success',
      details: {
        source: action === 'abandon' ? 'client_abandon_sync' : 'client_abort_sync',
        released,
        completed,
        abandoned,
        kept_open: keptOpen,
        results: results.map(r => ({
          paymentId: r.paymentId,
          decision: r.decision,
          newStatus: r.newStatus,
          walleeState: r.walleeState,
          changed: r.changed
        }))
      }
    }).catch(() => {})
  }

  logger.info('🔓 release-processing-lock sync complete', {
    userId,
    action,
    released,
    completed,
    abandoned,
    keptOpen,
    total: results.length
  })

  return {
    success: true,
    action,
    released,
    completed,
    abandoned,
    keptOpen,
    results
  }
})
